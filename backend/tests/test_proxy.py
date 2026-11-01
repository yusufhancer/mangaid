import pytest
from unittest.mock import AsyncMock, patch
import httpx
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
    mock_resp = httpx.Response(200, content=b"fake-manga-cover-bytes", headers={"content-type": "image/jpeg"})
    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_resp
        target_url = "https://uploads.mangadex.org/covers/6670ee28-f26d-4b61-b49c-d71149cd5a6e/13d41432-d7ec-41cd-a265-5af700989aa6.jpg.256.jpg"
        response = client.get(f"/api/proxy/image?url={target_url}")
        assert response.status_code == 200
        assert response.headers.get("content-type") == "image/jpeg"
        assert response.content == b"fake-manga-cover-bytes"
