"""
SSL Certificate Generator
Generates self-signed SSL certificates for C2 server
"""

import os
import ipaddress
from datetime import datetime, timedelta, timezone
from cryptography import x509
from cryptography.x509.oid import NameOID
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization


def generate_self_signed_cert(
    common_name="RAMP C2 Server",
    country="US",
    state="California",
    locality="San Francisco",
    organization="RAMP",
    validity_days=365,
    output_dir="certs"
):
    """
    Generate a self-signed SSL certificate
    
    Args:
        common_name: Certificate common name
        country: Two-letter country code
        state: State or province
        locality: City
        organization: Organization name
        validity_days: Certificate validity period in days
        output_dir: Output directory for certificate files
    """
    
    # Create output directory
    os.makedirs(output_dir, exist_ok=True)
    
    print(f"[*] Generating SSL certificate...")
    print(f"[*] Common Name: {common_name}")
    print(f"[*] Validity: {validity_days} days")
    
    # Generate private key
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=4096,
    )
    
    # Build certificate subject
    subject = issuer = x509.Name([
        x509.NameAttribute(NameOID.COUNTRY_NAME, country),
        x509.NameAttribute(NameOID.STATE_OR_PROVINCE_NAME, state),
        x509.NameAttribute(NameOID.LOCALITY_NAME, locality),
        x509.NameAttribute(NameOID.ORGANIZATION_NAME, organization),
        x509.NameAttribute(NameOID.COMMON_NAME, common_name),
    ])
    
    # Build certificate
    cert = x509.CertificateBuilder().subject_name(
        subject
    ).issuer_name(
        issuer
    ).public_key(
        private_key.public_key()
    ).serial_number(
        x509.random_serial_number()
    ).not_valid_before(
        datetime.now(timezone.utc)
    ).not_valid_after(
        datetime.now(timezone.utc) + timedelta(days=validity_days)
    ).add_extension(
        x509.SubjectAlternativeName([
            x509.DNSName("localhost"),
            x509.DNSName("*.local"),
            x509.IPAddress(ipaddress.IPv4Address("127.0.0.1")),
        ]),
        critical=False,
    ).sign(private_key, hashes.SHA256())
    
    # Write private key
    key_path = os.path.join(output_dir, "server.key")
    with open(key_path, "wb") as f:
        f.write(private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.TraditionalOpenSSL,
            encryption_algorithm=serialization.NoEncryption()
        ))
    print(f"[+] Private key saved: {key_path}")
    
    # Write certificate
    cert_path = os.path.join(output_dir, "server.crt")
    with open(cert_path, "wb") as f:
        f.write(cert.public_bytes(serialization.Encoding.PEM))
    print(f"[+] Certificate saved: {cert_path}")
    
    # Calculate and display certificate fingerprint
    fingerprint = cert.fingerprint(hashes.SHA256()).hex()
    print(f"\n[*] Certificate SHA256 Fingerprint:")
    print(f"    {fingerprint}")
    print(f"\n[!] Use this fingerprint for certificate pinning in agent config")
    
    return cert_path, key_path, fingerprint


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Generate self-signed SSL certificates")
    parser.add_argument("--cn", default="RAMP C2 Server", help="Common Name")
    parser.add_argument("--country", default="US", help="Country code")
    parser.add_argument("--state", default="California", help="State/Province")
    parser.add_argument("--locality", default="San Francisco", help="City")
    parser.add_argument("--org", default="RAMP", help="Organization")
    parser.add_argument("--days", type=int, default=365, help="Validity period (days)")
    parser.add_argument("--output", default="../c2-server/certs", help="Output directory")
    
    args = parser.parse_args()
    
    print("=" * 60)
    print("RAMP SSL Certificate Generator")
    print("=" * 60)
    
    generate_self_signed_cert(
        common_name=args.cn,
        country=args.country,
        state=args.state,
        locality=args.locality,
        organization=args.org,
        validity_days=args.days,
        output_dir=args.output
    )
    
    print("\n[✓] Certificate generation complete!")
