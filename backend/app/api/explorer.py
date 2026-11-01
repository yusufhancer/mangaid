import httpx
import re
from urllib.parse import quote, unquote
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from bs4 import BeautifulSoup
from ..core.logging import logger

router = APIRouter(prefix="/explorer", tags=["Explorer"])

MANGADEX_API_BASE = "https://api.mangadex.org"
MANGADEX_HEADERS = {
    "User-Agent": "MangaID/1.0 (https://github.com/mangaid-app)",
    "Accept": "application/json"
}
WEB_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

class ExplorerMangaItem(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    status: Optional[str] = None
    year: Optional[int] = None
    cover_url: Optional[str] = None
    tags: List[str] = []
    source: str = "mangadex"
    original_url: Optional[str] = None

class ExplorerChapterItem(BaseModel):
    id: str
    chapter_number: str
    title: Optional[str] = None
    pages_count: int = 0
    language: str
    group_name: Optional[str] = None
    publish_at: Optional[str] = None
    is_external: bool = False
    external_url: Optional[str] = None
    source: str = "mangadex"

async def _search_mangadex(q: str, limit: int) -> List[ExplorerMangaItem]:
    params = [
        ("title", q.strip()),
        ("limit", str(limit)),
        ("includes[]", "cover_art"),
        ("order[relevance]", "desc"),
        ("contentRating[]", "safe"),
        ("contentRating[]", "suggestive"),
        ("contentRating[]", "erotica"),
    ]
    async with httpx.AsyncClient(timeout=20.0, headers=MANGADEX_HEADERS) as client:
        resp = await client.get(f"{MANGADEX_API_BASE}/manga", params=params)
        resp.raise_for_status()
        data = resp.json()

    results = []
    for item in data.get("data", []):
        m_id = item.get("id")
        attr = item.get("attributes", {})
        t_dict = attr.get("title", {})
        title = None
        if isinstance(t_dict, dict) and t_dict:
            title = t_dict.get("en") or t_dict.get("ja-ro") or next(iter(t_dict.values()), None)
        if not title:
            for alt in attr.get("altTitles", []):
                if isinstance(alt, dict) and alt:
                    title = alt.get("en") or next(iter(alt.values()), None)
                    if title:
                        break
        if not title:
            title = "Untitled Manga"

        desc_dict = attr.get("description", {})
        desc = None
        if isinstance(desc_dict, dict) and desc_dict:
            desc = desc_dict.get("en") or next(iter(desc_dict.values()), None)

        tags = []
        for t in attr.get("tags", []):
            t_name = t.get("attributes", {}).get("name", {}).get("en")
            if t_name:
                tags.append(t_name)

        cover_url = None
        for rel in item.get("relationships", []):
            if rel.get("type") == "cover_art":
                file_name = rel.get("attributes", {}).get("fileName")
                if file_name:
                    raw_cover = f"https://uploads.mangadex.org/covers/{m_id}/{file_name}.256.jpg"
                    cover_url = f"/api/proxy/image?url={quote(raw_cover, safe='')}"
                break

        results.append(ExplorerMangaItem(
            id=m_id,
            title=title,
            description=desc,
            status=attr.get("status"),
            year=attr.get("year"),
            cover_url=cover_url,
            tags=tags[:5],
            source="mangadex",
            original_url=f"https://mangadex.org/title/{m_id}"
        ))
    return results

async def _search_raw_manga(q: str, limit: int) -> List[ExplorerMangaItem]:
    params = [
        ("title", q.strip()),
        ("limit", str(limit)),
        ("originalLanguage[]", "ja"),
        ("originalLanguage[]", "ko"),
        ("includes[]", "cover_art"),
        ("order[relevance]", "desc"),
        ("contentRating[]", "safe"),
        ("contentRating[]", "suggestive"),
        ("contentRating[]", "erotica"),
    ]
    async with httpx.AsyncClient(timeout=20.0, headers=MANGADEX_HEADERS) as client:
        resp = await client.get(f"{MANGADEX_API_BASE}/manga", params=params)
        resp.raise_for_status()
        data = resp.json()

    results = []
    for item in data.get("data", []):
        m_id = item.get("id")
        attr = item.get("attributes", {})
        t_dict = attr.get("title", {})
        title = None
        if isinstance(t_dict, dict) and t_dict:
            title = t_dict.get("ja") or t_dict.get("ko") or t_dict.get("ja-ro") or t_dict.get("en") or next(iter(t_dict.values()), None)
        if not title:
            for alt in attr.get("altTitles", []):
                if isinstance(alt, dict) and alt:
                    title = alt.get("ja") or alt.get("ko") or alt.get("en") or next(iter(alt.values()), None)
                    if title:
                        break
        if not title:
            title = "Untitled RAW Manga"

        desc_dict = attr.get("description", {})
        desc = None
        if isinstance(desc_dict, dict) and desc_dict:
            desc = desc_dict.get("en") or desc_dict.get("ja") or next(iter(desc_dict.values()), None)

        orig_lang = attr.get("originalLanguage", "ja")
        lang_label = "🇯🇵 RAW Jepang" if orig_lang == "ja" else ("🇰🇷 RAW Korea" if orig_lang == "ko" else "🇨🇳 RAW China")

        tags = [lang_label, "RAW"]
        for t in attr.get("tags", []):
            t_name = t.get("attributes", {}).get("name", {}).get("en")
            if t_name and t_name not in tags:
                tags.append(t_name)

        cover_url = None
        for rel in item.get("relationships", []):
            if rel.get("type") == "cover_art":
                file_name = rel.get("attributes", {}).get("fileName")
                if file_name:
                    raw_cover = f"https://uploads.mangadex.org/covers/{m_id}/{file_name}.256.jpg"
                    cover_url = f"/api/proxy/image?url={quote(raw_cover, safe='')}"
                break

        results.append(ExplorerMangaItem(
            id=m_id,
            title=title,
            description=desc or f"Manga RAW rilis asli {lang_label}",
            status=attr.get("status"),
            year=attr.get("year"),
            cover_url=cover_url,
            tags=tags[:6],
            source="raw",
            original_url=f"https://mangadex.org/title/{m_id}"
        ))
    return results

async def _search_komikindo(q: str, limit: int) -> List[ExplorerMangaItem]:
    urls_to_try = [
        f"https://komikindo.ch/?s={quote(q)}",
        f"https://komikindo.tv/?s={quote(q)}",
    ]
    html = ""
    async with httpx.AsyncClient(timeout=10.0, headers=WEB_HEADERS, follow_redirects=True) as client:
        for u in urls_to_try:
            try:
                resp = await client.get(u)
                if resp.status_code == 200 and resp.text and len(resp.text) > 2000:
                    if "Just a moment..." not in resp.text:
                        html = resp.text
                        break
            except Exception as e:
                logger.warning(f"Failed fetching {u}: {e}")

    results = []
    if html:
        soup = BeautifulSoup(html, "html.parser")
        posts = soup.select(".animepost, .bsx, .film-list .animepost")
        for post in posts[:limit]:
            a = post.select_one("a")
            title_el = post.select_one(".tt, h4, .title, h2")
            img = post.select_one("img")
            status_el = post.select_one(".type, .status, .typeflag")

            if not a or not title_el:
                continue

            url = a.get("href", "").strip()
            title = title_el.get_text(strip=True)
            img_src = (img.get("src") or img.get("data-src") or "") if img else ""
            cover_proxy = f"/api/proxy/image?url={quote(img_src, safe='')}" if img_src else None
            status = status_el.get_text(strip=True) if status_el else "Manga"

            encoded_id = f"ki-{quote(url, safe='')}"
            results.append(ExplorerMangaItem(
                id=encoded_id,
                title=title,
                description="Scanlation Komik Bahasa Indonesia",
                status=status,
                cover_url=cover_proxy,
                tags=["Komik Indo", "Bahasa ID"],
                source="komikindo",
                original_url=url
            ))

    # Automatic fallback if Komikindo is blocked by Cloudflare on datacenter IPs:
    # Query MangaDex Indonesian-translated catalog (availableTranslatedLanguage[]=id)
    if not results:
        try:
            params = [
                ("title", q.strip()),
                ("limit", str(limit)),
                ("availableTranslatedLanguage[]", "id"),
                ("includes[]", "cover_art"),
                ("order[relevance]", "desc"),
                ("contentRating[]", "safe"),
                ("contentRating[]", "suggestive"),
            ]
            async with httpx.AsyncClient(timeout=15.0, headers=MANGADEX_HEADERS) as client:
                resp = await client.get(f"{MANGADEX_API_BASE}/manga", params=params)
                if resp.status_code == 200:
                    data = resp.json()
                    for item in data.get("data", []):
                        m_id = item.get("id")
                        attr = item.get("attributes", {})
                        t_dict = attr.get("title", {})
                        title = None
                        if isinstance(t_dict, dict) and t_dict:
                            title = t_dict.get("en") or t_dict.get("ja-ro") or next(iter(t_dict.values()), None)
                        if not title:
                            title = "Untitled Manga"

                        cover_url = None
                        for rel in item.get("relationships", []):
                            if rel.get("type") == "cover_art":
                                fn = rel.get("attributes", {}).get("fileName")
                                if fn:
                                    raw_cover = f"https://uploads.mangadex.org/covers/{m_id}/{fn}.256.jpg"
                                    cover_url = f"/api/proxy/image?url={quote(raw_cover, safe='')}"
                                break

                        results.append(ExplorerMangaItem(
                            id=m_id,
                            title=title,
                            description="Tersedia Bab Bahasa Indonesia (Scanlation Indo)",
                            status=attr.get("status"),
                            year=attr.get("year"),
                            cover_url=cover_url,
                            tags=["Sub Indo", "Bahasa ID"],
                            source="komikindo",
                            original_url=f"https://mangadex.org/title/{m_id}"
                        ))
        except Exception as e:
            logger.warning(f"Indonesian fallback search error: {e}")

    return results

async def _search_nhentai(q: str, limit: int) -> List[ExplorerMangaItem]:
    clean_q = q.strip()
    results = []

    # If numeric code, try direct fetch first
    if clean_q.isdigit() and len(clean_q) in (4, 5, 6, 7, 8):
        try:
            async with httpx.AsyncClient(timeout=10.0, headers=WEB_HEADERS, follow_redirects=True) as client:
                resp = await client.get(f"https://nhentai.to/g/{clean_q}/")
                if resp.status_code == 200:
                    soup = BeautifulSoup(resp.text, "html.parser")
                    title_el = soup.select_one("#info h1, #info h2")
                    cover_el = soup.select_one("#cover img")
                    title = title_el.get_text(strip=True) if title_el else f"Doujinshi #{clean_q}"
                    cover_src = (cover_el.get("src") or cover_el.get("data-src") or "") if cover_el else ""
                    cover_proxy = f"/api/proxy/image?url={quote(cover_src, safe='')}" if cover_src else None

                    results.append(ExplorerMangaItem(
                        id=f"nh-{clean_q}",
                        title=title,
                        description=f"Kode Doujinshi #{clean_q}",
                        status="Completed",
                        cover_url=cover_proxy,
                        tags=["Doujinshi", "18+", "Kode Direct"],
                        source="nhentai",
                        original_url=f"https://nhentai.to/g/{clean_q}/"
                    ))
        except Exception as e:
            logger.warning(f"Direct nhentai code fetch error: {e}")

    # General search
    try:
        search_url = f"https://nhentai.to/search?q={quote(clean_q)}"
        async with httpx.AsyncClient(timeout=15.0, headers=WEB_HEADERS, follow_redirects=True) as client:
            resp = await client.get(search_url)
            if resp.status_code == 200:
                soup = BeautifulSoup(resp.text, "html.parser")
                galleries = soup.select(".gallery")
                for g in galleries:
                    if len(results) >= limit:
                        break
                    a = g.select_one("a")
                    img = g.select_one("img")
                    caption = g.select_one(".caption")
                    if not a:
                        continue
                    href = a.get("href", "")
                    code_match = re.search(r"/g/(\d+)/?", href)
                    if not code_match:
                        continue
                    code = code_match.group(1)
                    if any(r.id == f"nh-{code}" for r in results):
                        continue

                    title = caption.get_text(strip=True) if caption else f"Doujinshi #{code}"
                    img_src = (img.get("data-src") or img.get("src") or "") if img else ""
                    cover_proxy = f"/api/proxy/image?url={quote(img_src, safe='')}" if img_src else None

                    results.append(ExplorerMangaItem(
                        id=f"nh-{code}",
                        title=title,
                        description=f"Doujinshi galeri #{code}",
                        status="18+",
                        cover_url=cover_proxy,
                        tags=["Doujinshi", "18+"],
                        source="nhentai",
                        original_url=f"https://nhentai.to/g/{code}/"
                    ))
    except Exception as e:
        logger.warning(f"nhentai search error: {e}")

    return results

@router.get("/search", response_model=List[ExplorerMangaItem])
async def search_manga(
    q: str = Query(..., min_length=1, description="Kata kunci pencarian judul manga"),
    source: str = Query("mangadex", description="Sumber pencarian: mangadex, raw, komikindo, nhentai"),
    limit: int = Query(24, ge=1, le=50)
):
    source_clean = source.strip().lower()
    q_clean = q.strip()
    try:
        if source_clean in ("raw", "jepang", "korea"):
            return await _search_raw_manga(q_clean, limit=limit)
        elif source_clean == "nhentai":
            return await _search_nhentai(q_clean, limit=limit)
        elif source_clean in ("komikindo", "indo", "id"):
            return await _search_komikindo(q_clean, limit=limit)
        else:
            return await _search_mangadex(q_clean, limit=limit)
    except Exception as e:
        logger.error(f"Explorer search error (source={source_clean}, q={q_clean}): {e}")
        raise HTTPException(status_code=502, detail=f"Gagal mencari manga di sumber {source}: {str(e)}")

@router.get("/manga/{manga_id}/chapters", response_model=List[ExplorerChapterItem])
async def get_manga_chapters(
    manga_id: str,
    lang: str = Query("all", description="Filter bahasa terjemahan (en, id, ja, all)"),
    limit: int = Query(100, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    try:
        # 1. nhentai doujinshi (single chapter entry)
        if manga_id.startswith("nh-"):
            code = manga_id[3:]
            return [
                ExplorerChapterItem(
                    id=f"nh-{code}",
                    chapter_number="1",
                    title=f"Doujinshi #{code} (Lengkap)",
                    pages_count=0,
                    language="ja",
                    group_name="Doujinshi",
                    is_external=False,
                    external_url=f"https://nhentai.to/g/{code}/",
                    source="nhentai"
                )
            ]

        # 2. Komikindo (Scrape chapters from comic series page)
        if manga_id.startswith("ki-"):
            comic_url = unquote(manga_id[3:])
            async with httpx.AsyncClient(timeout=15.0, headers=WEB_HEADERS, follow_redirects=True) as client:
                resp = await client.get(comic_url)
                resp.raise_for_status()
                html = resp.text

            soup = BeautifulSoup(html, "html.parser")
            container = soup.select_one(".eps_lst, .listeps, #chapterlist, .eplister")
            raw_links = []
            if container:
                for a in container.select("li a, .lchx a, a"):
                    href = a.get("href", "").strip()
                    if href and ("chapter" in href.lower() or "ch-" in href.lower()):
                        raw_links.append((href, a.get_text(strip=True)))
            if not raw_links:
                for a in soup.find_all("a"):
                    href = a.get("href", "").strip()
                    if href and ("chapter" in href.lower() or "ch-" in href.lower()) and href != comic_url:
                        raw_links.append((href, a.get_text(strip=True)))

            seen = set()
            chapters = []
            for href, text in raw_links:
                if href in seen:
                    continue
                seen.add(href)

                num_match = re.search(r"chapter-?(\d+(?:[-.]\d+)?)", href, re.IGNORECASE) or re.search(r"ch\D*(\d+(?:[-.]\d+)?)", text, re.IGNORECASE)
                c_num = num_match.group(1).replace("-", ".") if num_match else "1"
                c_title = text.replace("\n", " ").strip()
                if not c_title or c_title.lower() in (f"chapter{c_num}", f"chapter {c_num}"):
                    c_title = f"Chapter {c_num}"

                chapters.append(ExplorerChapterItem(
                    id=f"ki-{quote(href, safe='')}",
                    chapter_number=str(c_num),
                    title=c_title,
                    pages_count=0,
                    language="id",
                    group_name="KomikIndo",
                    is_external=False,
                    external_url=href,
                    source="komikindo"
                ))

            # Helper sort ascending numeric
            def _sort_key(ch: ExplorerChapterItem):
                try:
                    return float(ch.chapter_number)
                except ValueError:
                    return 0.0

            chapters.sort(key=_sort_key)
            return chapters

        # 3. MangaDex default
        params = [
            ("limit", str(limit)),
            ("offset", str(offset)),
            ("order[chapter]", "asc"),
            ("includes[]", "scanlation_group"),
            ("contentRating[]", "safe"),
            ("contentRating[]", "suggestive"),
            ("contentRating[]", "erotica"),
        ]

        if lang and lang.lower() != "all":
            params.append(("translatedLanguage[]", lang.lower()))

        async with httpx.AsyncClient(timeout=20.0, headers=MANGADEX_HEADERS) as client:
            resp = await client.get(f"{MANGADEX_API_BASE}/manga/{manga_id}/feed", params=params)
            resp.raise_for_status()
            data = resp.json()

        chapters = []
        for item in data.get("data", []):
            c_id = item.get("id")
            attr = item.get("attributes", {})
            c_num = attr.get("chapter") or "1"
            c_title = attr.get("title")
            pages = attr.get("pages") or 0
            t_lang = attr.get("translatedLanguage") or "en"
            pub = attr.get("publishAt")
            ext_url = attr.get("externalUrl")

            group_name = None
            for rel in item.get("relationships", []):
                if rel.get("type") == "scanlation_group":
                    group_name = rel.get("attributes", {}).get("name")
                    if group_name:
                        break

            chapters.append(ExplorerChapterItem(
                id=c_id,
                chapter_number=str(c_num),
                title=c_title,
                pages_count=int(pages),
                language=t_lang,
                group_name=group_name,
                publish_at=pub,
                is_external=bool(ext_url),
                external_url=ext_url,
                source="mangadex"
            ))

        return chapters
    except Exception as e:
        logger.error(f"Explorer get chapters error ({manga_id}): {e}")
        raise HTTPException(status_code=502, detail=f"Gagal mengambil daftar bab: {str(e)}")
