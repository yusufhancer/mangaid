import pytest
import uuid
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.db.session import SessionLocal
from backend.app.db.models import Chapter

client = TestClient(app)

def test_device_isolation():
    db = SessionLocal()
    alice_id = f"test-alice-{uuid.uuid4().hex[:6]}"
    bob_id = f"test-bob-{uuid.uuid4().hex[:6]}"

    # 1. Create a chapter for Alice
    alice_chapter = Chapter(
        id=str(uuid.uuid4()),
        title="Alice Secret Manga",
        chapter_number="1",
        language_source="ja",
        device_id=alice_id
    )
    db.add(alice_chapter)
    db.commit()

    try:
        # 2. Bob queries his chapters
        bob_resp = client.get("/api/chapters", headers={"X-Device-Id": bob_id})
        assert bob_resp.status_code == 200
        bob_chapters = bob_resp.json()
        assert not any(c["id"] == alice_chapter.id for c in bob_chapters), "Bob should NOT see Alice's chapter!"

        # 3. Alice queries her chapters
        alice_resp = client.get("/api/chapters", headers={"X-Device-Id": alice_id})
        assert alice_resp.status_code == 200
        alice_chapters = alice_resp.json()
        assert any(c["id"] == alice_chapter.id for c in alice_chapters), "Alice MUST see her own chapter!"

        # 4. Bob attempts to delete Alice's chapter
        bob_del_resp = client.delete(f"/api/chapters/{alice_chapter.id}", headers={"X-Device-Id": bob_id})
        assert bob_del_resp.status_code == 403, "Bob cannot delete Alice's chapter!"

        # 5. Alice deletes her own chapter
        alice_del_resp = client.delete(f"/api/chapters/{alice_chapter.id}", headers={"X-Device-Id": alice_id})
        assert alice_del_resp.status_code == 200, "Alice can delete her own chapter!"

    finally:
        # Cleanup
        db.query(Chapter).filter(Chapter.id == alice_chapter.id).delete()
        db.commit()
        db.close()
