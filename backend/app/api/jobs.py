import asyncio
import json
import uuid
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..db.session import get_db
from ..db.models import Job, Chapter, IngestSession, PageCandidate
from ..jobs.runner import run_translation_job

router = APIRouter(prefix="/jobs", tags=["Jobs"])

class JobCreateRequest(BaseModel):
    session_id: str
    pages: Optional[List[str]] = None  # User may have reordered/filtered pages in review
    settings: Dict[str, Any] = Field(default_factory=lambda: {"tone": "gaul", "honorifics": "keep"})

class JobResponse(BaseModel):
    job_id: str
    chapter_id: str
    stage: str
    total_pages: int
    completed_pages: int
    current_page: int
    error_message: Optional[str] = None

@router.post("", response_model=JobResponse)
async def create_job(
    payload: JobCreateRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    session = db.query(IngestSession).filter(IngestSession.id == payload.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Ingest session not found.")

    # Determine pages list
    if payload.pages and len(payload.pages) > 0:
        page_urls = payload.pages
    else:
        page_urls = [p.image_url for p in session.pages]

    if not page_urls:
        raise HTTPException(status_code=400, detail="No pages available to translate.")

    device_id = request.headers.get("x-device-id") or getattr(session, "device_id", "default") or "default"

    # Create Chapter
    chapter_id = str(uuid.uuid4())
    chapter = Chapter(
        id=chapter_id,
        title=session.title or "Untitled Manga",
        chapter_number=session.chapter_number or "1",
        language_source=session.language_hint or "ja",
        device_id=device_id
    )
    db.add(chapter)

    # Create Job
    job_id = str(uuid.uuid4())
    job = Job(
        id=job_id,
        chapter_id=chapter_id,
        stage="queued",
        total_pages=len(page_urls),
        completed_pages=0,
        current_page=0,
        settings_json=json.dumps(payload.settings),
        device_id=device_id
    )
    db.add(job)
    db.commit()

    headers = json.loads(session.headers_json) if session.headers_json else {}

    # Launch background runner
    background_tasks.add_task(
        run_translation_job,
        job_id=job_id,
        chapter_id=chapter_id,
        page_urls=page_urls,
        headers=headers,
        settings_dict=payload.settings
    )

    return JobResponse(
        job_id=job.id,
        chapter_id=chapter.id,
        stage=job.stage,
        total_pages=job.total_pages,
        completed_pages=job.completed_pages,
        current_page=job.current_page,
    )

@router.get("/{job_id}", response_model=JobResponse)
def get_job_status(job_id: str, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    return JobResponse(
        job_id=job.id,
        chapter_id=job.chapter_id,
        stage=job.stage,
        total_pages=job.total_pages,
        completed_pages=job.completed_pages,
        current_page=job.current_page,
        error_message=job.error_message
    )
