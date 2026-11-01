import pytest
from backend.app.ingestion.security import validate_url_safe, assert_url_safe, SSRFProtectionError

def test_reject_unsupported_protocols():
    for url in ["file:///etc/passwd", "ftp://example.com/img.png", "gopher://bad.com", "javascript:alert(1)"]:
        is_safe, msg = validate_url_safe(url)
        assert not is_safe
        with pytest.raises(SSRFProtectionError):
            assert_url_safe(url)

def test_reject_localhost():
    for url in ["http://localhost:8000/api", "http://127.0.0.1/test", "http://[::1]/secret"]:
        is_safe, msg = validate_url_safe(url)
        assert not is_safe
        with pytest.raises(SSRFProtectionError):
            assert_url_safe(url)

def test_reject_private_and_cloud_metadata_ips():
    for url in [
        "http://10.0.0.5/page",
        "http://192.168.1.1/router",
        "http://172.16.0.1/admin",
        "http://169.254.169.254/latest/meta-data/",
    ]:
        is_safe, msg = validate_url_safe(url)
        assert not is_safe
        with pytest.raises(SSRFProtectionError):
            assert_url_safe(url)

def test_allow_safe_public_urls():
    for url in ["https://mangadex.org/chapter/123", "https://google.com"]:
        is_safe, msg = validate_url_safe(url)
        assert is_safe
