import re
import httpx
from typing import List, Optional
from urllib.parse import urlparse
from bs4 import BeautifulSoup

from ..base import SourceAdapter, ChapterData
from ...core.logging import logger

class ManganatoAdapter(SourceAdapter):
    """
    Dedicated Adapter for Manganato and MangaKakalot global network:
    - manganato.com / chapmanganato.*
    - mangakakalot.com / readmanganato.*
    """

    TARGET_DOMAINS = ["manganato", "mangakakalot", "chapmanganato", "readmanganato"]

    def can_handle(self, url: str) -> bool:
        parsed = urlparse(url.lower())
        return any(d in parsed.netloc for d in self.TARGET_DOMAINS)

    async def fetch_chapter(self, url: str) -> ChapterData:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Referer": "https://chapmanganato.to/",
            "Accept-Language": "en-US,en;q=0.9",
        }

        async with httpx.AsyncClient(timeout=35.0, headers=headers, follow_redirects=True) as client:
            resp = await client.get(url)
            resp.raise_for_status()

            soup = BeautifulSoup(resp.text, "lxml")

            # Extract title
            h1 = soup.find("h1") or soup.find("h2", class_="info-top-chapter")
            title = h1.get_text(strip=True) if h1 else "Manga"
            title = re.sub(r"\s*-\s*Chapter.*$", "", title, flags=re.IGNORECASE).strip()

            # Extract page images from reader container
            page_urls: List[str] = []
            container = soup.select(".container-chapter-reader img, .vung-doc img, #vungdoc img")
            for img in container:
                src = (img.get("data-src") or img.get("src") or "").strip()
                if src and src.startswith("http") and src not in page_urls:
                    page_urls.append(src)

            if not page_urls:
                raise ValueError(f"Could not find reader images on {url}")

            ch_match = re.search(r"chapter-?(\d+(?:\.\d+)?)", url, re.IGNORECASE)
            chapter_num = ch_match.group(1) if ch_match else "1"

            return ChapterData(
                title=title,
                chapter_number=chapter_num,
                language_hint="en",
                page_image_urls=page_urls,
                headers_needed={"Referer": "https://chapmanganato.to/", "User-Agent": headers["User-Agent"]},
                layer_name="manganato_adapter",
                confidence=1.0
            )
