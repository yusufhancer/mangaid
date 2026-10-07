import io
import os
import shutil
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel
from sqlalchemy.orm import Session
import img2pdf

from ..db.session import get_db
from ..db.models import Chapter, PageRecord, Job
from ..core.config import settings
from ..core.logging import logger

router = APIRouter(prefix="/chapters", tags=["Chapters"])

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

@router.get("", response_model=List[ChapterSummaryResponse])
def list_chapters(db: Session = Depends(get_db)):
    chapters = db.query(Chapter).order_by(Chapter.created_at.desc()).all()
    res = []
    for c in chapters:
        pages_map = {}
        for p in c.pages:
            if p.page_number not in pages_map or p.status == "rendered":
                pages_map[p.page_number] = p
        rendered = sum(1 for p in pages_map.values() if p.status == "rendered" and p.translated_path and os.path.exists(p.translated_path))
        res.append(ChapterSummaryResponse(
            id=c.id,
            title=c.title,
            chapter_number=c.chapter_number,
            language_source=c.language_source,
            total_pages=len(pages_map),
            rendered_pages=rendered,
            created_at=c.created_at.isoformat() if c.created_at else None
        ))
    return res

class ChapterUpdateRequest(BaseModel):
    title: Optional[str] = None
    chapter_number: Optional[str] = None

class SeriesRenameRequest(BaseModel):
    old_title: str
    new_title: str

class SeriesDeleteRequest(BaseModel):
    series_title: str

@router.patch("/series/rename")
def rename_series(payload: SeriesRenameRequest, db: Session = Depends(get_db)):
    new_title_clean = payload.new_title.strip()
    if not new_title_clean:
        raise HTTPException(status_code=400, detail="New title cannot be empty.")

    chapters = db.query(Chapter).filter(Chapter.title == payload.old_title).all()
    if not chapters:
        chapters = db.query(Chapter).filter(Chapter.title.ilike(payload.old_title)).all()

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
def delete_series(payload: SeriesDeleteRequest, db: Session = Depends(get_db)):
    chapters = db.query(Chapter).filter(Chapter.title == payload.series_title).all()
    if not chapters:
        chapters = db.query(Chapter).filter(Chapter.title.ilike(payload.series_title)).all()

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
        has_trans = bool(p.translated_path and os.path.exists(p.translated_path) and p.status == "rendered")
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
        language_source=chapter.language_source,
        pages=pages_resp
    )

@router.get("/{chapter_id}/pages/{page_num}/original")
def get_original_page_image(chapter_id: str, page_num: int, db: Session = Depends(get_db)):
    orig_dir = settings.data_path / "chapters" / chapter_id / "original"
    jpg_path = orig_dir / f"page_{page_num:04d}.jpg"
    png_path = orig_dir / f"page_{page_num:04d}.png"
    if jpg_path.exists():
        return FileResponse(str(jpg_path), media_type="image/jpeg")
    if png_path.exists():
        return FileResponse(str(png_path), media_type="image/png")

    record = db.query(PageRecord).filter(
        PageRecord.chapter_id == chapter_id,
        PageRecord.page_number == page_num
    ).first()
    if not record or not record.original_path or not os.path.exists(record.original_path):
        raise HTTPException(status_code=404, detail="Original image not found.")

    ext = Path(record.original_path).suffix.lower()
    media_type = "image/png" if ext == ".png" else "image/jpeg"
    return FileResponse(record.original_path, media_type=media_type)

@router.get("/{chapter_id}/pages/{page_num}/translated")
def get_translated_page_image(chapter_id: str, page_num: int, db: Session = Depends(get_db)):
    trans_dir = settings.data_path / "chapters" / chapter_id / "translated"
    png_path = trans_dir / f"page_{page_num:04d}.png"
    jpg_path = trans_dir / f"page_{page_num:04d}.jpg"
    if png_path.exists():
        return FileResponse(str(png_path), media_type="image/png")
    if jpg_path.exists():
        return FileResponse(str(jpg_path), media_type="image/jpeg")

    record = db.query(PageRecord).filter(
        PageRecord.chapter_id == chapter_id,
        PageRecord.page_number == page_num
    ).first()
    if not record or not record.translated_path or not os.path.exists(record.translated_path):
        raise HTTPException(status_code=404, detail="Translated image not found.")

    ext = Path(record.translated_path).suffix.lower()
    media_type = "image/jpeg" if ext in (".jpg", ".jpeg") else "image/png"
    return FileResponse(record.translated_path, media_type=media_type)

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
def delete_chapter(chapter_id: str, db: Session = Depends(get_db)):
    chapter = db.query(Chapter).filter(Chapter.id == chapter_id).first()
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found.")

    # Remove files from disk
    chapter_dir = settings.data_path / "chapters" / chapter_id
    if chapter_dir.exists():
        shutil.rmtree(chapter_dir, ignore_errors=True)

    db.query(Job).filter(Job.chapter_id == chapter_id).delete()
    db.delete(chapter)
    db.commit()
    return {"message": "Chapter deleted successfully."}

@router.patch("/{chapter_id}")
def update_chapter(chapter_id: str, payload: ChapterUpdateRequest, db: Session = Depends(get_db)):
    chapter = db.query(Chapter).filter(Chapter.id == chapter_id).first()
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found.")

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

