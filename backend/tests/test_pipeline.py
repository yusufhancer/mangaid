import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.ingestion.pipeline import IngestionPipeline
from backend.app.ingestion.base import ChapterData

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["app"] == "MangaID"

def test_ingest_endpoint_ssrf_blocked():
    response = client.post("/api/ingest", json={"url": "http://127.0.0.1:8000/secret"})
    assert response.status_code == 400
    assert "Security check failed" in response.json()["detail"]

@pytest.mark.asyncio
async def test_pipeline_with_mock(monkeypatch):
    pipeline = IngestionPipeline()

    async def mock_fetch(url):
        return ChapterData(
            title="Test Manga",
            chapter_number="1",
            page_image_urls=["https://test.com/1.jpg", "https://test.com/2.jpg"],
            layer_name="layer_1_static",
            confidence=0.9
        )

    # Mock the adapter fetch
    for adapter in pipeline.adapters:
        monkeypatch.setattr(adapter, "fetch_chapter", mock_fetch)

    result = await pipeline.ingest_url("https://example.com/chapter-1")
    assert result.title == "Test Manga"
    assert len(result.page_image_urls) == 2
