import re
import json
from collections import Counter
from urllib.parse import urljoin, urlparse
from typing import List, Dict, Any, Optional
import httpx
from bs4 import BeautifulSoup

from .base import SourceAdapter, ChapterData
from .security import assert_url_safe
from .scoring import (
    is_probable_manga_image,
    score_candidate,
    deduplicate_and_sort,
    extract_numeric_sequence,
)
from ..core.logging import logger

COMMON_IMAGE_ATTRIBUTES = [
    "data-src",
    "data-lazy-src",
    "data-original",
    "data-url",
    "data-lazy",
    "src",
]

INLINE_IMAGE_REGEX = re.compile(
    r"https?://[^\s\"'<>]+?\.(?:jpe?g|png|webp|avif)(?:\?[^\s\"'<>]*)?",
    re.IGNORECASE
)

class GenericStaticExtractor(SourceAdapter):
    """
    Layer 1 Generic Static Extractor.
    Extracts manga/manhwa page images from arbitrary website HTML without headless browser.
    """

    def can_handle(self, url: str) -> bool:
        # Generic extractor handles any valid http/https URL
        return url.startswith("http://") or url.startswith("https://")

    async def fetch_chapter(self, url: str) -> ChapterData:
        assert_url_safe(url)

        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9,id;q=0.8",
        }

        async with httpx.AsyncClient(timeout=20.0, follow_redirects=True, headers=headers) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            html_text = resp.text
            final_url = str(resp.url)

        return self.parse_html(html_text, final_url)

    def parse_html(self, html_text: str, base_url: str) -> ChapterData:
        soup = BeautifulSoup(html_text, "html.parser")

        # 1. Extract metadata
        title = self._extract_title(soup)
        chapter_number = self._extract_chapter_number(title)

        # 2. Extract DOM image candidates
        candidates = self._find_dom_candidates(soup, base_url)

        # 3. If DOM candidates are few or empty, check inline script tags (e.g. Madara themes, WP-Manga)
        if len(candidates) < 3:
            script_candidates = self._find_script_candidates(soup, base_url)
            if len(script_candidates) > len(candidates):
                candidates = script_candidates

        # 4. Filter and score
        container_counts = Counter(c.get("container_tag", "") for c in candidates)
        valid_candidates = []
        for c in candidates:
            if is_probable_manga_image(c["url"], c.get("alt", ""), c.get("classes", "")):
                c["score"] = score_candidate(c, container_counts)
                valid_candidates.append(c)

        # Filter out low-score noise if we have high-confidence images
        if any(c["score"] >= 0.7 for c in valid_candidates):
            valid_candidates = [c for c in valid_candidates if c["score"] >= 0.6]

        # 5. Deduplicate and order
        ordered_urls = deduplicate_and_sort(valid_candidates)

        confidence = 0.85 if len(ordered_urls) >= 3 else 0.4

        logger.info(
            "GenericStaticExtractor extracted %d pages from %s (confidence: %.2f)",
            len(ordered_urls),
            base_url,
            confidence,
        )

        domain = urlparse(base_url).netloc
        return ChapterData(
            title=title,
            chapter_number=chapter_number,
            language_hint=None,
            page_image_urls=ordered_urls,
            headers_needed={"Referer": base_url},
            layer_name="layer_1_static",
            confidence=confidence,
        )

    def _extract_title(self, soup: BeautifulSoup) -> Optional[str]:
        # Try og:title
        og_title = soup.find("meta", property="og:title")
        if og_title and og_title.get("content"):
            return og_title["content"].strip()
        # Fallback to <title>
        if soup.title and soup.title.string:
            return soup.title.string.strip()
        return None

    def _extract_chapter_number(self, title: Optional[str]) -> Optional[str]:
        if not title:
            return None
        match = re.search(r"(?:chapter|ch\.?|ep\.?|episode)\s*(\d+(?:\.\d+)?)", title, re.IGNORECASE)
        if match:
            return match.group(1)
        return None

    def _find_dom_candidates(self, soup: BeautifulSoup, base_url: str) -> List[Dict[str, Any]]:
        candidates = []

        # Check all img tags (including noscript ones)
        img_elements = soup.find_all("img")

        # Also search in <noscript>
        for noscript in soup.find_all("noscript"):
            sub_soup = BeautifulSoup(noscript.decode_contents(), "html.parser")
            img_elements.extend(sub_soup.find_all("img"))

        for idx, img in enumerate(img_elements):
            url = None
            attr_used = None

            for attr in COMMON_IMAGE_ATTRIBUTES:
                val = img.get(attr)
                if val and isinstance(val, str) and not val.startswith("data:image"):
                    url = val.strip()
                    attr_used = attr
                    break

            if not url:
                srcset = img.get("srcset")
                if srcset and isinstance(srcset, str):
                    parts = srcset.split(",")
                    if parts:
                        url = parts[0].strip().split(" ")[0]
                        attr_used = "srcset"

            if url:
                full_url = urljoin(base_url, url)
                parent = img.parent
                container_id = f"{parent.name}.{parent.get('class', [''])[0]}" if parent else "root"
                
                candidates.append({
                    "url": full_url,
                    "alt": img.get("alt", "") or "",
                    "classes": " ".join(img.get("class", [])) if img.get("class") else "",
                    "id": img.get("id", "") or "",
                    "container_tag": container_id,
                    "source_attr": attr_used or "src",
                    "dom_index": idx,
                })

        return candidates

    def _find_script_candidates(self, soup: BeautifulSoup, base_url: str) -> List[Dict[str, Any]]:
        candidates = []
        for script in soup.find_all("script"):
            content = script.string or script.text
            if not content:
                continue

            # Look for arrays of image URLs
            matches = INLINE_IMAGE_REGEX.findall(content)
            if len(matches) >= 3:
                for idx, match_url in enumerate(matches):
                    full_url = urljoin(base_url, match_url)
                    candidates.append({
                        "url": full_url,
                        "alt": "",
                        "classes": "script-inline",
                        "id": "",
                        "container_tag": "script",
                        "source_attr": "script",
                        "dom_index": idx,
                    })
                break  # Pick the first comprehensive array

        return candidates
