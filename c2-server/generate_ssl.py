#!/usr/bin/env python3
"""
SSL Certificate Generator for RAMP C2 Server
Generates self-signed SSL certificates for local development
"""

import os
from datetime import datetime, timedelta
from cryptography import x509
from cryptography.x509.oid import NameOID
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization

def generate_self_signed_cert(cert_path='certs/localhost.crt', key_path='certs/localhost.key'):
    """Generate a self-signed SSL certificate"""
    
    # Create certs directory if it doesn't exist
    os.makedirs('certs', exist_ok=True)
    
    print("[*] Generating RSA private key...")
    # Generate private key
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=4096,
    )
    
    print("[*] Creating certificate...")
    # Create certificate
    subject = issuer = x509.Name([
        x509.NameAttribute(NameOID.COUNTRY_NAME, u"US"),
        x509.NameAttribute(NameOID.STATE_OR_PROVINCE_NAME, u"Local"),
        x509.NameAttribute(NameOID.LOCALITY_NAME, u"localhost"),
        x509.NameAttribute(NameOID.ORGANIZATION_NAME, u"RAMP C2"),
        x509.NameAttribute(NameOID.COMMON_NAME, u"localhost"),
    ])
    
    cert = x509.CertificateBuilder().subject_name(
        subject
    ).issuer_name(
        issuer
    ).public_key(
        private_key.public_key()
    ).serial_number(
        x509.random_serial_number()
    ).not_valid_before(
        datetime.utcnow()
    ).not_valid_after(
        datetime.utcnow() + timedelta(days=365)
    ).add_extension(
        x509.SubjectAlternativeName([
            x509.DNSName(u"localhost"),
            x509.DNSName(u"127.0.0.1"),
            x509.IPAddress(__import__('ipaddress').IPv4Address('127.0.0.1')),
        ]),
        critical=False,
    ).sign(private_key, hashes.SHA256())
    
    # Write private key to file
    print(f"[*] Writing private key to {key_path}...")
    with open(key_path, "wb") as f:
        f.write(private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.TraditionalOpenSSL,
            encryption_algorithm=serialization.NoEncryption()
        ))
    
    # Write certificate to file
    print(f"[*] Writing certificate to {cert_path}...")
    with open(cert_path, "wb") as f:
        f.write(cert.public_bytes(serialization.Encoding.PEM))
    
    print(f"\n[✓] SSL certificates generated successfully!")
    print(f"[✓] Certificate: {os.path.abspath(cert_path)}")
    print(f"[✓] Private Key: {os.path.abspath(key_path)}")
    print(f"[✓] Valid for: 365 days")
    print(f"\n[*] You can now start the C2 server with HTTPS support!")

if __name__ == '__main__':
    try:
        generate_self_signed_cert()
    except Exception as e:
        print(f"[!] Error generating certificates: {e}")
        exit(1)
