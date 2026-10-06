import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from .session import Base

class IngestSession(Base):
    __tablename__ = "ingest_sessions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    url = Column(Text, nullable=False)
    title = Column(String(255), nullable=True)
    chapter_number = Column(String(50), nullable=True)
    language_hint = Column(String(10), nullable=True)
    layer_used = Column(String(50), nullable=False)
    confidence = Column(Float, default=1.0)
    headers_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    pages = relationship("PageCandidate", back_populates="session", cascade="all, delete-orphan", order_by="PageCandidate.page_number")

class PageCandidate(Base):
    __tablename__ = "page_candidates"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String(36), ForeignKey("ingest_sessions.id", ondelete="CASCADE"), nullable=False)
    page_number = Column(Integer, nullable=False)
    image_url = Column(Text, nullable=False)
    confidence = Column(Float, default=1.0)
    extra_info = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("IngestSession", back_populates="pages")

class Job(Base):
    __tablename__ = "jobs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    chapter_id = Column(String(36), nullable=False)
    stage = Column(String(50), default="queued")  # queued, analyzing, translating, rendering, done, failed
    total_pages = Column(Integer, default=0)
    completed_pages = Column(Integer, default=0)
    current_page = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
    settings_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Chapter(Base):
    __tablename__ = "chapters"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(255), nullable=True)
    chapter_number = Column(String(50), nullable=True)
    language_source = Column(String(10), default="ja")
    created_at = Column(DateTime, default=datetime.utcnow)

    pages = relationship("PageRecord", back_populates="chapter", cascade="all, delete-orphan", order_by="PageRecord.page_number")

class PageRecord(Base):
    __tablename__ = "page_records"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    chapter_id = Column(String(36), ForeignKey("chapters.id", ondelete="CASCADE"), nullable=False)
    page_number = Column(Integer, nullable=False)
    original_path = Column(String(512), nullable=True)
    translated_path = Column(String(512), nullable=True)
    regions_json = Column(Text, nullable=True)
    status = Column(String(30), default="pending")  # pending, analyzed, rendered, failed
    created_at = Column(DateTime, default=datetime.utcnow)

    chapter = relationship("Chapter", back_populates="pages")
