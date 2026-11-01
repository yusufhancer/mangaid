from typing import List
from .base import SourceAdapter, ChapterData
from .adapters.mangadex import MangaDexAdapter
from .static_extractor import GenericStaticExtractor
from .headless_extractor import HeadlessBrowserExtractor
from .ai_extractor import GeminiAssistedExtractor
from .security import assert_url_safe
from ..core.logging import logger

class IngestionPipeline:
    """
    Layered ingestion orchestrator:
    - Layer 0: Known site adapters (MangaDex)
    - Layer 1: Generic static extractor (httpx + BeautifulSoup)
    - Layer 2: Headless browser extractor (Playwright)
    - Layer 3: Gemini-assisted extractor (AI resolver)
    - Layer 4: Manual upload handler (via API endpoint)
    """

    def __init__(self):
        self.adapters: List[SourceAdapter] = [
            MangaDexAdapter(),
            GenericStaticExtractor(),
            HeadlessBrowserExtractor(),
            GeminiAssistedExtractor(),
        ]

    async def ingest_url(self, url: str) -> ChapterData:
        assert_url_safe(url)

        last_error = None

        for adapter in self.adapters:
            if adapter.can_handle(url):
                adapter_name = adapter.__class__.__name__
                logger.info("Attempting ingestion with: %s", adapter_name)
                try:
                    chapter_data = await adapter.fetch_chapter(url)
                    if chapter_data.page_image_urls and len(chapter_data.page_image_urls) > 0:
                        logger.info(
                            "Success with %s! Extracted %d pages (layer: %s, confidence: %.2f)",
                            adapter_name,
                            len(chapter_data.page_image_urls),
                            chapter_data.layer_name,
                            chapter_data.confidence,
                        )
                        return chapter_data
                    else:
                        logger.warning("%s returned 0 pages. Cascading to next layer...", adapter_name)
                except Exception as e:
                    logger.warning("%s failed: %s. Cascading to next layer...", adapter_name, str(e))
                    last_error = e

        if last_error:
            raise RuntimeError(f"Ingestion failed across all layers: {last_error}")
        raise ValueError(f"Could not extract pages from URL: {url}")
