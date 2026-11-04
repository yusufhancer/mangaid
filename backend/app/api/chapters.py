import io
import os
import re
import shutil
import uuid
from urllib.parse import quote
from pathlib import Path
from typing import List, Optional
import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import FileResponse, Response, RedirectResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
import img2pdf

from ..db.session import get_db
from ..db.models import Chapter, PageRecord, Job
from ..core.config import settings, BASE_DIR
from ..core.logging import logger

router = APIRouter(prefix="/chapters", tags=["Chapters"])

class DirectReadRequest(BaseModel):
    url: str
    title: Optional[str] = None
    chapter_number: Optional[str] = None
    pages: List[str]

class PageItemResponse(BaseModel):
    page_number: int
    original_url: str
    translated_url: Optional[str] = None
    status: str

class ChapterSummaryResponse(BaseModel):
    id: str
    title: Optional[str] = None
    chapter_number: Optional[str] = None
    language_source: str
    total_pages: int
    rendered_pages: int
    created_at: Optional[str] = None

class ChapterDetailResponse(BaseModel):
    id: str
    title: Optional[str] = None
    chapter_number: Optional[str] = None
    language_source: str
    pages: List[PageItemResponse]

class SyncChapterItem(BaseModel):
    id: str
    title: Optional[str] = None
    chapter_number: Optional[str] = None
    language_source: Optional[str] = "id"
    total_pages: Optional[int] = 0
    rendered_pages: Optional[int] = 0
    created_at: Optional[str] = None
    pages: Optional[List[str]] = None

class SyncChaptersRequest(BaseModel):
    chapters: List[SyncChapterItem]

def resolve_stored_path(p_str: Optional[str], chapter_id: str = "", page_num: int = 1, img_type: str = "original") -> Optional[Path]:
    """
    Robust cross-platform path resolver for images and audio across Windows, Linux, and Docker environments.
    """
    if not p_str or p_str.startswith("http"):
        return None
    p = Path(p_str)
    if p.is_absolute() and p.exists():
        return p
    # Relative to project base
    p_from_base = BASE_DIR / p_str
    if p_from_base.exists():
        return p_from_base
    # Relative to data directory
    norm = p_str.replace("\\", "/")
    if "data/chapters/" in norm:
        rel = norm.split("data/chapters/", 1)[1]
        cand = settings.data_path / "chapters" / rel
        if cand.exists():
            return cand
    # Fallback convention: data/chapters/{chapter_id}/{img_type}/page_{page_num:04d}.(jpg|png)
    if chapter_id:
        target_dir = settings.data_path / "chapters" / chapter_id / img_type
        for ext in (".png", ".jpg", ".jpeg", ".webp"):
            cand = target_dir / f"page_{page_num:04d}{ext}"
            if cand.exists():
                return cand
    return None

@router.post("/sync")
def sync_chapters(payload: SyncChaptersRequest, request: Request, db: Session = Depends(get_db)):
    device_id = request.headers.get("x-device-id") or "default"
    restored = 0
    for ch_item in payload.chapters:
        existing = db.query(Chapter).filter(Chapter.id == ch_item.id).first()
        if not existing:
            new_chapter = Chapter(
                id=ch_item.id,
                title=ch_item.title or "Untitled Manga",
                chapter_number=ch_item.chapter_number or "1",
                language_source=ch_item.language_source or "id",
                device_id=device_id
            )
            db.add(new_chapter)

            if ch_item.pages and len(ch_item.pages) > 0:
                for idx, p_url in enumerate(ch_item.pages, start=1):
                    clean_p = p_url if (p_url and p_url.startswith("http")) else ""
                    rec = PageRecord(
                        id=str(uuid.uuid4()),
                        chapter_id=ch_item.id,
                        page_number=idx,
                        original_path=clean_p,
                        translated_path=clean_p,
                        status="rendered"
                    )
                    db.add(rec)
            else:
                total_p = max(1, ch_item.total_pages or 1)
                for idx in range(1, total_p + 1):
                    rec = PageRecord(
                        id=str(uuid.uuid4()),
                        chapter_id=ch_item.id,
                        page_number=idx,
                        original_path="",
                        translated_path="",
                        status="rendered"
                    )
                    db.add(rec)
            restored += 1
        else:
            if len(existing.pages) == 0 and ch_item.pages and len(ch_item.pages) > 0:
                for idx, p_url in enumerate(ch_item.pages, start=1):
                    clean_p = p_url if (p_url and p_url.startswith("http")) else ""
                    rec = PageRecord(
                        id=str(uuid.uuid4()),
                        chapter_id=ch_item.id,
                        page_number=idx,
                        original_path=clean_p,
                        translated_path=clean_p,
                        status="rendered"
                    )
                    db.add(rec)
    db.commit()
    return {"status": "ok", "restored": restored}

@router.post("/direct-read", response_model=ChapterDetailResponse)
def create_direct_read(payload: DirectReadRequest, request: Request, db: Session = Depends(get_db)):
    if not payload.pages:
        raise HTTPException(status_code=400, detail="Daftar halaman tidak boleh kosong.")

    device_id = request.headers.get("x-device-id") or "default"
    chapter_id = str(uuid.uuid4())

    chapter = Chapter(
        id=chapter_id,
        title=payload.title or "Untitled Manga",
        chapter_number=payload.chapter_number or "1",
        language_source="id",
        device_id=device_id
    )
    db.add(chapter)

    page_records = []
    for idx, p_url in enumerate(payload.pages, start=1):
        rec = PageRecord(
            id=str(uuid.uuid4()),
            chapter_id=chapter_id,
            page_number=idx,
            original_path=p_url,
            translated_path=p_url,
            status="rendered"
        )
        db.add(rec)
        page_records.append(rec)

    db.commit()
    db.refresh(chapter)

    return ChapterDetailResponse(
        id=chapter.id,
        title=chapter.title,
        chapter_number=chapter.chapter_number,
        language_source=chapter.language_source,
        pages=[
            PageItemResponse(
                page_number=p.page_number,
                original_url=f"/api/chapters/{chapter_id}/pages/{p.page_number}/original",
                translated_url=f"/api/chapters/{chapter_id}/pages/{p.page_number}/translated",
                status=p.status
            )
            for p in page_records
        ]
    )

@router.get("", response_model=List[ChapterSummaryResponse])
def list_chapters(request: Request, db: Session = Depends(get_db)):
    try:
        device_id = request.headers.get("x-device-id") or "default"
        query = db.query(Chapter)
        if device_id == "default":
            query = query.filter((Chapter.device_id == "default") | (Chapter.device_id.is_(None)))
        else:
            query = query.filter(
                (Chapter.device_id == device_id) |
                (Chapter.device_id == "default") |
                (Chapter.device_id.is_(None))
            )
        chapters = query.all()
        def sort_key(ch):
            if ch.created_at:
                return str(ch.created_at)
            return ""
        chapters.sort(key=sort_key, reverse=True)

        res = []
        for c in chapters:
            pages_map = {}
            for p in c.pages:
                if p.page_number not in pages_map or p.status == "rendered":
                    pages_map[p.page_number] = p
            rendered = sum(
                1 for p in pages_map.values()
                if p.status == "rendered" and (
                    (p.translated_path and (os.path.exists(p.translated_path) or resolve_stored_path(p.translated_path, c.id, p.page_number, "translated") is not None))
                    or (p.original_path and p.original_path.startswith("http"))
                    or (p.translated_path and p.translated_path.startswith("http"))
                    or (not p.original_path and not p.translated_path)
                    or p.regions_json
                )
            )
            total_p = len(pages_map)
            created_str = None
            if c.created_at:
                try:
                    created_str = c.created_at.isoformat() if hasattr(c.created_at, "isoformat") else str(c.created_at)
                except Exception:
                    created_str = str(c.created_at)

            res.append(ChapterSummaryResponse(
                id=c.id,
                title=c.title,
                chapter_number=c.chapter_number,
                language_source=c.language_source or "en",
                total_pages=total_p if total_p > 0 else 1,
                rendered_pages=rendered if total_p > 0 else 1,
                created_at=created_str
            ))
        return res
    except Exception as e:
        import traceback
        err_msg = f"list_chapters error: {e}\n{traceback.format_exc()}"
        logger.error(err_msg)
        raise HTTPException(status_code=500, detail=err_msg)

class ChapterUpdateRequest(BaseModel):
    title: Optional[str] = None
    chapter_number: Optional[str] = None

class SeriesRenameRequest(BaseModel):
    old_title: str
    new_title: str

class SeriesDeleteRequest(BaseModel):
    series_title: str

@router.patch("/series/rename")
def rename_series(payload: SeriesRenameRequest, request: Request, db: Session = Depends(get_db)):
    new_title_clean = payload.new_title.strip()
    if not new_title_clean:
        raise HTTPException(status_code=400, detail="New title cannot be empty.")

    device_id = request.headers.get("x-device-id") or "default"
    query = db.query(Chapter).filter(Chapter.title == payload.old_title)
    if device_id == "default":
        query = query.filter((Chapter.device_id == "default") | (Chapter.device_id.is_(None)))
    else:
        query = query.filter(Chapter.device_id == device_id)
    chapters = query.all()
    if not chapters:
        query = db.query(Chapter).filter(Chapter.title.ilike(payload.old_title))
        if device_id == "default":
            query = query.filter((Chapter.device_id == "default") | (Chapter.device_id.is_(None)))
        else:
            query = query.filter(Chapter.device_id == device_id)
        chapters = query.all()

    for c in chapters:
        c.title = new_title_clean

    db.commit()
    return {
        "message": f"Updated {len(chapters)} chapters in series.",
        "old_title": payload.old_title,
        "new_title": new_title_clean,
        "updated_count": len(chapters)
    }

@router.post("/series/delete")
def delete_series(payload: SeriesDeleteRequest, request: Request, db: Session = Depends(get_db)):
    device_id = request.headers.get("x-device-id") or "default"
    query = db.query(Chapter).filter(Chapter.title == payload.series_title)
    if device_id == "default":
        query = query.filter((Chapter.device_id == "default") | (Chapter.device_id.is_(None)))
    else:
        query = query.filter(Chapter.device_id == device_id)
    chapters = query.all()
    if not chapters:
        query = db.query(Chapter).filter(Chapter.title.ilike(payload.series_title))
        if device_id == "default":
            query = query.filter((Chapter.device_id == "default") | (Chapter.device_id.is_(None)))
        else:
            query = query.filter(Chapter.device_id == device_id)
        chapters = query.all()

    if not chapters:
        raise HTTPException(status_code=404, detail="Series not found.")

    count = 0
    for chapter in chapters:
        chapter_dir = settings.data_path / "chapters" / chapter.id
        if chapter_dir.exists():
            shutil.rmtree(chapter_dir, ignore_errors=True)
        db.query(Job).filter(Job.chapter_id == chapter.id).delete()
        db.delete(chapter)
        count += 1

    db.commit()
    return {"message": f"Deleted {count} chapters in series '{payload.series_title}'."}

@router.get("/{chapter_id}", response_model=ChapterDetailResponse)
def get_chapter_detail(chapter_id: str, db: Session = Depends(get_db)):
    try:
        chapter = db.query(Chapter).filter(Chapter.id == chapter_id).first()
        if not chapter:
            raise HTTPException(status_code=404, detail="Chapter not found.")

        pages_map = {}
        for p in chapter.pages:
            if p.page_number not in pages_map or p.status == "rendered":
                pages_map[p.page_number] = p

        pages_resp = []
        for p_num in sorted(pages_map.keys()):
            p = pages_map[p_num]
            has_trans = bool(
                (p.translated_path and (os.path.exists(p.translated_path) or resolve_stored_path(p.translated_path, chapter_id, p.page_number, "translated") is not None))
                or (p.translated_path and p.translated_path.startswith("http"))
                or (p.status == "rendered")
            )
            pages_resp.append(PageItemResponse(
                page_number=p.page_number,
                original_url=f"/api/chapters/{chapter_id}/pages/{p.page_number}/original",
                translated_url=f"/api/chapters/{chapter_id}/pages/{p.page_number}/translated" if has_trans else None,
                status=p.status
            ))

        return ChapterDetailResponse(
            id=chapter.id,
            title=chapter.title,
            chapter_number=chapter.chapter_number,
            language_source=chapter.language_source or "en",
            pages=pages_resp
        )
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        err_msg = f"get_chapter_detail error: {e}\n{traceback.format_exc()}"
        logger.error(err_msg)
        raise HTTPException(status_code=500, detail=err_msg)

def _recover_mangadex_chapter_urls(title: str, ch_num: Optional[str]) -> List[str]:
    headers = {
        "User-Agent": "MangaID/1.0 (https://github.com/mangaid-app)",
        "Accept": "application/json"
    }
    try:
        clean_title = re.sub(r"[\(\)\[\]\-_]", " ", title).strip()
        words = [w for w in clean_title.split() if len(w) > 2]
        query_title = " ".join(words[:4]) if words else title
        with httpx.Client(timeout=10.0, headers=headers) as client:
            m_res = client.get("https://api.mangadex.org/manga", params={"title": query_title, "limit": 1}).json()
            if not m_res.get("data"):
                m_res = client.get("https://api.mangadex.org/manga", params={"title": title[:30], "limit": 1}).json()
            if not m_res.get("data"):
                return []
            manga_id = m_res["data"][0]["id"]
            feed_params = {"order[chapter]": "asc", "limit": 100}
            feed_res = client.get(f"https://api.mangadex.org/manga/{manga_id}/feed", params=feed_params).json()
            data = feed_res.get("data", [])
            target_ch = None
            if ch_num:
                target_ch = next((c for c in data if c.get("attributes", {}).get("chapter") == ch_num), None)
            if not target_ch and data:
                target_ch = data[0]
            if not target_ch:
                return []
            ch_id = target_ch["id"]
            athome_res = client.get(f"https://api.mangadex.org/at-home/server/{ch_id}").json()
            base_url = athome_res.get("baseUrl")
            ch_hash = athome_res.get("chapter", {}).get("hash")
            files = athome_res.get("chapter", {}).get("data", [])
            if base_url and ch_hash and files:
                return [f"{base_url}/data/{ch_hash}/{fn}" for fn in files]
    except Exception as e:
        logger.warning("Failed to auto-recover MangaDex URLs for %s (%s): %s", title, ch_num, e)
    return []

@router.get("/{chapter_id}/pages/{page_num}/original")
def get_original_page_image(
    chapter_id: str,
    page_num: int,
    request: Request,
    db: Session = Depends(get_db)
):
    record = db.query(PageRecord).filter(
        PageRecord.chapter_id == chapter_id,
        PageRecord.page_number == page_num
    ).first()
    if record and record.original_path and not record.original_path.startswith("/api/"):
        if record.original_path.startswith("http"):
            return RedirectResponse(f"/api/proxy/image?url={quote(record.original_path, safe='')}")
        resolved = resolve_stored_path(record.original_path, chapter_id, page_num, "original")
        if resolved and resolved.exists():
            ext = resolved.suffix.lower()
            media_type = "image/png" if ext == ".png" else "image/jpeg"
            return FileResponse(str(resolved), media_type=media_type)

    orig_dir = settings.data_path / "chapters" / chapter_id / "original"
    jpg_path = orig_dir / f"page_{page_num:04d}.jpg"
    png_path = orig_dir / f"page_{page_num:04d}.png"
    if jpg_path.exists():
        return FileResponse(str(jpg_path), media_type="image/jpeg")
    if png_path.exists():
        return FileResponse(str(png_path), media_type="image/png")

    # AUTO-HEAL: Recover from MangaDex online by chapter title & number
    chapter = db.query(Chapter).filter(Chapter.id == chapter_id).first()
    title = (chapter.title if chapter else None) or request.query_params.get("title")
    ch_num = (chapter.chapter_number if chapter else None) or request.query_params.get("ch") or "1"

    if title:
        recovered_urls = _recover_mangadex_chapter_urls(title, ch_num)
        if recovered_urls:
            if not chapter:
                chapter = Chapter(
                    id=chapter_id,
                    title=title,
                    chapter_number=ch_num,
                    language_source="id",
                    device_id="default"
                )
                db.add(chapter)
                db.commit()

            all_records = db.query(PageRecord).filter(PageRecord.chapter_id == chapter_id).order_by(PageRecord.page_number).all()
            if not all_records:
                for idx, u in enumerate(recovered_urls, start=1):
                    rec = PageRecord(
                        id=str(uuid.uuid4()),
                        chapter_id=chapter_id,
                        page_number=idx,
                        original_path=u,
                        translated_path=u,
                        status="rendered"
                    )
                    db.add(rec)
            else:
                for idx, rec in enumerate(all_records):
                    if idx < len(recovered_urls):
                        rec.original_path = recovered_urls[idx]
                        if not rec.translated_path or not rec.translated_path.startswith("http"):
                            rec.translated_path = recovered_urls[idx]
            db.commit()
            if 1 <= page_num <= len(recovered_urls):
                return RedirectResponse(f"/api/proxy/image?url={quote(recovered_urls[page_num - 1], safe='')}")

    raise HTTPException(status_code=404, detail="Original image not found.")

@router.get("/{chapter_id}/pages/{page_num}/translated")
def get_translated_page_image(
    chapter_id: str,
    page_num: int,
    request: Request,
    db: Session = Depends(get_db)
):
    record = db.query(PageRecord).filter(
        PageRecord.chapter_id == chapter_id,
        PageRecord.page_number == page_num
    ).first()
    if record and record.translated_path and not record.translated_path.startswith("/api/"):
        if record.translated_path.startswith("http"):
            return RedirectResponse(f"/api/proxy/image?url={quote(record.translated_path, safe='')}")
        resolved = resolve_stored_path(record.translated_path, chapter_id, page_num, "translated")
        if resolved and resolved.exists():
            ext = resolved.suffix.lower()
            media_type = "image/jpeg" if ext in (".jpg", ".jpeg", ".webp") else "image/png"
            return FileResponse(str(resolved), media_type=media_type)

    trans_dir = settings.data_path / "chapters" / chapter_id / "translated"
    png_path = trans_dir / f"page_{page_num:04d}.png"
    jpg_path = trans_dir / f"page_{page_num:04d}.jpg"
    if png_path.exists():
        return FileResponse(str(png_path), media_type="image/png")
    if jpg_path.exists():
        return FileResponse(str(jpg_path), media_type="image/jpeg")

    # Fallback to original image if translated image does not exist yet
    return get_original_page_image(chapter_id, page_num, request, db)

@router.get("/local-file/{session_id}/{filename}")
def get_uploaded_file(session_id: str, filename: str):
    file_path = settings.data_path / "uploads" / session_id / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Uploaded file not found.")
    return FileResponse(file_path)

@router.get("/{chapter_id}/pdf")
def export_chapter_pdf(chapter_id: str, db: Session = Depends(get_db)):
    """
    FR-7 PDF Export: Merges translated pages into a single PDF download.
    """
    chapter = db.query(Chapter).filter(Chapter.id == chapter_id).first()
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found.")

    image_paths = []
    for p in chapter.pages:
        path_to_use = p.translated_path if (p.translated_path and os.path.exists(p.translated_path)) else p.original_path
        if path_to_use and os.path.exists(path_to_use):
            image_paths.append(path_to_use)

    if not image_paths:
        raise HTTPException(status_code=400, detail="No pages available to generate PDF.")

    try:
        pdf_bytes = img2pdf.convert(image_paths)
    except Exception as e:
        logger.error("Failed to generate PDF for chapter %s: %s", chapter_id, e)
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {e}")

    safe_title = "".join(c for c in (chapter.title or "Manga") if c.isalnum() or c in (" ", "_", "-")).strip()
    filename = f"{safe_title}_ch{chapter.chapter_number or '1'}_ID.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

@router.delete("/{chapter_id}")
def delete_chapter(chapter_id: str, request: Request, db: Session = Depends(get_db)):
    chapter = db.query(Chapter).filter(Chapter.id == chapter_id).first()
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found.")

    device_id = request.headers.get("x-device-id") or "default"
    if device_id != "default" and chapter.device_id and chapter.device_id != "default" and chapter.device_id != device_id:
        raise HTTPException(status_code=403, detail="Tidak memiliki akses untuk menghapus bab ini.")

    # Remove files from disk
    chapter_dir = settings.data_path / "chapters" / chapter_id
    if chapter_dir.exists():
        shutil.rmtree(chapter_dir, ignore_errors=True)

    db.query(Job).filter(Job.chapter_id == chapter_id).delete()
    db.delete(chapter)
    db.commit()
    return {"message": "Chapter deleted successfully."}

@router.patch("/{chapter_id}")
def update_chapter(chapter_id: str, payload: ChapterUpdateRequest, request: Request, db: Session = Depends(get_db)):
    chapter = db.query(Chapter).filter(Chapter.id == chapter_id).first()
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found.")

    device_id = request.headers.get("x-device-id") or "default"
    if device_id != "default" and chapter.device_id and chapter.device_id != "default" and chapter.device_id != device_id:
        raise HTTPException(status_code=403, detail="Tidak memiliki akses untuk mengubah bab ini.")

    if payload.title is not None and payload.title.strip():
        chapter.title = payload.title.strip()
    if payload.chapter_number is not None and payload.chapter_number.strip():
        chapter.chapter_number = payload.chapter_number.strip()

    db.commit()
    db.refresh(chapter)
    return {
        "message": "Chapter updated successfully.",
        "id": chapter.id,
        "title": chapter.title,
        "chapter_number": chapter.chapter_number
    }

# ==============================================================================
# AI VOICE NARRATION (TTS) ENDPOINTS
# ==============================================================================

@router.get("/{chapter_id}/pages/{page_num}/dialogues")
def get_page_speech_dialogues(chapter_id: str, page_num: int, db: Session = Depends(get_db)):
    """
    Returns ordered speech bubbles and narration texts for a given manga page.
    """
    chapter = db.query(Chapter).filter(Chapter.id == chapter_id).first()
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found.")

    from ..ai.tts import get_page_dialogues
    dialogues = get_page_dialogues(chapter_id, page_num, db)
    return {
        "chapter_id": chapter_id,
        "page_number": page_num,
        "count": len(dialogues),
        "dialogues": dialogues
    }

@router.get("/{chapter_id}/pages/{page_num}/audio")
async def get_page_narration_audio(
    chapter_id: str,
    page_num: int,
    voice: str = "auto",
    db: Session = Depends(get_db)
):
    """
    Streams neural AI voice narration (MP3) for an entire manga page.
    """
    chapter = db.query(Chapter).filter(Chapter.id == chapter_id).first()
    if not chapter:
        chapter = Chapter(
            id=chapter_id,
            title="Manga",
            chapter_number="1",
            language_source="id",
            device_id="default"
        )
        db.add(chapter)
        db.commit()

    from ..ai.tts import get_or_generate_page_audio
    audio_path = await get_or_generate_page_audio(chapter_id, page_num, voice_key=voice, db=db)
    if not audio_path or not audio_path.exists():
        raise HTTPException(status_code=404, detail="Tidak ada dialog yang dapat dibacakan pada halaman ini.")

    media_type = "audio/wav" if Path(audio_path).suffix.lower() == ".wav" else "audio/mpeg"
    return FileResponse(
        str(audio_path),
        media_type=media_type,
        headers={"Cache-Control": "no-cache, must-revalidate"}
    )

@router.get("/{chapter_id}/tts/bubble")
async def get_single_bubble_audio(
    chapter_id: str,
    text: str,
    voice: str = "auto"
):
    """
    Instant tap-to-speak synthesis for a single dialogue bubble.
    """
    clean_text = text.strip()
    if not clean_text:
        raise HTTPException(status_code=400, detail="Text cannot be empty.")

    from ..ai.tts import synthesize_single_bubble
    audio_bytes = await synthesize_single_bubble(clean_text, voice_key=voice)
    if not audio_bytes:
        raise HTTPException(status_code=500, detail="Failed to synthesize speech.")

    media_type = "audio/wav" if audio_bytes.startswith(b"RIFF") else "audio/mpeg"
    return Response(
        content=audio_bytes,
        media_type=media_type,
        headers={"Cache-Control": "public, max-age=86400"}
    )


