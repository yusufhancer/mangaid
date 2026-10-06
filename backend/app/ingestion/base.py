from abc import ABC, abstractmethod
from typing import List, Optional, Dict
from pydantic import BaseModel, Field

class PageItem(BaseModel):
    page_number: int
    image_url: str
    confidence: float = 1.0
    extra: Dict[str, str] = Field(default_factory=dict)

class ChapterData(BaseModel):
    title: Optional[str] = None
    chapter_number: Optional[str] = None
    language_hint: Optional[str] = None
    page_image_urls: List[str]
    headers_needed: Dict[str, str] = Field(default_factory=dict)
    layer_name: str = "unknown"
    confidence: float = 1.0

class SourceAdapter(ABC):
    """Abstract interface for dedicated site adapters (Layer 0) and generic extractors (Layer 1+)."""

    @abstractmethod
    def can_handle(self, url: str) -> bool:
        """Return True if this adapter can handle the given URL."""
        pass

    @abstractmethod
    async def fetch_chapter(self, url: str) -> ChapterData:
        """Fetch and extract chapter page images and metadata."""
        pass
