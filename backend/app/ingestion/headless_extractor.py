import asyncio
import re
from collections import Counter
from urllib.parse import urljoin
from typing import List, Dict, Any, Optional
from bs4 import BeautifulSoup

from .base import SourceAdapter, ChapterData
from .security import assert_url_safe
from .scoring import (
    is_probable_manga_image,
    score_candidate,
    deduplicate_and_sort,
)
from ..core.logging import logger

COMMON_IMAGE_ATTRS = [
    "data-src",
    "data-lazy-src",
    "data-original",
    "data-url",
    "data-lazy",
    "src"
]

class HeadlessBrowserExtractor(SourceAdapter):
    """
    Layer 2 Headless Browser Extractor (Playwright Chromium).
    Renders JavaScript, scrolls to trigger lazy loading, and captures dynamically rendered reader images.
    """

    def can_handle(self, url: str) -> bool:
        return url.startswith("http://") or url.startswith("https://")

    async def fetch_chapter(self, url: str) -> ChapterData:
        assert_url_safe(url)

        try:
            from playwright.async_api import async_playwright
        except ImportError:
            raise RuntimeError("Playwright is not installed.")

        logger.info("Starting Playwright headless extraction for: %s", url)

        async with async_playwright() as p:
            # Launch browser
            try:
                browser = await p.chromium.launch(
                    headless=True,
                    args=["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
                )
            except Exception as e:
                logger.warning("Chromium browser failed to launch: %s. Falling back to next layer.", e)
                raise RuntimeError(f"Playwright browser unavailable: {e}")

            context = await browser.new_context(
                viewport={"width": 1280, "height": 1800},
                user_agent=(
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/124.0.0.0 Safari/537.36"
                ),
            )
            page = await context.new_page()

            # Optional: abort ads and trackers
            await page.route(
                re.compile(r"(google-analytics|doubleclick|clarity|facebook|adservice|disqus)", re.I),
                lambda route: route.abort()
            )

            try:
                await page.goto(url, wait_until="domcontentloaded", timeout=25000)

                # Auto-scroll page to trigger lazy loading observers
                await self._auto_scroll(page)

                # Wait briefly for dynamic elements
                await asyncio.sleep(1.5)

                html_content = await page.content()
                final_url = page.url
            finally:
                await context.close()
                await browser.close()

        # Parse rendered DOM
        return self._parse_rendered_html(html_content, final_url)

    async def _auto_scroll(self, page):
        """Scrolls down in steps to trigger lazy image rendering."""
        try:
            scroll_script = """
                async () => {
                    await new Promise((resolve) => {
                        let totalHeight = 0;
                        const distance = 800;
                        const timer = setInterval(() => {
                            const scrollHeight = document.body.scrollHeight;
                            window.scrollBy(0, distance);
                            totalHeight += distance;

                            if (totalHeight >= scrollHeight || totalHeight > 25000) {
                                clearInterval(timer);
                                resolve();
                            }
                        }, 150);
                    });
                }
            """
            await page.evaluate(scroll_script)
        except Exception as e:
            logger.debug("Scroll execution notice: %s", e)

    def _parse_rendered_html(self, html_text: str, base_url: str) -> ChapterData:
        soup = BeautifulSoup(html_text, "html.parser")

        # Extract title
        title = soup.title.string.strip() if soup.title and soup.title.string else None

        candidates = []
        for idx, img in enumerate(soup.find_all("img")):
            url = None
            attr_used = None
            for attr in COMMON_IMAGE_ATTRS:
                val = img.get(attr)
                if val and isinstance(val, str) and not val.startswith("data:image"):
                    url = val.strip()
                    attr_used = attr
                    break

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

        container_counts = Counter(c.get("container_tag", "") for c in candidates)
        valid = [
            c for c in candidates
            if is_probable_manga_image(c["url"], c.get("alt", ""), c.get("classes", ""))
        ]
        for c in valid:
            c["score"] = score_candidate(c, container_counts)

        if any(c["score"] >= 0.7 for c in valid):
            valid = [c for c in valid if c["score"] >= 0.6]

        ordered_urls = deduplicate_and_sort(valid)

        logger.info("HeadlessBrowserExtractor obtained %d pages", len(ordered_urls))
        return ChapterData(
            title=title,
            chapter_number=None,
            page_image_urls=ordered_urls,
            headers_needed={"Referer": base_url},
            layer_name="layer_2_headless",
            confidence=0.85 if len(ordered_urls) >= 3 else 0.4
        )
