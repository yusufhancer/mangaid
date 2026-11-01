import re
import httpx
from typing import Optional
from urllib.parse import urlparse
from ..base import SourceAdapter, ChapterData
from ...core.logging import logger

UUID_PATTERN = re.compile(
    r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}",
    re.IGNORECASE
)

class MangaDexAdapter(SourceAdapter):
    """
    Layer 0 Adapter for MangaDex using its official public REST API.
    URL format: https://mangadex.org/chapter/{uuid}
    """

    BASE_API_URL = "https://api.mangadex.org"

    def can_handle(self, url: str) -> bool:
        parsed = urlparse(url)
        return "mangadex.org" in parsed.netloc.lower() and "/chapter/" in parsed.path.lower()

    def extract_chapter_id(self, url: str) -> Optional[str]:
        match = UUID_PATTERN.search(url)
        if match:
            return match.group(0)
        return None

    async def fetch_chapter(self, url: str) -> ChapterData:
        chapter_id = self.extract_chapter_id(url)
        if not chapter_id:
            raise ValueError(f"Could not extract MangaDex chapter UUID from URL: {url}")

        headers = {
            "User-Agent": "MangaID/1.0 (https://github.com/mangaid-app)",
            "Accept": "application/json"
        }

        async with httpx.AsyncClient(timeout=30.0, headers=headers) as client:
            # 1. Fetch chapter metadata with includes[]=manga for real series title
            meta_resp = await client.get(f"{self.BASE_API_URL}/chapter/{chapter_id}?includes[]=manga")
            meta_resp.raise_for_status()
            raw_meta = meta_resp.json().get("data", {})
            attr = raw_meta.get("attributes", {})
            
            chapter_number = attr.get("chapter") or "1"
            chapter_title = attr.get("title")
            language_hint = attr.get("translatedLanguage")

            # Extract actual manga series title from relationships
            manga_title = None
            for rel in raw_meta.get("relationships", []):
                if rel.get("type") == "manga":
                    m_attr = rel.get("attributes", {})
                    t_dict = m_attr.get("title", {})
                    if isinstance(t_dict, dict) and t_dict:
                        manga_title = t_dict.get("en") or t_dict.get("ja-ro") or next(iter(t_dict.values()), None)
                    if not manga_title and isinstance(m_attr.get("altTitles"), list):
                        for alt in m_attr.get("altTitles", []):
                            if isinstance(alt, dict) and "en" in alt:
                                manga_title = alt["en"]
                                break
                    break

            resolved_title = manga_title or chapter_title or "Manga"

            # 2. Fetch pages through at-home server endpoint
            at_home_resp = await client.get(f"{self.BASE_API_URL}/at-home/server/{chapter_id}")
            at_home_resp.raise_for_status()
            at_home_data = at_home_resp.json()

            base_url = at_home_data.get("baseUrl")
            chapter_hash = at_home_data.get("chapter", {}).get("hash")
            file_names = at_home_data.get("chapter", {}).get("data", [])

            if not base_url or not chapter_hash or not file_names:
                raise ValueError("Incomplete chapter data received from MangaDex API")

            page_urls = [
                f"{base_url}/data/{chapter_hash}/{fname}"
                for fname in file_names
            ]

            logger.info("Successfully fetched %d pages for '%s' (Ch. %s) from MangaDex", len(page_urls), resolved_title, chapter_number)

            return ChapterData(
                title=resolved_title,
                chapter_number=chapter_number,
                language_hint=language_hint,
                page_image_urls=page_urls,
                headers_needed={"Referer": "https://mangadex.org/"},
                layer_name="layer_0_mangadex",
                confidence=1.0
            )
