import json
import re
import httpx
from typing import List, Optional
from urllib.parse import urlparse
from bs4 import BeautifulSoup

from ..base import SourceAdapter, ChapterData
from ...core.logging import logger

AD_PATTERNS = re.compile(
    r"(logo|banner|iklan|ads|trakteer|saweria|discord|donate|loading|placeholder|avatar|icon)",
    re.IGNORECASE
)

class IndoMangaAdapter(SourceAdapter):
    """
    Dedicated Adapter for Indonesian Manga/Manhwa scanlation aggregator sites:
    - Komikindo (komikindo.tv, komikindo.ch, etc.)
    - Komiku (komiku.id, komiku.co, etc.)
    - Kiryuu (kiryuu.id, kiryuu01.com, etc.)
    - WestManga (westmanga.info, etc.)
    - Bacakomik (bacakomik.co, etc.)
    - Mangatale (mangatale.co, etc.)
    - Komikcast (komikcast.ch, etc.)
    """

    TARGET_DOMAINS = [
        "komikindo",
        "komiku",
        "kiryuu",
        "westmanga",
        "bacakomik",
        "mangatale",
        "komikcast",
        "shirakami",
        "maid.my.id",
        "mangakita"
    ]

    def can_handle(self, url: str) -> bool:
        parsed = urlparse(url.lower())
        netloc = parsed.netloc
        return any(d in netloc for d in self.TARGET_DOMAINS)

    def extract_clean_title(self, soup: BeautifulSoup, url: str) -> str:
        # Check standard heading tags
        h1 = soup.find(["h1", "h2"], class_=lambda c: c and any(k in str(c).lower() for k in ["title", "entry-title"]))
        if h1:
            text = h1.get_text(strip=True)
            if text:
                # Remove suffix like "Bahasa Indonesia", "Komik", etc.
                text = re.sub(r"\s*-\s*Komik.*$", "", text, flags=re.IGNORECASE)
                return text.strip()

        # Fallback to general h1 or title tag
        gen_h1 = soup.find("h1")
        if gen_h1 and gen_h1.get_text(strip=True):
            return gen_h1.get_text(strip=True)

        title_tag = soup.find("title")
        if title_tag and title_tag.get_text(strip=True):
            t = title_tag.get_text(strip=True)
            return t.split("|")[0].split(" - ")[0].strip()

        return "Manga Indonesia"

    async def fetch_chapter(self, url: str) -> ChapterData:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
            "Referer": url,
            "Cache-Control": "no-cache",
        }

        async with httpx.AsyncClient(timeout=35.0, headers=headers, follow_redirects=True) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            html = resp.text

            soup = BeautifulSoup(html, "lxml")
            title = self.extract_clean_title(soup, url)

            page_urls: List[str] = []

            # Method 1: Check ts_reader / html_image_data JSON in script tags (MangaReader / Madara WP themes)
            # Example: ts_reader.run({"sources":[{"images":["url1","url2"]}]})
            script_match = re.search(r'ts_reader\.run\((\{.*?\})\);', html, re.DOTALL)
            if script_match:
                try:
                    data = json.loads(script_match.group(1))
                    sources = data.get("sources", [])
                    for s in sources:
                        for img in s.get("images", []):
                            if img and isinstance(img, str) and img.startswith("http") and img not in page_urls:
                                page_urls.append(img.strip())
                    if page_urls:
                        logger.info("Found %d pages in ts_reader JSON on %s", len(page_urls), url)
                except Exception as e:
                    logger.debug("Failed parsing ts_reader JSON: %s", e)

            # Method 2: Check for image array in JavaScript variable
            if not page_urls:
                img_arr_match = re.search(r'(?:html_image_data|chapter_images|all_images)\s*=\s*(\[.*?\]);', html, re.DOTALL)
                if img_arr_match:
                    try:
                        raw_list = json.loads(img_arr_match.group(1))
                        for item in raw_list:
                            u = item if isinstance(item, str) else item.get("src") or item.get("url")
                            if u and u.startswith("http") and u not in page_urls:
                                page_urls.append(u.strip())
                    except Exception as e:
                        logger.debug("Failed parsing image array JSON: %s", e)

            # Method 3: DOM Selectors (#readerarea, #chimg-ctr, .entry-content)
            if not page_urls:
                candidates = soup.select("#readerarea img, #chimg-ctr img, .entry-content img, .main-reading-area img")
                for img in candidates:
                    src = (
                        img.get("data-src") or
                        img.get("data-lazy-src") or
                        img.get("data-original") or
                        img.get("data-url") or
                        img.get("src") or
                        ""
                    ).strip()

                    if src and src.startswith("http"):
                        # Skip banner ads and icons
                        if not AD_PATTERNS.search(src):
                            if src not in page_urls:
                                page_urls.append(src)

            if not page_urls:
                raise ValueError(f"Tidak dapat menemukan halaman komik pada URL: {url}")

            # Extract chapter number if present in URL
            ch_match = re.search(r"chapter-?(\d+(?:\.\d+)?)", url, re.IGNORECASE) or re.search(r"ch-?(\d+(?:\.\d+)?)", url, re.IGNORECASE)
            chapter_num = ch_match.group(1) if ch_match else "1"

            return ChapterData(
                title=title,
                chapter_number=chapter_num,
                language_hint="id",
                page_image_urls=page_urls,
                headers_needed={"Referer": url, "User-Agent": headers["User-Agent"]},
                layer_name="indomanga_adapter",
                confidence=0.99
            )
