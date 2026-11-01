import re
import httpx
from typing import Optional, List
from urllib.parse import urlparse
from ..base import SourceAdapter, ChapterData
from ...core.logging import logger

ID_PATTERN = re.compile(r"/g/(\d+)")
PURE_DIGITS = re.compile(r"^\d{4,8}$")

EXT_MAP = {
    "j": "jpg",
    "p": "png",
    "w": "webp",
    "g": "gif"
}

class NHentaiAdapter(SourceAdapter):
    """
    Dedicated Adapter for nhentai and its mirrors using direct JSON API
    with HTML thumbnail fallback.
    URL formats:
      - https://nhentai.net/g/{id}/
      - https://nhentai.to/g/{id}/
      - https://nhentai.xxx/g/{id}/
      - Or standalone 4-8 digit code (e.g. 177013)
    """

    DOMAINS = ["nhentai.net", "nhentai.to", "nhentai.xxx", "nhentai.website"]

    def can_handle(self, url: str) -> bool:
        url_clean = url.strip()
        if PURE_DIGITS.match(url_clean):
            return True
        parsed = urlparse(url_clean)
        netloc = parsed.netloc.lower()
        if any(d in netloc for d in self.DOMAINS) and ("/g/" in parsed.path.lower() or parsed.path.strip("/").isdigit()):
            return True
        return False

    def extract_id(self, url: str) -> Optional[str]:
        url_clean = url.strip()
        if PURE_DIGITS.match(url_clean):
            return url_clean
        match = ID_PATTERN.search(url_clean)
        if match:
            return match.group(1)
        # Check if last path segment is digit
        parsed = urlparse(url_clean)
        parts = [p for p in parsed.path.split("/") if p]
        if parts and parts[-1].isdigit():
            return parts[-1]
        return None

    async def fetch_chapter(self, url: str) -> ChapterData:
        gallery_id = self.extract_id(url)
        if not gallery_id:
            raise ValueError(f"Could not extract nhentai gallery ID from URL: {url}")

        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Accept": "application/json, text/html, */*",
            "Referer": "https://nhentai.net/",
            "Accept-Language": "en-US,en;q=0.9,id;q=0.8"
        }

        async with httpx.AsyncClient(timeout=30.0, headers=headers, follow_redirects=True) as client:
            # 1. Try public REST API
            try:
                api_url = f"https://nhentai.net/api/gallery/{gallery_id}"
                resp = await client.get(api_url)
                if resp.status_code == 200:
                    data = resp.json()
                    media_id = str(data.get("media_id"))
                    title_obj = data.get("title", {})
                    title = title_obj.get("pretty") or title_obj.get("english") or title_obj.get("japanese") or f"Doujinshi #{gallery_id}"
                    
                    pages = data.get("images", {}).get("pages", [])
                    page_urls = []
                    for idx, p in enumerate(pages):
                        t = p.get("t", "j")
                        ext = EXT_MAP.get(t, "jpg")
                        page_num = idx + 1
                        # High-res image CDN
                        page_urls.append(f"https://i.nhentai.net/galleries/{media_id}/{page_num}.{ext}")

                    if page_urls:
                        return ChapterData(
                            title=title,
                            chapter_number="1",
                            language_hint="ja",
                            page_image_urls=page_urls,
                            headers_needed={"Referer": "https://nhentai.net/"},
                            layer_name="nhentai_api",
                            confidence=1.0
                        )
            except Exception as e:
                logger.warning("nhentai API failed: %s, falling back to HTML parsing...", e)

            # 2. Fallback: Parse gallery HTML directly
            web_url = f"https://nhentai.net/g/{gallery_id}/"
            resp = await client.get(web_url)
            resp.raise_for_status()

            from bs4 import BeautifulSoup
            soup = BeautifulSoup(resp.text, "lxml")

            # Extract title
            h1 = soup.find("h1", class_="title")
            h2 = soup.find("h2", class_="title")
            title = (h1.get_text(strip=True) if h1 else None) or (h2.get_text(strip=True) if h2 else None) or f"Doujinshi #{gallery_id}"

            # Extract thumbnail images and convert to high-res URLs
            # Thumbnail format: https://t.nhentai.net/galleries/{media_id}/{page}t.{ext}
            # Full format: https://i.nhentai.net/galleries/{media_id}/{page}.{ext}
            thumbs = soup.select(".thumb-container img, .thumbs img")
            page_urls = []
            for img in thumbs:
                src = img.get("data-src") or img.get("src") or ""
                if "/galleries/" in src:
                    # Convert thumbnail URL to full resolution
                    full_url = src.replace("t.nhentai.net", "i.nhentai.net")
                    full_url = re.sub(r"(\d+)t\.([a-zA-Z0-9]+)$", r"\1.\2", full_url)
                    if full_url not in page_urls:
                        page_urls.append(full_url)

            if not page_urls:
                raise ValueError(f"Could not find pages for nhentai #{gallery_id}")

            return ChapterData(
                title=title,
                chapter_number="1",
                language_hint="ja",
                page_image_urls=page_urls,
                headers_needed={"Referer": "https://nhentai.net/"},
                layer_name="nhentai_html",
                confidence=0.98
            )
