import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_proxy_image_empty_url():
    response = client.get("/api/proxy/image?url=")
    assert response.status_code == 400

def test_proxy_image_invalid_url():
    response = client.get("/api/proxy/image?url=not-a-url")
    assert response.status_code == 400

def test_proxy_image_ssrf_blocked():
    response = client.get("/api/proxy/image?url=http://127.0.0.1:8000/secret")
    assert response.status_code == 400

def test_proxy_image_valid_request():
    target_url = "https://uploads.mangadex.org/covers/6670ee28-f26d-4b61-b49c-d71149cd5a6e/13d41432-d7ec-41cd-a265-5af700989aa6.jpg.256.jpg"
    response = client.get(f"/api/proxy/image?url={target_url}")
    assert response.status_code == 200
    assert response.headers.get("content-type") == "image/jpeg"
    # Ensure real cover is returned, not the 59480-byte anti-hotlink placeholder
    assert len(response.content) == 48781
