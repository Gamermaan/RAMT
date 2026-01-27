"""
APK Signer
Signs Android APK files using Java keytool and apksigner
Requires Android SDK build-tools
"""

import os
import subprocess
import argparse
from pathlib import Path


def check_dependencies():
    """Check if required tools are available"""
    try:
        subprocess.run(["keytool", "-help"], capture_output=True, check=True)
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("[!] Error: keytool not found. Install Java JDK.")
        return False
    
    # Check for apksigner (part of Android SDK build-tools)
    if not os.environ.get('ANDROID_HOME'):
        print("[!] Warning: ANDROID_HOME not set. apksigner may not be found.")
        print("[!] Install Android SDK and set ANDROID_HOME environment variable.")
    
    return True


def generate_keystore(keystore_path, alias, password, validity_days=10000):
    """Generate a new keystore for APK signing"""
    print(f"[*] Generating keystore: {keystore_path}")
    
    cmd = [
        "keytool",
        "-genkeypair",
        "-v",
        "-keystore", keystore_path,
        "-alias", alias,
        "-keyalg", "RSA",
        "-keysize", "2048",
        "-validity", str(validity_days),
        "-storepass", password,
        "-keypass", password,
        "-dname", "CN=RAMP, OU=Security, O=RAMP, L=SF, ST=CA, C=US"
    ]
    
    try:
        subprocess.run(cmd, check=True)
        print(f"[+] Keystore generated successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"[!] Failed to generate keystore: {e}")
        return False


def sign_apk(apk_path, keystore_path, alias, password, output_path=None):
    """Sign an APK file"""
    if not os.path.exists(apk_path):
        print(f"[!] APK file not found: {apk_path}")
        return False
    
    if not os.path.exists(keystore_path):
        print(f"[!] Keystore not found: {keystore_path}")
        return False
    
    # Determine output path
    if not output_path:
        apk_name = Path(apk_path).stem
        output_path = f"{apk_name}-signed.apk"
    
    print(f"[*] Signing APK: {apk_path}")
    
    # Find apksigner
    apksigner = find_apksigner()
    if not apksigner:
        print("[!] apksigner not found. Install Android SDK build-tools.")
        return False
    
    # Sign APK
    cmd = [
        apksigner,
        "sign",
        "--ks", keystore_path,
        "--ks-key-alias", alias,
        "--ks-pass", f"pass:{password}",
        "--key-pass", f"pass:{password}",
        "--out", output_path,
        apk_path
    ]
    
    try:
        subprocess.run(cmd, check=True)
        print(f"[+] APK signed successfully: {output_path}")
        
        # Verify signature
        verify_apk(output_path, apksigner)
        
        return True
    except subprocess.CalledProcessError as e:
        print(f"[!] Failed to sign APK: {e}")
        return False


def verify_apk(apk_path, apksigner=None):
    """Verify APK signature"""
    if not apksigner:
        apksigner = find_apksigner()
    
    if not apksigner:
        return False
    
    print(f"[*] Verifying APK signature...")
    
    cmd = [apksigner, "verify", "--verbose", apk_path]
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        print(f"[+] APK signature verified successfully")
        print(result.stdout)
        return True
    except subprocess.CalledProcessError as e:
        print(f"[!] APK verification failed: {e}")
        print(e.stderr)
        return False


def find_apksigner():
    """Find apksigner executable"""
    # Check if apksigner is in PATH
    try:
        subprocess.run(["apksigner", "--version"], capture_output=True, check=True)
        return "apksigner"
    except (subprocess.CalledProcessError, FileNotFoundError):
        pass
    
    # Check in Android SDK
    android_home = os.environ.get('ANDROID_HOME')
    if android_home:
        # Search in build-tools
        build_tools_dir = os.path.join(android_home, "build-tools")
        if os.path.exists(build_tools_dir):
            # Get latest version
            versions = sorted(os.listdir(build_tools_dir), reverse=True)
            for version in versions:
                apksigner_path = os.path.join(build_tools_dir, version, "apksigner")
                if os.path.exists(apksigner_path):
                    return apksigner_path
                
                # Windows
                apksigner_bat = apksigner_path + ".bat"
                if os.path.exists(apksigner_bat):
                    return apksigner_bat
    
    return None


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Sign Android APK files")
    parser.add_argument("apk", help="Path to APK file to sign")
    parser.add_argument("--keystore", default="ramp.keystore", help="Keystore path")
    parser.add_argument("--alias", default="rampkey", help="Key alias")
    parser.add_argument("--password", default="ramppass123", help="Keystore password")
    parser.add_argument("--output", help="Output APK path")
    parser.add_argument("--generate-keystore", action="store_true", 
                       help="Generate new keystore")
    
    args = parser.parse_args()
    
    print("=" * 60)
    print("RAMP APK Signer")
    print("=" * 60)
    
    if not check_dependencies():
        exit(1)
    
    # Generate keystore if requested
    if args.generate_keystore:
        if not generate_keystore(args.keystore, args.alias, args.password):
            exit(1)
    
    # Sign APK
    if not sign_apk(args.apk, args.keystore, args.alias, args.password, args.output):
        exit(1)
    
    print("\n[✓] APK signing complete!")
