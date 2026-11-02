import re
import asyncio
from typing import Optional, List
from urllib.parse import urlparse
from bs4 import BeautifulSoup
import httpx

try:
    from curl_cffi import requests as cffi_requests
    HAS_CURL_CFFI = True
except ImportError:
    cffi_requests = None
    HAS_CURL_CFFI = False

from ..base import SourceAdapter, ChapterData
from ...core.logging import logger

ID_PATTERN = re.compile(r"/(?:g|read|nhentai)/(\d+)")
PURE_DIGITS = re.compile(r"^\d{4,8}$")

EXT_MAP = {
    "j": "jpg",
    "p": "png",
    "w": "webp",
    "g": "gif"
}

class NHentaiAdapter(SourceAdapter):
    """
    Bulletproof Multi-Tier Adapter for nhentai:
    - Tier 1: Official nhentai v2 REST API (via curl_cffi Chrome TLS impersonation)
    - Tier 2: Cubari.moe JSON Proxy API (never blocked, pure high-speed CDN links)
    - Tier 3: nhentai.website HTML Scraper (high reliability mirror)
    - Tier 4: nhentai.xxx HTML Scraper
    - Tier 5: Legacy nhentai.to mirror fallback
    """

    DOMAINS = ["nhentai.net", "nhentai.to", "nhentai.xxx", "nhentai.website", "cubari.moe"]

    def can_handle(self, url: str) -> bool:
        url_clean = url.strip()
        if PURE_DIGITS.match(url_clean):
            return True
        parsed = urlparse(url_clean)
        netloc = parsed.netloc.lower()
        if any(d in netloc for d in self.DOMAINS) and (
            "/g/" in parsed.path.lower()
            or "/read/" in parsed.path.lower()
            or parsed.path.strip("/").isdigit()
        ):
            return True
        return False

    def extract_id(self, url: str) -> Optional[str]:
        url_clean = url.strip()
        if PURE_DIGITS.match(url_clean):
            return url_clean
        match = ID_PATTERN.search(url_clean)
        if match:
            return match.group(1)
        parsed = urlparse(url_clean)
        parts = [p for p in parsed.path.split("/") if p]
        if parts and parts[-1].isdigit():
            return parts[-1]
        return None

    async def fetch_chapter(self, url: str) -> ChapterData:
        gallery_id = self.extract_id(url)
        if not gallery_id:
            raise ValueError(f"Could not extract nhentai gallery ID from URL: {url}")

        # TIER 1: Official nhentai v2 API with TLS browser impersonation (curl_cffi)
        if HAS_CURL_CFFI:
            try:
                def _get_v2_api():
                    return cffi_requests.get(
                        f"https://nhentai.net/api/v2/galleries/{gallery_id}",
                        impersonate="chrome124",
                        headers={
                            "Accept": "application/json",
                            "Referer": "https://nhentai.net/",
                        },
                        timeout=12.0
                    )

                resp = await asyncio.to_thread(_get_v2_api)
                if resp.status_code == 200:
                    data = resp.json()
                    title_obj = data.get("title", {})
                    title = (
                        title_obj.get("pretty")
                        or title_obj.get("english")
                        or title_obj.get("japanese")
                        or f"Doujinshi #{gallery_id}"
                    )
                    pages_info = data.get("pages", [])
                    page_urls = [f"https://i.nhentai.net/{p['path']}" for p in pages_info if p.get("path")]
                    if page_urls:
                        logger.info("Successfully extracted %d pages from official nhentai v2 API for #%s", len(page_urls), gallery_id)
                        return ChapterData(
                            title=title,
                            chapter_number="1",
                            language_hint="ja",
                            page_image_urls=page_urls,
                            headers_needed={"Referer": "https://nhentai.net/"},
                            layer_name="nhentai_v2_api",
                            confidence=1.0
                        )
            except Exception as e:
                logger.debug("nhentai v2 API attempt failed (%s), trying Cubari Proxy...", e)

        # Standard headers for subsequent HTTP requests
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Referer": "https://nhentai.net/",
            "Accept-Language": "en-US,en;q=0.9,id;q=0.8"
        }

        async with httpx.AsyncClient(timeout=20.0, headers=headers, follow_redirects=True) as client:
            # TIER 2: Cubari.moe Proxy API (Zero-blocking high-speed JSON)
            try:
                cubari_url = f"https://cubari.moe/read/api/nhentai/series/{gallery_id}/"
                c_resp = await client.get(cubari_url)
                if c_resp.status_code == 200:
                    c_data = c_resp.json()
                    title = c_data.get("title") or f"Doujinshi #{gallery_id}"
                    ch_dict = c_data.get("chapters", {})
                    page_urls = []
                    for ch_key in ["1", "0", ""]:
                        if ch_key in ch_dict:
                            groups = ch_dict[ch_key].get("groups", {})
                            for g_urls in groups.values():
                                if isinstance(g_urls, list) and len(g_urls) > 0:
                                    page_urls = g_urls
                                    break
                        if page_urls:
                            break

                    if not page_urls and ch_dict:
                        first_ch = next(iter(ch_dict.values()))
                        for g_urls in first_ch.get("groups", {}).values():
                            if isinstance(g_urls, list) and len(g_urls) > 0:
                                page_urls = g_urls
                                break

                    if page_urls:
                        logger.info("Successfully extracted %d pages from Cubari API for #%s", len(page_urls), gallery_id)
                        return ChapterData(
                            title=title,
                            chapter_number="1",
                            language_hint="ja",
                            page_image_urls=page_urls,
                            headers_needed={"Referer": "https://nhentai.net/"},
                            layer_name="nhentai_cubari_api",
                            confidence=0.99
                        )
            except Exception as e:
                logger.debug("Cubari API attempt failed (%s), trying nhentai.website mirror...", e)

            # TIER 3: nhentai.website mirror HTML
            try:
                mirror_url = f"https://nhentai.website/g/{gallery_id}/"
                m_resp = await client.get(mirror_url)
                if m_resp.status_code == 200:
                    soup = BeautifulSoup(m_resp.text, "html.parser")
                    title_tag = soup.find("h1") or soup.find("title")
                    title = title_tag.get_text(strip=True) if title_tag else f"Doujinshi #{gallery_id}"
                    title = re.sub(r"nhentai - Hentai Manga.*$", "", title, flags=re.I).strip()

                    thumbs = soup.select(".thumb-container img, #thumbnail-container img, .thumbs img")
                    page_urls = []
                    for img in thumbs:
                        src = img.get("data-src") or img.get("src") or ""
                        m = re.search(r"/(?:g|galleries)/(\d+)/(\d+)x?\.", src)
                        if m:
                            mid, pnum = m.group(1), m.group(2)
                            page_url = f"https://i.nhentai.net/galleries/{mid}/{pnum}.jpg"
                            if page_url not in page_urls:
                                page_urls.append(page_url)

                    if page_urls:
                        logger.info("Successfully extracted %d pages from nhentai.website mirror for #%s", len(page_urls), gallery_id)
                        return ChapterData(
                            title=title,
                            chapter_number="1",
                            language_hint="ja",
                            page_image_urls=page_urls,
                            headers_needed={"Referer": "https://nhentai.net/"},
                            layer_name="nhentai_website_mirror",
                            confidence=0.98
                        )
            except Exception as e:
                logger.debug("nhentai.website attempt failed (%s), trying nhentai.xxx mirror...", e)

            # TIER 4: nhentai.xxx mirror HTML
            try:
                xxx_url = f"https://nhentai.xxx/g/{gallery_id}/"
                x_resp = await client.get(xxx_url)
                if x_resp.status_code == 200:
                    soup = BeautifulSoup(x_resp.text, "html.parser")
                    title_tag = soup.find("title")
                    title = title_tag.get_text(strip=True).split("»")[0].strip() if title_tag else f"Doujinshi #{gallery_id}"

                    thumbs = soup.select(".thumb-container img, #thumbnail-container img, .thumbs img, .gallery img")
                    page_urls = []
                    for img in thumbs:
                        src = img.get("data-src") or img.get("src") or ""
                        m = re.search(r"/(?:g|galleries)/(\d+)/(\d+)t?\.", src)
                        if m:
                            mid, pnum = m.group(1), m.group(2)
                            page_url = f"https://i.nhentai.net/galleries/{mid}/{pnum}.jpg"
                            if page_url not in page_urls:
                                page_urls.append(page_url)

                    if page_urls:
                        logger.info("Successfully extracted %d pages from nhentai.xxx mirror for #%s", len(page_urls), gallery_id)
                        return ChapterData(
                            title=title,
                            chapter_number="1",
                            language_hint="ja",
                            page_image_urls=page_urls,
                            headers_needed={"Referer": "https://nhentai.net/"},
                            layer_name="nhentai_xxx_mirror",
                            confidence=0.97
                        )
            except Exception as e:
                logger.debug("nhentai.xxx attempt failed (%s), trying fallback...", e)

            # TIER 5: Fallback nhentai.to mirror
            try:
                to_url = f"https://nhentai.to/g/{gallery_id}"
                to_resp = await client.get(to_url)
                if to_resp.status_code == 200:
                    soup = BeautifulSoup(to_resp.text, "html.parser")
                    title_tag = soup.find("title")
                    title = title_tag.get_text(strip=True).split("»")[0].strip() if title_tag else f"Doujinshi #{gallery_id}"

                    thumbs = soup.select(".thumb-container img, #thumbnail-container img, .thumbs img")
                    page_urls = []
                    for img in thumbs:
                        src = img.get("data-src") or img.get("src") or ""
                        if "/galleries/" in src and "cover." not in src and "thumb." not in src:
                            full_url = re.sub(r"(\d+)t\.([a-zA-Z0-9]+)$", r"\1.\2", src)
                            if full_url not in page_urls:
                                page_urls.append(full_url)

                    if page_urls:
                        logger.info("Successfully extracted %d pages from nhentai.to for #%s", len(page_urls), gallery_id)
                        return ChapterData(
                            title=title,
                            chapter_number="1",
                            language_hint="ja",
                            page_image_urls=page_urls,
                            headers_needed={"Referer": "https://nhentai.to/"},
                            layer_name="nhentai_to_mirror",
                            confidence=0.96
                        )
            except Exception as e:
                logger.debug("nhentai.to attempt failed (%s)...", e)

        raise ValueError(f"Tidak dapat mengekstrak halaman komik nhentai #{gallery_id} dari semua server mirror. Silakan periksa kembali kode doujinshi.")
