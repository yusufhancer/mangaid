import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_explorer_search_mock(monkeypatch):
    class MockResponse:
        def __init__(self, json_data, status_code=200):
            self._json = json_data
            self.status_code = status_code

        def raise_for_status(self):
            pass

        def json(self):
            return self._json

    async def mock_get(self, url, *args, **kwargs):
        return MockResponse({
            "data": [
                {
                    "id": "manga-uuid-1",
                    "attributes": {
                        "title": {"en": "One Piece"},
                        "description": {"en": "Pirates adventure"},
                        "status": "ongoing",
                        "year": 1997,
                        "tags": [
                            {"attributes": {"name": {"en": "Action"}}},
                            {"attributes": {"name": {"en": "Adventure"}}}
                        ]
                    },
                    "relationships": [
                        {
                            "type": "cover_art",
                            "attributes": {"fileName": "cover1.jpg"}
                        }
                    ]
                }
            ]
        })

    import httpx
    monkeypatch.setattr(httpx.AsyncClient, "get", mock_get)

    resp = client.get("/api/explorer/search?q=One Piece")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["id"] == "manga-uuid-1"
    assert data[0]["title"] == "One Piece"
    assert "cover1.jpg" in data[0]["cover_url"]
    assert "Action" in data[0]["tags"]

def test_explorer_chapters_mock(monkeypatch):
    class MockResponse:
        def __init__(self, json_data, status_code=200):
            self._json = json_data
            self.status_code = status_code

        def raise_for_status(self):
            pass

        def json(self):
            return self._json

    async def mock_get(self, url, *args, **kwargs):
        return MockResponse({
            "data": [
                {
                    "id": "chap-uuid-1",
                    "attributes": {
                        "chapter": "1",
                        "title": "Romance Dawn",
                        "pages": 54,
                        "translatedLanguage": "en",
                        "publishAt": "2020-01-01T00:00:00Z"
                    },
                    "relationships": [
                        {
                            "type": "scanlation_group",
                            "attributes": {"name": "Official"}
                        }
                    ]
                }
            ]
        })

    import httpx
    monkeypatch.setattr(httpx.AsyncClient, "get", mock_get)

    resp = client.get("/api/explorer/manga/manga-uuid-1/chapters?lang=en")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["id"] == "chap-uuid-1"
    assert data[0]["chapter_number"] == "1"
    assert data[0]["pages_count"] == 54
    assert data[0]["group_name"] == "Official"
