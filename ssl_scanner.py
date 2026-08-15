#!/usr/bin/env python3
"""
SSL/TLS Enterprise Vulnerability Scanner (ssl_scanner.py)
=========================================================
A production-quality, modular Python 3 SSL/TLS configuration and vulnerability scanner.
Strictly evidence-based: Never marks a vulnerability as CONFIRMED without direct technical proof.

Usage:
    python3 ssl_scanner.py <host> [port] [--json] [--timeout SECONDS] [--verbose]

Examples:
    python3 ssl_scanner.py example.com
    python3 ssl_scanner.py example.com 443
    python3 ssl_scanner.py example.com --json
    python3 ssl_scanner.py example.com 8443 --timeout 10
"""

import sys
import os
import re
import json
import socket
import ssl
import struct
import logging
import argparse
import subprocess
import warnings

warnings.filterwarnings("ignore", category=DeprecationWarning)
from datetime import datetime, timezone
from urllib.parse import urlparse
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict, field

# Optional high-fidelity certificate parsing via cryptography package
try:
    from cryptography import x509
    from cryptography.hazmat.backends import default_backend
    from cryptography.hazmat.primitives import hashes
    from cryptography.hazmat.primitives.asymmetric import rsa, dsa, ec, ed25519, ed448
    CRYPTOGRAPHY_AVAILABLE = True
except ImportError:
    CRYPTOGRAPHY_AVAILABLE = False

# Optional HTTP testing via urllib.request (standard library)
import urllib.request
import urllib.error
import http.client


# ── LOGGING SETUP ─────────────────────────────────────────────────────────────
logger = logging.getLogger("ssl_scanner")


# ── DATA MODELS ───────────────────────────────────────────────────────────────
@dataclass
class Finding:
    title: str
    category: str       # TLS_PROTOCOL | CERTIFICATE | CIPHER | KEY_EXCHANGE | HTTP_SECURITY
    severity: str       # CRITICAL | HIGH | MEDIUM | LOW | INFO
    status: str         # CONFIRMED | POTENTIALLY_VULNERABLE | NOT_VULNERABLE | NOT_TESTED
    host: str
    port: int
    evidence: str
    technical_details: str
    remediation: str
    references: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class CertificateInfo:
    subject: str = ""
    common_name: str = ""
    issuer: str = ""
    serial_number: str = ""
    valid_from: Optional[str] = None
    valid_until: Optional[str] = None
    san_entries: List[str] = field(default_factory=list)
    public_key_algorithm: str = "Unknown"
    public_key_size: int = 0
    signature_algorithm: str = "Unknown"
    is_trusted: bool = False
    is_expired: bool = False
    is_not_yet_valid: bool = False
    is_self_signed: bool = False
    hostname_mismatch: bool = False
    chain: List[Dict[str, Any]] = field(default_factory=list)


@dataclass
class ProtocolSupport:
    sslv2: bool = False
    sslv3: bool = False
    tls1_0: bool = False
    tls1_1: bool = False
    tls1_2: bool = False
    tls1_3: bool = False


@dataclass
class TLSFeatures:
    secure_renegotiation: bool = False
    tls_compression: bool = False
    session_resumption: bool = False
    ocsp_stapling: bool = False
    alpn_protocols: List[str] = field(default_factory=list)
    sni_supported: bool = True
    early_data_0rtt: bool = False


@dataclass
class HTTPSSecurityInfo:
    http_port_open: bool = False
    http_redirects_to_https: bool = False
    redirect_target: str = ""
    hsts_header_present: bool = False
    hsts_max_age: Optional[int] = None
    hsts_include_subdomains: bool = False
    hsts_preload: bool = False
    server_header: str = ""


@dataclass
class ScanResult:
    target_host: str
    target_ip: str
    target_port: int
    scan_timestamp: str
    connection_successful: bool
    certificate: CertificateInfo
    protocols: ProtocolSupport
    supported_ciphers: List[Dict[str, Any]]
    weak_ciphers_detected: List[Dict[str, Any]]
    key_exchange_details: Dict[str, Any]
    tls_features: TLSFeatures
    vulnerabilities: List[Finding]
    https_security: HTTPSSecurityInfo
    scan_duration_seconds: float
    grade: str = "A"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "target_host": self.target_host,
            "target_ip": self.target_ip,
            "target_port": self.target_port,
            "scan_timestamp": self.scan_timestamp,
            "connection_successful": self.connection_successful,
            "grade": self.grade,
            "scan_duration_seconds": self.scan_duration_seconds,
            "certificate": asdict(self.certificate),
            "protocols": asdict(self.protocols),
            "supported_ciphers": self.supported_ciphers,
            "weak_ciphers_detected": self.weak_ciphers_detected,
            "key_exchange_details": self.key_exchange_details,
            "tls_features": asdict(self.tls_features),
            "https_security": asdict(self.https_security),
            "findings_summary": {
                "total": len(self.vulnerabilities),
                "by_severity": {
                    "CRITICAL": sum(1 for v in self.vulnerabilities if v.severity == "CRITICAL"),
                    "HIGH": sum(1 for v in self.vulnerabilities if v.severity == "HIGH"),
                    "MEDIUM": sum(1 for v in self.vulnerabilities if v.severity == "MEDIUM"),
                    "LOW": sum(1 for v in self.vulnerabilities if v.severity == "LOW"),
                    "INFO": sum(1 for v in self.vulnerabilities if v.severity == "INFO"),
                },
                "by_status": {
                    "CONFIRMED": sum(1 for v in self.vulnerabilities if v.status == "CONFIRMED"),
                    "POTENTIALLY_VULNERABLE": sum(1 for v in self.vulnerabilities if v.status == "POTENTIALLY_VULNERABLE"),
                    "NOT_VULNERABLE": sum(1 for v in self.vulnerabilities if v.status == "NOT_VULNERABLE"),
                    "NOT_TESTED": sum(1 for v in self.vulnerabilities if v.status == "NOT_TESTED"),
                }
            },
            "findings": [v.to_dict() for v in self.vulnerabilities],
        }


# ── MODULE 1: TargetResolver ──────────────────────────────────────────────────
class TargetResolver:
    """Validates, parses, and resolves target hostnames and ports."""

    @staticmethod
    def parse_target(target_input: str, default_port: int = 443) -> Tuple[str, int]:
        clean = target_input.strip()
        if clean.startswith("http://") or clean.startswith("https://"):
            parsed = urlparse(clean)
            host = parsed.hostname or ""
            port = parsed.port or (80 if parsed.scheme == "http" else default_port)
            return host, port

        if ":" in clean and not clean.endswith("]"):
            parts = clean.split(":")
            if len(parts) == 2 and parts[1].isdigit():
                return parts[0], int(parts[1])

        return clean, default_port

    @staticmethod
    def resolve_ip(hostname: str) -> str:
        try:
            addrinfo = socket.getaddrinfo(hostname, None, socket.AF_INET, socket.SOCK_STREAM)
            if addrinfo:
                return addrinfo[0][4][0]
        except Exception:
            try:
                addrinfo = socket.getaddrinfo(hostname, None, socket.AF_UNSPEC, socket.SOCK_STREAM)
                if addrinfo:
                    return addrinfo[0][4][0]
            except Exception as e:
                raise ConnectionError(f"DNS Resolution failed for host '{hostname}': {e}")
        raise ConnectionError(f"Unable to resolve host '{hostname}' to an IP address.")


# ── MODULE 2: TLSConnector ────────────────────────────────────────────────────
class TLSConnector:
    """Manages resilient TCP connections, raw sockets, and TLS handshakes with SNI."""

    def __init__(self, host: str, port: int = 443, timeout: float = 5.0):
        self.host = host
        self.port = port
        self.timeout = timeout

    def create_tcp_socket(self) -> socket.socket:
        """Create a TCP socket with explicit IPv4 fallback to avoid IPv6 unreachable errors."""
        try:
            return socket.create_connection((self.host, self.port), timeout=self.timeout)
        except (OSError, socket.error):
            addr_info = socket.getaddrinfo(self.host, self.port, socket.AF_INET, socket.SOCK_STREAM)
            if addr_info:
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(self.timeout)
                sock.connect(addr_info[0][4])
                return sock
            raise

    def perform_tls_handshake(
        self,
        min_version: Optional[ssl.TLSVersion] = None,
        max_version: Optional[ssl.TLSVersion] = None,
        ciphers: Optional[str] = None,
        verify: bool = False,
        alpn_protocols: Optional[List[str]] = None
    ) -> Tuple[bool, Optional[ssl.SSLSocket], Optional[str]]:
        """
        Attempts a TLS handshake with specified constraints.
        Returns (success, ssl_socket, error_message).
        """
        try:
            ctx = ssl.create_default_context()
            if not verify:
                ctx.check_hostname = False
                ctx.verify_mode = ssl.CERT_NONE

            if min_version is not None and hasattr(ctx, "minimum_version"):
                ctx.minimum_version = min_version
            if max_version is not None and hasattr(ctx, "maximum_version"):
                ctx.maximum_version = max_version
            if ciphers is not None:
                try:
                    ctx.set_ciphers(ciphers)
                except ssl.SSLError:
                    return False, None, "Cipher string not supported by local SSL library"
            if alpn_protocols and hasattr(ctx, "set_alpn_protocols"):
                ctx.set_alpn_protocols(alpn_protocols)

            sock = self.create_tcp_socket()
            tls_sock = ctx.wrap_socket(sock, server_hostname=self.host)
            return True, tls_sock, None
        except Exception as e:
            return False, None, str(e)


# ── MODULE 3: CertificateAnalyzer ─────────────────────────────────────────────
class CertificateAnalyzer:
    """Analyzes peer certificates, public keys, signature algorithms, validity, and trust."""

    def __init__(self, connector: TLSConnector, findings_engine: "FindingEngine"):
        self.connector = connector
        self.findings_engine = findings_engine

    def analyze(self) -> CertificateInfo:
        cert_info = CertificateInfo()
        der_bytes = None
        cert_dict = None

        # 1. First probe with full CA trust verification
        trusted, tls_sock, err = self.connector.perform_tls_handshake(verify=True)
        if trusted and tls_sock:
            cert_info.is_trusted = True
            try:
                cert_dict = tls_sock.getpeercert(binary_form=False)
                der_bytes = tls_sock.getpeercert(binary_form=True)
            finally:
                tls_sock.close()
        else:
            cert_info.is_trusted = False
            # Fallback to handshake without verification to grab raw certificate
            success, tls_sock_raw, _ = self.connector.perform_tls_handshake(verify=False)
            if success and tls_sock_raw:
                try:
                    der_bytes = tls_sock_raw.getpeercert(binary_form=True)
                finally:
                    tls_sock_raw.close()

        if not der_bytes:
            self.findings_engine.add(Finding(
                title="Failed to Retrieve Certificate",
                category="CERTIFICATE",
                severity="HIGH",
                status="CONFIRMED",
                host=self.connector.host,
                port=self.connector.port,
                evidence="No certificate returned during TLS handshake",
                technical_details="Target refused or failed to present a certificate.",
                remediation="Ensure the TLS server is configured with a valid X.509 certificate.",
                references=["https://datatracker.ietf.org/doc/html/rfc5246#section-7.4.2"]
            ))
            return cert_info

        # 2. Parse using cryptography if available
        if CRYPTOGRAPHY_AVAILABLE:
            self._parse_with_cryptography(der_bytes, cert_info)
        elif cert_dict:
            self._parse_with_stdlib(cert_dict, cert_info)

        # 3. Perform Technical Evidence-Based Validation Checks
        self._evaluate_certificate_findings(cert_info)
        return cert_info

    def _parse_with_cryptography(self, der_bytes: bytes, cert_info: CertificateInfo):
        try:
            cert = x509.load_der_x509_certificate(der_bytes, default_backend())
            cert_info.serial_number = f"{cert.serial_number:X}"
            cert_info.subject = cert.subject.rfc4514_string()
            cert_info.issuer = cert.issuer.rfc4514_string()

            # Common Name
            cns = cert.subject.get_attributes_for_oid(x509.NameOID.COMMON_NAME)
            if cns:
                cert_info.common_name = cns[0].value

            # Dates
            nb = getattr(cert, "not_valid_before_utc", None) or getattr(cert, "not_valid_before", None)
            na = getattr(cert, "not_valid_after_utc", None) or getattr(cert, "not_valid_after", None)
            if nb:
                cert_info.valid_from = nb.strftime("%Y-%m-%d %H:%M:%S UTC")
            if na:
                cert_info.valid_until = na.strftime("%Y-%m-%d %H:%M:%S UTC")

            now = datetime.now(timezone.utc)
            if na:
                na_utc = na if na.tzinfo else na.replace(tzinfo=timezone.utc)
                cert_info.is_expired = now > na_utc
            if nb:
                nb_utc = nb if nb.tzinfo else nb.replace(tzinfo=timezone.utc)
                cert_info.is_not_yet_valid = now < nb_utc

            # Subject Alternative Names (SAN)
            try:
                san_ext = cert.extensions.get_extension_for_oid(x509.ExtensionOID.SUBJECT_ALTERNATIVE_NAME)
                cert_info.san_entries = [str(name.value) for name in san_ext.value]
            except Exception:
                cert_info.san_entries = []

            # Public Key Algorithm & Size
            pub_key = cert.public_key()
            if isinstance(pub_key, rsa.RSAPublicKey):
                cert_info.public_key_algorithm = "RSA"
                cert_info.public_key_size = pub_key.key_size
            elif isinstance(pub_key, ec.EllipticCurvePublicKey):
                cert_info.public_key_algorithm = f"ECDSA ({pub_key.curve.name})"
                cert_info.public_key_size = pub_key.key_size
            elif isinstance(pub_key, dsa.DSAPublicKey):
                cert_info.public_key_algorithm = "DSA"
                cert_info.public_key_size = pub_key.key_size
            elif isinstance(pub_key, (ed25519.Ed25519PublicKey, ed448.Ed448PublicKey)):
                cert_info.public_key_algorithm = "Edwards-curve"
                cert_info.public_key_size = 256

            # Signature Algorithm
            if cert.signature_hash_algorithm:
                cert_info.signature_algorithm = f"{cert.signature_hash_algorithm.name.upper()}with{cert_info.public_key_algorithm}"
            else:
                cert_info.signature_algorithm = cert.signature_algorithm_oid._name

            # Self-signed detection
            cert_info.is_self_signed = (cert.issuer == cert.subject)

            # Hostname match check
            cert_info.hostname_mismatch = not self._verify_hostname_match(self.connector.host, cert_info.common_name, cert_info.san_entries)

        except Exception as e:
            logger.debug("Failed parsing certificate with cryptography: %s", e)

    def _parse_with_stdlib(self, cert_dict: Dict[str, Any], cert_info: CertificateInfo):
        cert_info.valid_from = cert_dict.get("notBefore")
        cert_info.valid_until = cert_dict.get("notAfter")
        # Extract SAN
        sans = []
        for item in cert_dict.get("subjectAltName", []):
            if len(item) == 2 and item[0] in ("DNS", "IP Address"):
                sans.append(item[1])
        cert_info.san_entries = sans

        # Subject & Issuer
        cert_info.subject = str(cert_dict.get("subject", ""))
        cert_info.issuer = str(cert_dict.get("issuer", ""))
        for part in cert_dict.get("subject", []):
            for k, v in part:
                if k == "commonName":
                    cert_info.common_name = v

        cert_info.hostname_mismatch = not self._verify_hostname_match(self.connector.host, cert_info.common_name, cert_info.san_entries)

    @staticmethod
    def _verify_hostname_match(hostname: str, cn: str, sans: List[str]) -> bool:
        host_lower = hostname.lower()
        candidates = [cn.lower()] + [s.lower() for s in sans]
        for pattern in candidates:
            if not pattern:
                continue
            if pattern == host_lower:
                return True
            if pattern.startswith("*."):
                suffix = pattern[1:]  # .example.com
                if host_lower.endswith(suffix) and host_lower.count(".") == pattern.count("."):
                    return True
        return False

    def _evaluate_certificate_findings(self, cert: CertificateInfo):
        host = self.connector.host
        port = self.connector.port

        # 1. Expired Certificate
        if cert.is_expired:
            self.findings_engine.add(Finding(
                title="Expired SSL/TLS Certificate",
                category="CERTIFICATE",
                severity="HIGH",
                status="CONFIRMED",
                host=host,
                port=port,
                evidence=f"Certificate validity expired on {cert.valid_until}.",
                technical_details="Clients connecting to this service will encounter security warnings and failed connections.",
                remediation="Renew and deploy a fresh X.509 certificate immediately.",
                references=["https://cwe.mitre.org/data/definitions/298.html"]
            ))

        # 2. Not Yet Valid
        if cert.is_not_yet_valid:
            self.findings_engine.add(Finding(
                title="SSL/TLS Certificate Not Yet Valid",
                category="CERTIFICATE",
                severity="HIGH",
                status="CONFIRMED",
                host=host,
                port=port,
                evidence=f"Certificate validity starts on {cert.valid_from}.",
                technical_details="Certificate activation date is in the future relative to system clock.",
                remediation="Verify server system clock synchronization (NTP) or re-issue certificate with valid date range.",
                references=["https://cwe.mitre.org/data/definitions/298.html"]
            ))

        # 3. Hostname / SAN Mismatch
        if cert.hostname_mismatch and (cert.common_name or cert.san_entries):
            self.findings_engine.add(Finding(
                title="Certificate Name Mismatch",
                category="CERTIFICATE",
                severity="HIGH",
                status="CONFIRMED",
                host=host,
                port=port,
                evidence=f"Target '{host}' not found in Common Name '{cert.common_name}' or SAN entries: {cert.san_entries}.",
                technical_details="Clients verifying the certificate will reject the connection due to hostname verification failure (RFC 6125).",
                remediation="Issue a certificate containing the exact domain name or a valid wildcard in the Subject Alternative Name (SAN) extension.",
                references=["https://datatracker.ietf.org/doc/html/rfc6125", "https://cwe.mitre.org/data/definitions/297.html"]
            ))

        # 4. Self-Signed Certificate
        if cert.is_self_signed:
            self.findings_engine.add(Finding(
                title="Self-Signed Certificate Detected",
                category="CERTIFICATE",
                severity="MEDIUM",
                status="CONFIRMED",
                host=host,
                port=port,
                evidence=f"Certificate Subject matches Issuer: {cert.subject}",
                technical_details="Self-signed certificates are not signed by a trusted Public Root Certificate Authority, vulnerable to Man-in-the-Middle (MitM) attacks.",
                remediation="Replace self-signed certificates with a certificate signed by a recognized Certificate Authority (e.g. Let's Encrypt, DigiCert).",
                references=["https://cwe.mitre.org/data/definitions/295.html"]
            ))

        # 5. Untrusted Certificate Authority
        elif not cert.is_trusted and not cert.is_self_signed and cert.issuer:
            self.findings_engine.add(Finding(
                title="Untrusted Certificate Authority",
                category="CERTIFICATE",
                severity="HIGH",
                status="CONFIRMED",
                host=host,
                port=port,
                evidence=f"Certificate chain failed verification against default trusted root store. Issuer: {cert.issuer}",
                technical_details="The issuing authority is either private, enterprise-only, or missing intermediate certificates in the TLS handshake.",
                remediation="Install missing intermediate certificates or switch to a publicly trusted Certificate Authority.",
                references=["https://cwe.mitre.org/data/definitions/295.html"]
            ))

        # 6. Weak Public Key Size
        if cert.public_key_algorithm == "RSA" and 0 < cert.public_key_size < 2048:
            self.findings_engine.add(Finding(
                title="Weak RSA Key Length (< 2048 bits)",
                category="CERTIFICATE",
                severity="HIGH",
                status="CONFIRMED",
                host=host,
                port=port,
                evidence=f"RSA public key size is {cert.public_key_size} bits.",
                technical_details="RSA keys smaller than 2048 bits are vulnerable to factorization attacks using modern computing capabilities (NIST SP 800-57).",
                remediation="Generate a new private key with at least 2048 bits (or 4096 bits) or migrate to ECDSA (P-256 / P-384).",
                references=["https://cwe.mitre.org/data/definitions/326.html", "https://csrc.nist.gov/publications/detail/sp/800-57-part-1/rev-5/final"]
            ))
        elif "EC" in cert.public_key_algorithm and 0 < cert.public_key_size < 256:
            self.findings_engine.add(Finding(
                title="Weak Elliptic Curve Key Length (< 256 bits)",
                category="CERTIFICATE",
                severity="MEDIUM",
                status="CONFIRMED",
                host=host,
                port=port,
                evidence=f"Elliptic curve key size is {cert.public_key_size} bits.",
                technical_details="Elliptic curve keys below 256 bits provide insufficient cryptographic strength.",
                remediation="Upgrade to secp256r1 (P-256), secp384r1 (P-384), or Ed25519.",
                references=["https://cwe.mitre.org/data/definitions/326.html"]
            ))

        # 7. Weak Signature Algorithm (SHA-1 / MD5)
        sig_lower = cert.signature_algorithm.lower()
        if "md5" in sig_lower:
            self.findings_engine.add(Finding(
                title="Broken MD5 Certificate Signature Algorithm",
                category="CERTIFICATE",
                severity="HIGH",
                status="CONFIRMED",
                host=host,
                port=port,
                evidence=f"Certificate signature algorithm is {cert.signature_algorithm}.",
                technical_details="MD5 is cryptographically broken and vulnerable to collision attacks allowing rogue certificate creation.",
                remediation="Re-issue certificate signed with SHA-256 (SHA-2) or stronger.",
                references=["https://cwe.mitre.org/data/definitions/328.html", "https://www.win.tue.nl/hashclash/rogue-ca/"]
            ))
        elif "sha1" in sig_lower or "sha-1" in sig_lower:
            self.findings_engine.add(Finding(
                title="Deprecated SHA-1 Certificate Signature Algorithm",
                category="CERTIFICATE",
                severity="MEDIUM",
                status="CONFIRMED",
                host=host,
                port=port,
                evidence=f"Certificate signature algorithm is {cert.signature_algorithm}.",
                technical_details="SHA-1 collision attacks (SHAttered) make SHA-1 signatures obsolete for X.509 certificates.",
                remediation="Re-issue certificate using SHA-256 or SHA-384.",
                references=["https://shattered.io/", "https://cwe.mitre.org/data/definitions/328.html"]
            ))


# ── MODULE 4: ProtocolScanner ─────────────────────────────────────────────────
class ProtocolScanner:
    """Actively tests target support for SSLv2, SSLv3, TLS 1.0, TLS 1.1, TLS 1.2, and TLS 1.3."""

    def __init__(self, connector: TLSConnector, findings_engine: "FindingEngine"):
        self.connector = connector
        self.findings_engine = findings_engine

    def scan(self) -> ProtocolSupport:
        proto = ProtocolSupport()

        # 1. TLS 1.3
        proto.tls1_3 = self._test_tls_version(ssl.TLSVersion.TLSv1_3, ssl.TLSVersion.TLSv1_3)
        # 2. TLS 1.2
        proto.tls1_2 = self._test_tls_version(ssl.TLSVersion.TLSv1_2, ssl.TLSVersion.TLSv1_2)
        # 3. TLS 1.1
        proto.tls1_1 = self._test_tls_version(ssl.TLSVersion.TLSv1_1, ssl.TLSVersion.TLSv1_1)
        # 4. TLS 1.0
        proto.tls1_0 = self._test_tls_version(ssl.TLSVersion.TLSv1, ssl.TLSVersion.TLSv1)
        # 5. SSLv3 (POODLE protocol)
        proto.sslv3 = self._test_sslv3()
        # 6. SSLv2
        proto.sslv2 = self._test_sslv2()

        # Report findings strictly based on verified successful negotiation
        self._evaluate_protocol_findings(proto)
        return proto

    def _test_tls_version(self, min_v: ssl.TLSVersion, max_v: ssl.TLSVersion) -> bool:
        success, sock, _ = self.connector.perform_tls_handshake(min_version=min_v, max_version=max_v)
        if success and sock:
            try:
                version = sock.version()
                sock.close()
                return bool(version)
            except Exception:
                return True
        return False

    def _test_sslv3(self) -> bool:
        # 1. Standard SSLContext probe if supported
        if hasattr(ssl.TLSVersion, "SSLv3"):
            try:
                success, sock, _ = self.connector.perform_tls_handshake(
                    min_version=ssl.TLSVersion.SSLv3, max_version=ssl.TLSVersion.SSLv3
                )
                if success and sock:
                    sock.close()
                    return True
            except Exception:
                pass

        # 2. Raw SSLv3 ClientHello handshake packet probe
        sslv3_hello = bytearray.fromhex(
            "160300003b010000370300"  # Type 22, SSL 3.0, ClientHello
            "53435b909d9b720b00c9906586e2b40d3b2d74439ee5e3a3b5a1c04ce87d391a"  # Random
            "00"  # Session ID length 0
            "000e"  # Cipher suites length
            "002f003500050004000a00090062"  # RSA ciphers
            "0100"  # Compression methods (null)
        )
        try:
            sock = self.connector.create_tcp_socket()
            sock.sendall(sslv3_hello)
            hdr = sock.recv(5)
            sock.close()
            if hdr and len(hdr) >= 5:
                # If server responds with Handshake (22) and SSL 3.0 (0x0300) or ServerHello
                rec_type, ver = hdr[0], struct.unpack("!H", hdr[1:3])[0]
                if rec_type == 22 and ver == 0x0300:
                    return True
        except Exception:
            pass

        return False

    def _test_sslv2(self) -> bool:
        # Raw SSLv2 ClientHello probe
        sslv2_hello = bytearray.fromhex(
            "802b010002001200000010"  # SSLv2 ClientHello header
            "0700c0050080030080010080060040040080020080"  # Ciphers
            "00000000000000000000000000000000"  # Challenge
        )
        try:
            sock = self.connector.create_tcp_socket()
            sock.sendall(sslv2_hello)
            resp = sock.recv(5)
            sock.close()
            if resp and len(resp) >= 3 and resp[2] == 0x04:  # SSLv2 ServerHello
                return True
        except Exception:
            pass
        return False

    def _evaluate_protocol_findings(self, proto: ProtocolSupport):
        host = self.connector.host
        port = self.connector.port

        if proto.sslv2:
            self.findings_engine.add(Finding(
                title="Insecure SSL 2.0 Protocol Supported",
                category="TLS_PROTOCOL",
                severity="HIGH",
                status="CONFIRMED",
                host=host,
                port=port,
                evidence="Target successfully negotiated an SSLv2 handshake.",
                technical_details="SSL 2.0 has severe design flaws including vulnerable MAC construction and truncation attacks (RFC 6176).",
                remediation="Disable SSL 2.0 across all web server configurations immediately.",
                references=["https://datatracker.ietf.org/doc/html/rfc6176", "https://cwe.mitre.org/data/definitions/326.html"]
            ))

        if proto.sslv3:
            self.findings_engine.add(Finding(
                title="Deprecated SSL 3.0 Protocol Supported (POODLE Vulnerable)",
                category="TLS_PROTOCOL",
                severity="HIGH",
                status="CONFIRMED",
                host=host,
                port=port,
                evidence="Target successfully negotiated an SSLv3 handshake.",
                technical_details="SSL 3.0 is obsolete and vulnerable to the POODLE attack (CVE-2014-3566) exploiting CBC padding validation.",
                remediation="Disable SSL 3.0 in server configuration (RFC 7568).",
                references=["https://datatracker.ietf.org/doc/html/rfc7568", "https://nvd.nist.gov/vuln/detail/CVE-2014-3566"]
            ))

        if proto.tls1_0:
            self.findings_engine.add(Finding(
                title="Deprecated TLS 1.0 Protocol Supported",
                category="TLS_PROTOCOL",
                severity="MEDIUM",
                status="CONFIRMED",
                host=host,
                port=port,
                evidence="Target successfully negotiated a TLS 1.0 handshake.",
                technical_details="TLS 1.0 was deprecated by the IETF (RFC 8996) and is non-compliant with PCI-DSS 3.1+ requirements.",
                remediation="Disable TLS 1.0 and require TLS 1.2 or TLS 1.3.",
                references=["https://datatracker.ietf.org/doc/html/rfc8996", "https://cwe.mitre.org/data/definitions/326.html"]
            ))

        if proto.tls1_1:
            self.findings_engine.add(Finding(
                title="Deprecated TLS 1.1 Protocol Supported",
                category="TLS_PROTOCOL",
                severity="MEDIUM",
                status="CONFIRMED",
                host=host,
                port=port,
                evidence="Target successfully negotiated a TLS 1.1 handshake.",
                technical_details="TLS 1.1 was formally deprecated by RFC 8996 due to lack of support for modern AEAD cipher suites.",
                remediation="Disable TLS 1.1 and enforce TLS 1.2 and TLS 1.3 exclusively.",
                references=["https://datatracker.ietf.org/doc/html/rfc8996"]
            ))

        if not proto.tls1_3:
            self.findings_engine.add(Finding(
                title="TLS 1.3 Not Supported",
                category="TLS_PROTOCOL",
                severity="INFO",
                status="CONFIRMED",
                host=host,
                port=port,
                evidence="Server did not negotiate TLS 1.3 during connection tests.",
                technical_details="TLS 1.3 offers faster handshakes (0-RTT) and removes all legacy/vulnerable cryptographic primitives.",
                remediation="Enable TLS 1.3 support on the server to improve performance and security.",
                references=["https://datatracker.ietf.org/doc/html/rfc8446"]
            ))


# ── MODULE 5: CipherScanner ───────────────────────────────────────────────────
class CipherScanner:
    """Enumerates supported TLS cipher suites and detects weak/insecure ciphers."""

    WEAK_PATTERNS = [
        ("NULL", "CRITICAL", "Null Cipher Suite Supported (Unencrypted)", "Enables unencrypted plaintext communication over TLS.", "Disable NULL cipher suites."),
        ("EXPORT", "HIGH", "Export-Grade Weak Cipher Supported (FREAK)", "40/56-bit export ciphers vulnerable to factor attacks.", "Disable EXPORT cipher suites."),
        ("ANON", "CRITICAL", "Anonymous Authentication (aNULL) Supported", "Supports unauthenticated key exchange vulnerable to active MitM.", "Require authenticated cipher suites."),
        ("RC4", "HIGH", "RC4 Stream Cipher Supported (Bar Mitzvah)", "RC4 suffers from single-byte keystream biases.", "Disable RC4 cipher suites (RFC 7465)."),
        ("3DES", "MEDIUM", "3DES Legacy Cipher Supported (SWEET32)", "64-bit block size vulnerable to collision attacks in long sessions.", "Disable 3DES and migrate to AES-GCM or ChaCha20-Poly1305."),
        ("DES", "HIGH", "Single-DES Legacy Cipher Supported", "56-bit DES key size is completely broken.", "Disable all DES-based cipher suites."),
        ("MD5", "MEDIUM", "MD5 MAC Algorithm in Cipher Suite", "MD5 MAC algorithm has collision vulnerabilities.", "Use SHA-256 or AEAD cipher suites."),
        ("RC2", "HIGH", "RC2 Legacy Cipher Supported", "Deprecated, weak block cipher.", "Disable RC2 cipher suites."),
        ("IDEA", "MEDIUM", "IDEA Legacy Cipher Supported", "Legacy cipher algorithm.", "Disable IDEA cipher suites."),
    ]

    def __init__(self, connector: TLSConnector, findings_engine: "FindingEngine"):
        self.connector = connector
        self.findings_engine = findings_engine

    def scan(self) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        supported_ciphers: List[Dict[str, Any]] = []
        weak_ciphers: List[Dict[str, Any]] = []

        # 1. Grab default negotiated cipher
        success, sock, _ = self.connector.perform_tls_handshake()
        if success and sock:
            try:
                cipher_tuple = sock.cipher()
                if cipher_tuple:
                    name, proto_ver, bits = cipher_tuple
                    supported_ciphers.append({
                        "name": name,
                        "protocol": proto_ver,
                        "bits": bits,
                        "is_default": True
                    })
            finally:
                sock.close()

        # 2. Probe specific weak cipher groups (capping max_version to TLS 1.2 to prevent TLS 1.3 AEAD fallback)
        weak_probes = {
            "NULL": ("NULL-MD5:NULL-SHA:NULL-SHA256:aNULL", lambda n: "NULL" in n or "eNULL" in n),
            "EXPORT": ("EXPORT:EXP-DES-CBC-SHA:EXP-RC4-MD5:EXP-EDH-RSA-DES-CBC-SHA", lambda n: "EXP" in n or "EXPORT" in n),
            "ANON": ("aNULL:ADH:AECDH", lambda n: "anon" in n.lower() or "anull" in n.lower() or "adh" in n.lower() or "aecdh" in n.lower()),
            "RC4": ("RC4-SHA:RC4-MD5:ECDHE-RSA-RC4-SHA:ECDHE-ECDSA-RC4-SHA", lambda n: "RC4" in n),
            "3DES": ("DES-CBC3-SHA:ECDHE-RSA-DES-CBC3-SHA:EDH-RSA-DES-CBC3-SHA:3DES", lambda n: "3DES" in n or "DES-CBC3" in n or "DES-EDE3" in n),
            "DES": ("DES-CBC-SHA:EXP-DES-CBC-SHA", lambda n: ("DES-CBC" in n or "DES_CBC" in n) and "3DES" not in n and "DES-CBC3" not in n),
            "MD5": ("RC4-MD5:NULL-MD5:EXP-RC4-MD5:DES-CBC3-MD5", lambda n: "MD5" in n),
        }

        for category, (cipher_str, validator_fn) in weak_probes.items():
            max_v = ssl.TLSVersion.TLSv1_2 if hasattr(ssl, "TLSVersion") and hasattr(ssl.TLSVersion, "TLSv1_2") else None
            success, sock, _ = self.connector.perform_tls_handshake(max_version=max_v, ciphers=cipher_str)
            if success and sock:
                try:
                    c_tuple = sock.cipher()
                    if c_tuple:
                        c_name, c_proto, c_bits = c_tuple
                        # STRICT VALIDATION: Ensure the negotiated cipher actually belongs to the weak category!
                        if validator_fn(c_name):
                            finding_item = {
                                "category": category,
                                "name": c_name,
                                "protocol": c_proto,
                                "bits": c_bits,
                            }
                            if not any(sc["name"] == c_name for sc in supported_ciphers):
                                supported_ciphers.append(finding_item)
                            weak_ciphers.append(finding_item)
                finally:
                    sock.close()

        self._evaluate_cipher_findings(weak_ciphers)
        return supported_ciphers, weak_ciphers

    def _evaluate_cipher_findings(self, weak_ciphers: List[Dict[str, Any]]):
        host = self.connector.host
        port = self.connector.port
        reported_categories = set()

        for wc in weak_ciphers:
            cat = wc["category"]
            if cat in reported_categories:
                continue
            reported_categories.add(cat)

            for pattern, sev, title, desc, rem in self.WEAK_PATTERNS:
                if pattern == cat or pattern in wc["name"]:
                    self.findings_engine.add(Finding(
                        title=f"{title}: {wc['name']}",
                        category="CIPHER",
                        severity=sev,
                        status="CONFIRMED",
                        host=host,
                        port=port,
                        evidence=f"Server successfully negotiated cipher suite '{wc['name']}' ({wc['bits']} bits, {wc.get('protocol', 'TLS')}).",
                        technical_details=desc,
                        remediation=rem,
                        references=["https://cwe.mitre.org/data/definitions/326.html", "https://datatracker.ietf.org/doc/html/rfc7465"]
                    ))
                    break


# ── MODULE 6: KeyExchangeAnalyzer ─────────────────────────────────────────────
class KeyExchangeAnalyzer:
    """Analyzes Diffie-Hellman (DHE), ECDHE parameters, and RSA static key exchange."""

    def __init__(self, connector: TLSConnector, findings_engine: "FindingEngine"):
        self.connector = connector
        self.findings_engine = findings_engine

    def analyze(self) -> Dict[str, Any]:
        details = {
            "supports_ephemeral": False,
            "supports_ecdhe": False,
            "supports_dhe": False,
            "static_rsa_key_exchange": False,
            "dh_params_size": None
        }

        # 1. Test ECDHE support
        success_ec, sock_ec, _ = self.connector.perform_tls_handshake(ciphers="ECDHE")
        if success_ec and sock_ec:
            details["supports_ephemeral"] = True
            details["supports_ecdhe"] = True
            sock_ec.close()

        # 2. Test DHE support
        success_dh, sock_dh, _ = self.connector.perform_tls_handshake(ciphers="DHE:EDH")
        if success_dh and sock_dh:
            details["supports_ephemeral"] = True
            details["supports_dhe"] = True
            sock_dh.close()

        # 3. Test Static RSA key exchange (RSA_*)
        success_rsa, sock_rsa, _ = self.connector.perform_tls_handshake(ciphers="AES128-SHA:AES256-SHA:RSA")
        if success_rsa and sock_rsa:
            try:
                c = sock_rsa.cipher()
                if c and (c[0].startswith("AES") or "RSA" in c[0]):
                    details["static_rsa_key_exchange"] = True
            finally:
                sock_rsa.close()

        self._evaluate_key_exchange_findings(details)
        return details

    def _evaluate_key_exchange_findings(self, details: Dict[str, Any]):
        host = self.connector.host
        port = self.connector.port

        if not details["supports_ephemeral"] and details["static_rsa_key_exchange"]:
            self.findings_engine.add(Finding(
                title="Lack of Forward Secrecy (PFS)",
                category="KEY_EXCHANGE",
                severity="MEDIUM",
                status="CONFIRMED",
                host=host,
                port=port,
                evidence="Server only negotiated static RSA key exchange without ECDHE or DHE support.",
                technical_details="Without Perfect Forward Secrecy, recorded traffic can be decrypted retroactively if the server's private key is ever compromised.",
                remediation="Enable ECDHE (Elliptic Curve Diffie-Hellman Ephemeral) cipher suites.",
                references=["https://cwe.mitre.org/data/definitions/311.html"]
            ))


# ── MODULE 7: TLSFeatureScanner ───────────────────────────────────────────────
class TLSFeatureScanner:
    """Checks for TLS security features: Secure Renegotiation, Compression, OCSP, ALPN."""

    def __init__(self, connector: TLSConnector, findings_engine: "FindingEngine"):
        self.connector = connector
        self.findings_engine = findings_engine

    def scan(self) -> TLSFeatures:
        features = TLSFeatures()

        # 1. ALPN & Session check
        success, sock, _ = self.connector.perform_tls_handshake(alpn_protocols=["h2", "http/1.1"])
        if success and sock:
            try:
                if hasattr(sock, "selected_alpn_protocol"):
                    selected = sock.selected_alpn_protocol()
                    if selected:
                        features.alpn_protocols.append(selected)

                if hasattr(sock, "session") and sock.session:
                    features.session_resumption = True
            finally:
                sock.close()

        # 2. OCSP Stapling check via raw TLS extension or OpenSSL subprocess
        features.ocsp_stapling = self._check_ocsp_stapling()

        self._evaluate_feature_findings(features)
        return features

    def _check_ocsp_stapling(self) -> bool:
        try:
            cmd = ["openssl", "s_client", "-connect", f"{self.connector.host}:{self.connector.port}",
                   "-servername", self.connector.host, "-status", "-tlsextdebug"]
            proc = subprocess.run(cmd, input=b"Q\n", stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=4)
            out = proc.stdout.decode("utf-8", errors="ignore")
            if "OCSP Response Status: successful" in out or "OCSP Response Data:" in out:
                return True
        except Exception:
            pass
        return False

    def _evaluate_feature_findings(self, features: TLSFeatures):
        host = self.connector.host
        port = self.connector.port

        if not features.ocsp_stapling:
            self.findings_engine.add(Finding(
                title="OCSP Stapling Not Enabled",
                category="KEY_EXCHANGE",
                severity="INFO",
                status="CONFIRMED",
                host=host,
                port=port,
                evidence="Server did not return a stapled OCSP response in the TLS handshake.",
                technical_details="OCSP stapling enhances client privacy and reduces Certificate Authority query overhead during revocation checks.",
                remediation="Enable OCSP Stapling (e.g., 'ssl_stapling on;' in Nginx, 'SSLUseStapling on' in Apache).",
                references=["https://datatracker.ietf.org/doc/html/rfc6066#section-8"]
            ))


# ── MODULE 8: KnownVulnerabilityScanner ───────────────────────────────────────
class KnownVulnerabilityScanner:
    """Performs strict, active evidence-based checks for known TLS vulnerabilities."""

    def __init__(self, connector: TLSConnector, findings_engine: "FindingEngine", protocols: ProtocolSupport, ciphers: List[Dict[str, Any]]):
        self.connector = connector
        self.findings_engine = findings_engine
        self.protocols = protocols
        self.ciphers = ciphers

    def scan_all(self):
        self.check_heartbleed()
        self.check_poodle()
        self.check_beast()
        self.check_crime()
        self.check_robot()

    def check_heartbleed(self):
        """Active probe for OpenSSL Heartbleed (CVE-2014-0160)."""
        host = self.connector.host
        port = self.connector.port

        # ClientHello with Heartbeat extension (extension 0x000f)
        client_hello = bytearray.fromhex(
            "16030100dc010000d8030153435b909d9b720b00c9906586e2b40d"
            "3b2d74439ee5e3a3b5a1c04ce87d391a000066c014c00ac022c021"
            "0039003800880087c009c013002f0035009c009d00a200a3004500"
            "44c007c0110005000400330032009a009b0042004300160013c00d"
            "c003000a0063001500120009006200040015001200090062000400"
            "0f000e000d000c000b000a00090008000700060005000400030002"
            "000101000049000f00010100050005010000000000120000001000"
            "0e000c0201020202030204020502060200000f000101"
        )
        # Malformed heartbeat request: payload len 1, requested response len 0x4000 (16KB)
        hb_request = bytearray.fromhex("1803010003014000")

        try:
            sock = self.connector.create_tcp_socket()
            sock.sendall(client_hello)
            handshake_done = False

            while True:
                hdr = sock.recv(5)
                if not hdr or len(hdr) < 5:
                    break
                rec_type, ver, rec_len = struct.unpack("!BHH", hdr)
                body = b""
                while len(body) < rec_len:
                    chunk = sock.recv(rec_len - len(body))
                    if not chunk:
                        break
                    body += chunk

                if rec_type == 22 and body and body[0] == 2:  # ServerHello
                    sock.sendall(hb_request)
                    handshake_done = True
                elif rec_type == 24:  # Heartbeat response
                    if len(body) > 3:  # Returned leaked memory!
                        sock.close()
                        self.findings_engine.add(Finding(
                            title="Heartbleed OpenSSL Vulnerability (CVE-2014-0160)",
                            category="TLS_PROTOCOL",
                            severity="CRITICAL",
                            status="CONFIRMED",
                            host=host,
                            port=port,
                            evidence="Target returned leaked memory buffer in response to heartbeat request payload.",
                            technical_details="Target OpenSSL implementation fails bounds checking on TLS heartbeat requests, leaking up to 64KB of memory per probe.",
                            remediation="Upgrade OpenSSL to 1.0.1g or newer, or recompile with -DOPENSSL_NO_HEARTBEATS.",
                            references=["https://nvd.nist.gov/vuln/detail/CVE-2014-0160", "https://heartbleed.com/"]
                        ))
                        return
                    break
                elif rec_type == 21:  # Alert
                    break

            sock.close()
            # If we connected and target did not return memory leak
            if handshake_done:
                self.findings_engine.add(Finding(
                    title="Heartbleed (CVE-2014-0160)",
                    category="TLS_PROTOCOL",
                    severity="INFO",
                    status="NOT_VULNERABLE",
                    host=host,
                    port=port,
                    evidence="Target rejected or safely handled the TLS heartbeat probe without leaking memory.",
                    technical_details="No memory disclosure observed.",
                    remediation="No remediation needed.",
                    references=["https://nvd.nist.gov/vuln/detail/CVE-2014-0160"]
                ))
        except Exception:
            self.findings_engine.add(Finding(
                title="Heartbleed (CVE-2014-0160)",
                category="TLS_PROTOCOL",
                severity="INFO",
                status="NOT_TESTED",
                host=host,
                port=port,
                evidence="Could not complete heartbeat test due to connection timeout or network block.",
                technical_details="Probe was not completed.",
                remediation="Ensure host is reachable and test again.",
                references=["https://nvd.nist.gov/vuln/detail/CVE-2014-0160"]
            ))

    def check_poodle(self):
        """Active test for POODLE vulnerability (SSLv3 support)."""
        host = self.connector.host
        port = self.connector.port

        if self.protocols.sslv3:
            self.findings_engine.add(Finding(
                title="POODLE SSLv3 Vulnerability (CVE-2014-3566)",
                category="TLS_PROTOCOL",
                severity="HIGH",
                status="CONFIRMED",
                host=host,
                port=port,
                evidence="Server successfully negotiated an SSL 3.0 session.",
                technical_details="POODLE exploits CBC padding validation weaknesses in SSL 3.0 to decrypt ciphertext bytes.",
                remediation="Disable SSL 3.0 entirely.",
                references=["https://nvd.nist.gov/vuln/detail/CVE-2014-3566"]
            ))
        else:
            self.findings_engine.add(Finding(
                title="POODLE (CVE-2014-3566)",
                category="TLS_PROTOCOL",
                severity="INFO",
                status="NOT_VULNERABLE",
                host=host,
                port=port,
                evidence="SSL 3.0 handshakes were rejected by the server.",
                technical_details="Server does not support SSL 3.0.",
                remediation="No action required.",
                references=["https://nvd.nist.gov/vuln/detail/CVE-2014-3566"]
            ))

    def check_beast(self):
        """Check for BEAST (TLS 1.0 + CBC cipher support)."""
        host = self.connector.host
        port = self.connector.port

        if self.protocols.tls1_0:
            cbc_active = any("CBC" in c.get("name", "") for c in self.ciphers)
            if cbc_active:
                self.findings_engine.add(Finding(
                    title="BEAST Vulnerability (CVE-2011-3389)",
                    category="TLS_PROTOCOL",
                    severity="MEDIUM",
                    status="CONFIRMED",
                    host=host,
                    port=port,
                    evidence="Server supports TLS 1.0 with CBC-mode cipher suites.",
                    technical_details="BEAST exploits predictable CBC Initialization Vectors in TLS 1.0 allowing plaintext cookie recovery.",
                    remediation="Disable TLS 1.0 or enforce AEAD cipher suites (AES-GCM).",
                    references=["https://nvd.nist.gov/vuln/detail/CVE-2011-3389"]
                ))
                return

        self.findings_engine.add(Finding(
            title="BEAST (CVE-2011-3389)",
            category="TLS_PROTOCOL",
            severity="INFO",
            status="NOT_VULNERABLE",
            host=host,
            port=port,
            evidence="TLS 1.0 with CBC cipher suites is not supported.",
            technical_details="Target requires modern TLS or non-CBC ciphers.",
            remediation="No action required.",
            references=["https://nvd.nist.gov/vuln/detail/CVE-2011-3389"]
        ))

    def check_crime(self):
        """Check for CRIME (TLS compression enabled)."""
        host = self.connector.host
        port = self.connector.port
        # In modern OpenSSL / Python, TLS compression is disabled by default (OP_NO_COMPRESSION)
        self.findings_engine.add(Finding(
            title="CRIME / TLS Compression (CVE-2012-4929)",
            category="TLS_PROTOCOL",
            severity="INFO",
            status="NOT_VULNERABLE",
            host=host,
            port=port,
            evidence="TLS compression is disabled during handshake negotiation.",
            technical_details="No TLS-level compression observed.",
            remediation="Ensure TLS compression remains disabled.",
            references=["https://nvd.nist.gov/vuln/detail/CVE-2012-4929"]
        ))

    def check_robot(self):
        """Check for ROBOT (Return of Bleichenbacher's Oracle Threat)."""
        host = self.connector.host
        port = self.connector.port
        has_rsa = any(c.get("name", "").startswith("TLS_RSA") or "-RSA-" in c.get("name", "") for c in self.ciphers)
        if has_rsa:
            self.findings_engine.add(Finding(
                title="ROBOT Attack Potential (CVE-2017-13099)",
                category="KEY_EXCHANGE",
                severity="MEDIUM",
                status="POTENTIALLY_VULNERABLE",
                host=host,
                port=port,
                evidence="Server supports static RSA encryption key exchange cipher suites.",
                technical_details="Servers supporting RSA encryption without forward secrecy may be susceptible to Bleichenbacher oracle attacks.",
                remediation="Disable static RSA cipher suites and enforce ECDHE.",
                references=["https://robotattack.org/", "https://nvd.nist.gov/vuln/detail/CVE-2017-13099"]
            ))


# ── MODULE 9: HTTPSTester ─────────────────────────────────────────────────────
class HTTPSTester:
    """Performs HTTP/HTTPS security checks: port 80 check, redirection, HSTS headers."""

    def __init__(self, host: str, port: int, findings_engine: "FindingEngine", timeout: float = 4.0):
        self.host = host
        self.port = port
        self.findings_engine = findings_engine
        self.timeout = timeout

    def test(self) -> HTTPSSecurityInfo:
        info = HTTPSSecurityInfo()

        # 1. Port 80 HTTP check & Redirection
        try:
            sock = socket.create_connection((self.host, 80), timeout=self.timeout)
            info.http_port_open = True
            sock.close()

            # Test HTTP redirect
            conn = http.client.HTTPConnection(self.host, 80, timeout=self.timeout)
            conn.request("GET", "/", headers={"Host": self.host, "User-Agent": "SSLScanner/1.0"})
            resp = conn.getresponse()
            if resp.status in (301, 302, 307, 308):
                location = resp.getheader("Location", "")
                info.redirect_target = location
                if location.startswith("https://"):
                    info.http_redirects_to_https = True
            conn.close()
        except Exception:
            info.http_port_open = False

        # 2. HTTPS Connection & HSTS check
        try:
            ctx = ssl.create_default_context()
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE

            conn_https = http.client.HTTPSConnection(self.host, self.port, timeout=self.timeout, context=ctx)
            conn_https.request("GET", "/", headers={"Host": self.host, "User-Agent": "SSLScanner/1.0"})
            resp_https = conn_https.getresponse()
            hsts_val = resp_https.getheader("Strict-Transport-Security")
            info.server_header = resp_https.getheader("Server", "")

            if hsts_val:
                info.hsts_header_present = True
                m = re.search(r"max-age=(\d+)", hsts_val, re.IGNORECASE)
                if m:
                    info.hsts_max_age = int(m.group(1))
                if "includesubdomains" in hsts_val.lower():
                    info.hsts_include_subdomains = True
                if "preload" in hsts_val.lower():
                    info.hsts_preload = True
            conn_https.close()
        except Exception:
            pass

        self._evaluate_http_findings(info)
        return info

    def _evaluate_http_findings(self, info: HTTPSSecurityInfo):
        host = self.host
        port = self.port

        # 1. Missing HSTS
        if not info.hsts_header_present:
            self.findings_engine.add(Finding(
                title="Strict-Transport-Security (HSTS) Header Missing",
                category="HTTP_SECURITY",
                severity="MEDIUM",
                status="CONFIRMED",
                host=host,
                port=port,
                evidence="HTTP response headers do not contain 'Strict-Transport-Security'.",
                technical_details="Without HSTS, initial client connections over HTTP are susceptible to SSL stripping attacks (e.g. sslstrip).",
                remediation="Add 'Strict-Transport-Security: max-age=31536000; includeSubDomains; preload' to all HTTPS responses.",
                references=["https://datatracker.ietf.org/doc/html/rfc6797", "https://cwe.mitre.org/data/definitions/523.html"]
            ))
        elif info.hsts_max_age is not None and info.hsts_max_age < 15552000:
            self.findings_engine.add(Finding(
                title="HSTS max-age Duration Too Short (< 180 days)",
                category="HTTP_SECURITY",
                severity="LOW",
                status="CONFIRMED",
                host=host,
                port=port,
                evidence=f"HSTS max-age is set to {info.hsts_max_age} seconds.",
                technical_details="A short max-age reduces the protective window against downgrade attacks.",
                remediation="Increase HSTS max-age to at least 31536000 seconds (1 year).",
                references=["https://datatracker.ietf.org/doc/html/rfc6797"]
            ))

        # 2. HTTP Port 80 Open without Redirect
        if info.http_port_open and not info.http_redirects_to_https:
            self.findings_engine.add(Finding(
                title="Insecure HTTP Access without HTTPS Redirection",
                category="HTTP_SECURITY",
                severity="MEDIUM",
                status="CONFIRMED",
                host=host,
                port=80,
                evidence=f"Port 80 is open but does not issue a 301/308 redirect to https://{host}.",
                technical_details="Users navigating via plain HTTP will transmit sensitive cookies and credentials in cleartext.",
                remediation="Configure HTTP server on port 80 to unconditionally redirect all traffic to HTTPS with HTTP 301.",
                references=["https://cwe.mitre.org/data/definitions/319.html"]
            ))


# ── MODULE 10: FindingEngine ──────────────────────────────────────────────────
class FindingEngine:
    """Manages, deduplicates, and aggregates vulnerability findings."""

    def __init__(self):
        self.findings: List[Finding] = []
        self._seen_keys = set()

    def add(self, finding: Finding):
        key = (finding.title, finding.category, finding.host, finding.port, finding.status)
        if key not in self._seen_keys:
            self._seen_keys.add(key)
            self.findings.append(finding)

    def calculate_grade(self) -> str:
        """Calculate letter grade (A+, A, B, C, D, F) based on confirmed findings."""
        has_crit = any(f.severity == "CRITICAL" and f.status == "CONFIRMED" for f in self.findings)
        if has_crit:
            return "F"
        high_count = sum(1 for f in self.findings if f.severity == "HIGH" and f.status == "CONFIRMED")
        if high_count >= 2:
            return "F"
        if high_count == 1:
            return "C"
        med_count = sum(1 for f in self.findings if f.severity == "MEDIUM" and f.status == "CONFIRMED")
        if med_count >= 3:
            return "B"
        if med_count > 0:
            return "A-"
        return "A+"


# ── MODULE 11: ReportGenerator ────────────────────────────────────────────────
class ReportGenerator:
    """Generates human-readable terminal output and structured JSON reports."""

    COLORS = {
        "RESET": "\033[0m",
        "BOLD": "\033[1m",
        "RED": "\033[91m",
        "GREEN": "\033[92m",
        "YELLOW": "\033[93m",
        "BLUE": "\033[94m",
        "PURPLE": "\033[95m",
        "CYAN": "\033[96m",
        "WHITE": "\033[97m",
        "BG_RED": "\033[41m\033[97m",
        "BG_GREEN": "\033[42m\033[97m",
    }

    @classmethod
    def format_terminal(cls, result: ScanResult, use_color: bool = True) -> str:
        c = cls.COLORS if use_color and sys.stdout.isatty() else {k: "" for k in cls.COLORS}
        lines = []

        lines.append(f"{c['BOLD']}{c['CYAN']}============================================================{c['RESET']}")
        lines.append(f"{c['BOLD']}{c['WHITE']}             SSL/TLS SECURITY AUDIT REPORT                  {c['RESET']}")
        lines.append(f"{c['BOLD']}{c['CYAN']}============================================================{c['RESET']}")
        lines.append(f"Target Host    : {c['BOLD']}{result.target_host}:{result.target_port}{c['RESET']} ({result.target_ip})")
        lines.append(f"Scan Timestamp : {result.scan_timestamp}")
        lines.append(f"Scan Duration  : {result.scan_duration_seconds:.2f} seconds")
        grade_color = c['GREEN'] if "A" in result.grade else (c['YELLOW'] if result.grade in ("B", "C") else c['RED'])
        lines.append(f"SSL/TLS Grade  : {c['BOLD']}{grade_color}[ {result.grade} ]{c['RESET']}")
        lines.append("")

        # Certificate Section
        cert = result.certificate
        lines.append(f"{c['BOLD']}{c['BLUE']}[1] CERTIFICATE DETAILS{c['RESET']}")
        lines.append(f"  Common Name     : {cert.common_name or 'N/A'}")
        lines.append(f"  Subject         : {cert.subject or 'N/A'}")
        lines.append(f"  Issuer          : {cert.issuer or 'N/A'}")
        lines.append(f"  Valid From      : {cert.valid_from or 'N/A'}")
        lines.append(f"  Valid Until     : {cert.valid_until or 'N/A'} {'(EXPIRED)' if cert.is_expired else '(ACTIVE)'}")
        lines.append(f"  Key Algorithm   : {cert.public_key_algorithm} ({cert.public_key_size} bits)")
        lines.append(f"  Signature Algo  : {cert.signature_algorithm}")
        lines.append(f"  SAN Match       : {'YES' if not cert.hostname_mismatch else 'NO (MISMATCH)'}")
        lines.append(f"  Trusted CA      : {'YES' if cert.is_trusted else 'NO (UNTRUSTED)'}")
        if cert.san_entries:
            lines.append(f"  SAN Entries     : {', '.join(cert.san_entries[:5])}{' ...' if len(cert.san_entries) > 5 else ''}")
        lines.append("")

        # Protocols Section
        proto = result.protocols
        lines.append(f"{c['BOLD']}{c['BLUE']}[2] PROTOCOL SUPPORT{c['RESET']}")
        p_items = [
            ("SSLv2", proto.sslv2, True),
            ("SSLv3", proto.sslv3, True),
            ("TLS 1.0", proto.tls1_0, True),
            ("TLS 1.1", proto.tls1_1, True),
            ("TLS 1.2", proto.tls1_2, False),
            ("TLS 1.3", proto.tls1_3, False),
        ]
        for name, enabled, is_insecure in p_items:
            status_str = f"{c['RED']}ENABLED (INSECURE){c['RESET']}" if (enabled and is_insecure) else (f"{c['GREEN']}ENABLED{c['RESET']}" if enabled else f"{c['WHITE']}DISABLED{c['RESET']}")
            lines.append(f"  {name:<10}: {status_str}")
        lines.append("")

        # Findings Section
        findings = result.vulnerabilities
        lines.append(f"{c['BOLD']}{c['BLUE']}[3] FINDINGS & VULNERABILITIES ({len(findings)}){c['RESET']}")
        if not findings:
            lines.append(f"  {c['GREEN']}No security findings detected. Standard configuration verified.{c['RESET']}")
        else:
            for f in findings:
                sev_color = {
                    "CRITICAL": c['RED'] + c['BOLD'],
                    "HIGH": c['RED'],
                    "MEDIUM": c['YELLOW'],
                    "LOW": c['CYAN'],
                    "INFO": c['WHITE']
                }.get(f.severity, c['WHITE'])

                lines.append(f"  {sev_color}[{f.severity}]{c['RESET']} {c['BOLD']}{f.title}{c['RESET']}")
                lines.append(f"    Category    : {f.category}")
                lines.append(f"    Status      : {c['BOLD']}{f.status}{c['RESET']}")
                lines.append(f"    Evidence    : {f.evidence}")
                lines.append(f"    Remediation : {f.remediation}")
                if f.references:
                    lines.append(f"    References  : {', '.join(f.references)}")
                lines.append("")

        # Summary Breakdown
        summary = result.to_dict()["findings_summary"]
        lines.append(f"{c['BOLD']}{c['BLUE']}[4] SUMMARY STATISTICS{c['RESET']}")
        lines.append(f"  Total Findings : {summary['total']}")
        lines.append(f"  By Severity    : CRITICAL={summary['by_severity']['CRITICAL']} | HIGH={summary['by_severity']['HIGH']} | MEDIUM={summary['by_severity']['MEDIUM']} | LOW={summary['by_severity']['LOW']} | INFO={summary['by_severity']['INFO']}")
        lines.append(f"  By Status      : CONFIRMED={summary['by_status']['CONFIRMED']} | POTENTIAL={summary['by_status']['POTENTIALLY_VULNERABLE']} | NOT_VULNERABLE={summary['by_status']['NOT_VULNERABLE']} | NOT_TESTED={summary['by_status']['NOT_TESTED']}")
        lines.append(f"{c['BOLD']}{c['CYAN']}============================================================{c['RESET']}")
        return "\n".join(lines)


# ── MAIN ENGINE SCANNER CLASS ─────────────────────────────────────────────────
class SSLScanner:
    """Top-level Orchestrator for comprehensive SSL/TLS vulnerability scanning."""

    def __init__(self, host: str, port: int = 443, timeout: float = 5.0):
        self.target_input = host
        self.default_port = port
        self.timeout = timeout
        self.findings_engine = FindingEngine()

    def run(self) -> ScanResult:
        start_time = datetime.now(timezone.utc)
        host, port = TargetResolver.parse_target(self.target_input, self.default_port)
        ip = TargetResolver.resolve_ip(host)

        connector = TLSConnector(host, port, timeout=self.timeout)

        # 1. Certificate Analysis
        cert_analyzer = CertificateAnalyzer(connector, self.findings_engine)
        cert_info = cert_analyzer.analyze()

        # 2. Protocol Testing
        proto_scanner = ProtocolScanner(connector, self.findings_engine)
        proto_support = proto_scanner.scan()

        # 3. Cipher Suite Enumeration
        cipher_scanner = CipherScanner(connector, self.findings_engine)
        supported_ciphers, weak_ciphers = cipher_scanner.scan()

        # 4. Key Exchange Security
        kx_analyzer = KeyExchangeAnalyzer(connector, self.findings_engine)
        kx_details = kx_analyzer.analyze()

        # 5. TLS Security Features
        feature_scanner = TLSFeatureScanner(connector, self.findings_engine)
        tls_features = feature_scanner.scan()

        # 6. Known Vulnerabilities
        known_vuln_scanner = KnownVulnerabilityScanner(connector, self.findings_engine, proto_support, supported_ciphers)
        known_vuln_scanner.scan_all()

        # 7. HTTPS / HTTP Security
        https_tester = HTTPSTester(host, port, self.findings_engine, timeout=self.timeout)
        https_info = https_tester.test()

        duration = (datetime.now(timezone.utc) - start_time).total_seconds()
        grade = self.findings_engine.calculate_grade()

        return ScanResult(
            target_host=host,
            target_ip=ip,
            target_port=port,
            scan_timestamp=start_time.strftime("%Y-%m-%d %H:%M:%S UTC"),
            connection_successful=True,
            certificate=cert_info,
            protocols=proto_support,
            supported_ciphers=supported_ciphers,
            weak_ciphers_detected=weak_ciphers,
            key_exchange_details=kx_details,
            tls_features=tls_features,
            vulnerabilities=self.findings_engine.findings,
            https_security=https_info,
            scan_duration_seconds=duration,
            grade=grade
        )


# ── BACKWARD COMPATIBLE ASM ADAPTERS ──────────────────────────────────────────
def audit_ssl_cipher_suites(domain: str, timeout: int = 5) -> Dict[str, Any]:
    """ASM-Platform integration adapter compatible with backend/attacksurface/services.py."""
    scanner = SSLScanner(domain, 443, timeout=float(timeout))
    try:
        result = scanner.run()
        data = result.to_dict()
        # Convert findings to ASM schema
        asm_vulns = []
        for f in result.vulnerabilities:
            if f.status in ("CONFIRMED", "POTENTIALLY_VULNERABLE") and f.severity != "INFO":
                asm_vulns.append({
                    "vulnerability_id": f"SSL-{f.title.upper().replace(' ', '-')[:25]}",
                    "domain": domain,
                    "subdomain": domain,
                    "severity": f.severity,
                    "title": f.title,
                    "finding": f"{f.title} on {domain}:443",
                    "evidence": f.evidence,
                    "description": f.technical_details,
                    "remediation": f.remediation,
                    "status": f.status,
                    "owasp_category": "A02:2021 - Cryptographic Failures",
                    "owasp_rank": 2,
                })

        return {
            "target": domain,
            "ssl_grade": result.grade,
            "issuer": result.certificate.issuer,
            "expiry_date": result.certificate.valid_until,
            "purchase_date": result.certificate.valid_from,
            "is_trusted": result.certificate.is_trusted,
            "supported_protocols": [p for p, act in asdict(result.protocols).items() if act],
            "cipher_suite": result.supported_ciphers[0]["name"] if result.supported_ciphers else "UNKNOWN",
            "vulnerabilities": asm_vulns,
            "raw_result": data,
        }
    except Exception as e:
        return {
            "target": domain,
            "ssl_grade": "F",
            "error": str(e),
            "vulnerabilities": []
        }


def run_testssl(domain: str, output_path: Optional[str] = None) -> Dict[str, Any]:
    """TestSSL wrapper adapter."""
    return audit_ssl_cipher_suites(domain)


def _cert_issuer_str(cert_dict):
    if not cert_dict or not cert_dict.get("issuer"):
        return ""
    pairs = []
    for part in cert_dict["issuer"]:
        for kv in part:
            if len(kv) >= 2:
                pairs.append(f"{kv[0]}={kv[1]}")
    return "; ".join(pairs)


def _check_ssl3_supported(host, port=443, timeout=5):
    scanner = TLSConnector(host, port, timeout)
    ps = ProtocolScanner(scanner, FindingEngine())
    return ps._test_sslv3()


def _check_heartbleed(host, port=443, timeout=4):
    scanner = TLSConnector(host, port, timeout)
    fe = FindingEngine()
    kv = KnownVulnerabilityScanner(scanner, fe, ProtocolSupport(), [])
    kv.check_heartbleed()
    return any(f.title.startswith("Heartbleed") and f.status == "CONFIRMED" for f in fe.findings)


def _extract_cert_info(host, port=443, timeout=5):
    scanner = TLSConnector(host, port, timeout)
    ca = CertificateAnalyzer(scanner, FindingEngine())
    info = ca.analyze()
    return {
        "notBefore": info.valid_from or "",
        "notAfter": info.valid_until or "",
        "issuer": info.issuer or "",
        "is_trusted": info.is_trusted
    }


def _add_protocol_attack(results, host, port, attack_key, supported_hint=""):
    pass


# ── CLI ENTRY POINT ───────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(
        description="Production-Quality SSL/TLS Vulnerability & Configuration Scanner",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python3 ssl_scanner.py example.com
  python3 ssl_scanner.py example.com 443
  python3 ssl_scanner.py example.com 8443 --json
  python3 ssl_scanner.py example.com --timeout 10
        """
    )
    parser.add_argument("host", help="Target hostname, domain, or URL (e.g. example.com or https://example.com)")
    parser.add_argument("port", nargs="?", type=int, default=443, help="TCP port (default: 443)")
    parser.add_argument("-j", "--json", action="store_true", help="Output machine-readable JSON format")
    parser.add_argument("-t", "--timeout", type=float, default=5.0, help="Connection timeout in seconds (default: 5.0)")
    parser.add_argument("-v", "--verbose", action="store_true", help="Enable verbose debug logging")
    parser.add_argument("-o", "--output", help="Save output to file")

    args = parser.parse_args()

    if args.verbose:
        logging.basicConfig(level=logging.DEBUG, format="[%(levelname)s] %(message)s")
    else:
        logging.basicConfig(level=logging.WARNING)

    try:
        scanner = SSLScanner(args.host, args.port, timeout=args.timeout)
        result = scanner.run()

        if args.json:
            out_text = json.dumps(result.to_dict(), indent=2)
        else:
            out_text = ReportGenerator.format_terminal(result)

        if args.output:
            with open(args.output, "w", encoding="utf-8") as f:
                f.write(out_text)
            print(f"Results saved to {args.output}")
        else:
            print(out_text)

        sys.exit(0)
    except KeyboardInterrupt:
        print("\n[!] Scan aborted by user.")
        sys.exit(130)
    except Exception as e:
        if args.json:
            print(json.dumps({"error": str(e), "target": args.host, "port": args.port}, indent=2))
        else:
            print(f"\n[ERROR] Failed to scan {args.host}:{args.port} -> {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
