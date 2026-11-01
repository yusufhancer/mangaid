import socket
import ipaddress
from urllib.parse import urlparse
from typing import Tuple

class SSRFProtectionError(ValueError):
    """Raised when a URL fails SSRF security checks."""
    pass

# Blocked metadata and reserved ranges
BLOCKED_IP_NETWORKS = [
    ipaddress.ip_network("0.0.0.0/8"),
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("100.64.0.0/10"),
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("169.254.0.0/16"),       # Link-local & Cloud Metadata (AWS/GCP/Azure)
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.0.0.0/24"),
    ipaddress.ip_network("192.0.2.0/24"),
    ipaddress.ip_network("192.88.99.0/24"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("198.18.0.0/15"),
    ipaddress.ip_network("198.51.100.0/24"),
    ipaddress.ip_network("203.0.113.0/24"),
    ipaddress.ip_network("224.0.0.0/4"),          # Multicast
    ipaddress.ip_network("240.0.0.0/4"),          # Reserved
    ipaddress.ip_network("::1/128"),              # IPv6 loopback
    ipaddress.ip_network("fc00::/7"),             # IPv6 private
    ipaddress.ip_network("fe80::/10"),            # IPv6 link-local
]

def validate_url_safe(url: str) -> Tuple[bool, str]:
    """
    Validates that a URL uses http/https and does not resolve to private, loopback,
    or link-local IP addresses (SSRF protection).
    """
    if not url or not isinstance(url, str):
        return False, "URL cannot be empty"

    try:
        parsed = urlparse(url.strip())
    except Exception as e:
        return False, f"Invalid URL syntax: {e}"

    if parsed.scheme.lower() not in ("http", "https"):
        return False, f"Unsupported protocol '{parsed.scheme}'. Only http and https are allowed."

    hostname = parsed.hostname
    if not hostname:
        return False, "URL must contain a valid hostname"

    # Lowercase hostname check for localhost
    if hostname.lower() in ("localhost", "127.0.0.1", "::1"):
        return False, "Access to localhost is prohibited."

    # DNS Resolution check
    try:
        addr_info = socket.getaddrinfo(hostname, parsed.port or (443 if parsed.scheme == "https" else 80))
    except socket.gaierror as e:
        return False, f"Could not resolve host '{hostname}': {e}"
    except Exception as e:
        return False, f"DNS resolution failed for '{hostname}': {e}"

    for family, _, _, _, sockaddr in addr_info:
        ip_str = sockaddr[0]
        try:
            ip_obj = ipaddress.ip_address(ip_str)
        except ValueError:
            return False, f"Invalid IP address resolved: {ip_str}"

        if ip_obj.is_private or ip_obj.is_loopback or ip_obj.is_link_local or ip_obj.is_reserved or ip_obj.is_multicast:
            return False, f"Access to private/reserved IP address '{ip_str}' is prohibited."

        for network in BLOCKED_IP_NETWORKS:
            if ip_obj in network:
                return False, f"Access to IP network '{network}' ({ip_str}) is prohibited."

    return True, "URL is safe"

def assert_url_safe(url: str):
    is_safe, reason = validate_url_safe(url)
    if not is_safe:
        raise SSRFProtectionError(reason)
