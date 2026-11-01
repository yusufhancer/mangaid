import pytest
from backend.app.ingestion.adapters.mangadex import MangaDexAdapter

def test_mangadex_can_handle():
    adapter = MangaDexAdapter()
    assert adapter.can_handle("https://mangadex.org/chapter/e9cfaece-daa1-4830-b239-2d09c407b56b")
    assert adapter.can_handle("https://mangadex.org/chapter/e9cfaece-daa1-4830-b239-2d09c407b56b/6")
    assert not adapter.can_handle("https://example.com/chapter/123")
    assert not adapter.can_handle("https://mangadex.org/title/abcd-1234")

def test_mangadex_extract_chapter_id():
    adapter = MangaDexAdapter()
    uuid = "e9cfaece-daa1-4830-b239-2d09c407b56b"
    assert adapter.extract_chapter_id(f"https://mangadex.org/chapter/{uuid}") == uuid
    assert adapter.extract_chapter_id(f"https://mangadex.org/chapter/{uuid}/10") == uuid
    assert adapter.extract_chapter_id("https://mangadex.org/no-uuid-here") is None

@pytest.mark.asyncio
async def test_mangadex_fetch_chapter_mock(monkeypatch):
    adapter = MangaDexAdapter()

    class MockResponse:
        def __init__(self, json_data, status_code=200):
            self._json = json_data
            self.status_code = status_code

        def raise_for_status(self):
            if self.status_code != 200:
                raise Exception("HTTP Error")

        def json(self):
            return self._json

    async def mock_get(client, url, *args, **kwargs):
        if "/chapter/" in str(url):
            return MockResponse({
                "data": {
                    "id": "e9cfaece-daa1-4830-b239-2d09c407b56b",
                    "attributes": {
                        "chapter": "1",
                        "title": "Prologue",
                        "translatedLanguage": "en"
                    }
                }
            })
        elif "/at-home/server/" in str(url):
            return MockResponse({
                "baseUrl": "https://uploads.mangadex.org",
                "chapter": {
                    "hash": "test_hash_123",
                    "data": ["01.png", "02.png", "03.png"]
                }
            })
        return MockResponse({}, status_code=404)

    import httpx
    monkeypatch.setattr(httpx.AsyncClient, "get", mock_get)

    result = await adapter.fetch_chapter("https://mangadex.org/chapter/e9cfaece-daa1-4830-b239-2d09c407b56b")

    assert result.title == "Prologue"
    assert result.chapter_number == "1"
    assert result.language_hint == "en"
    assert len(result.page_image_urls) == 3
    assert result.page_image_urls[0] == "https://uploads.mangadex.org/data/test_hash_123/01.png"
    assert result.layer_name == "layer_0_mangadex"
    assert result.confidence == 1.0
