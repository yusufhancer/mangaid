import json
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Optional

from ..db.session import get_db
from ..db.models import IngestSession, PageCandidate
from ..ingestion.pipeline import IngestionPipeline
from ..ingestion.upload_handler import ManualUploadHandler
from ..ingestion.security import SSRFProtectionError
from ..core.logging import logger

router = APIRouter(prefix="/ingest", tags=["Ingestion"])
pipeline = IngestionPipeline()
upload_handler = ManualUploadHandler()

class IngestRequest(BaseModel):
    url: str

class PageResponse(BaseModel):
    page_number: int
    image_url: str

class IngestResponse(BaseModel):
    session_id: str
    url: str
    title: Optional[str] = None
    chapter_number: Optional[str] = None
    language_hint: Optional[str] = None
    layer_used: str
    confidence: float
    pages_count: int
    pages: List[PageResponse]

@router.post("", response_model=IngestResponse)
async def ingest_chapter(payload: IngestRequest, db: Session = Depends(get_db)):
    url = payload.url.strip()
    if not url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="URL cannot be empty."
        )

    try:
        chapter_data = await pipeline.ingest_url(url)
    except SSRFProtectionError as se:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Security check failed: {str(se)}"
        )
    except Exception as e:
        logger.error("Ingestion failed for %s: %s", url, str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Gagal mengekstrak halaman komik: {str(e)}"
        )

    return _persist_and_respond(chapter_data, url, db)

@router.post("/upload", response_model=IngestResponse)
async def upload_chapter_files(
    files: List[UploadFile] = File(...),
    title: Optional[str] = Form("Uploaded Chapter"),
    db: Session = Depends(get_db)
):
    """
    Layer 4 Manual Upload Fallback:
    Upload multiple images, a ZIP/CBZ archive, or a PDF file.
    """
    if not files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No files uploaded."
        )

    try:
        chapter_data = await upload_handler.handle_files(files, title or "Uploaded Chapter")
    except Exception as e:
        logger.error("Upload handling failed: %s", str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Gagal memproses berkas upload: {str(e)}"
        )

    return _persist_and_respond(chapter_data, "upload://manual", db)

def _persist_and_respond(chapter_data, source_url: str, db: Session) -> IngestResponse:
    session = IngestSession(
        url=source_url,
        title=chapter_data.title,
        chapter_number=chapter_data.chapter_number,
        language_hint=chapter_data.language_hint,
        layer_used=chapter_data.layer_name,
        confidence=chapter_data.confidence,
        headers_json=json.dumps(chapter_data.headers_needed),
    )
    db.add(session)
    db.flush()

    page_responses = []
    for idx, page_url in enumerate(chapter_data.page_image_urls, start=1):
        candidate = PageCandidate(
            session_id=session.id,
            page_number=idx,
            image_url=page_url,
            confidence=chapter_data.confidence,
        )
        db.add(candidate)
        page_responses.append(PageResponse(page_number=idx, image_url=page_url))

    db.commit()
    db.refresh(session)

    return IngestResponse(
        session_id=session.id,
        url=session.url,
        title=session.title,
        chapter_number=session.chapter_number,
        language_hint=session.language_hint,
        layer_used=session.layer_used,
        confidence=session.confidence,
        pages_count=len(page_responses),
        pages=page_responses,
    )
