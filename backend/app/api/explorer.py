import httpx
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from ..core.logging import logger

router = APIRouter(prefix="/explorer", tags=["Explorer"])

MANGADEX_API_BASE = "https://api.mangadex.org"
MANGADEX_HEADERS = {
    "User-Agent": "MangaID/1.0 (https://github.com/mangaid-app)",
    "Accept": "application/json"
}

class ExplorerMangaItem(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    status: Optional[str] = None
    year: Optional[int] = None
    cover_url: Optional[str] = None
    tags: List[str] = []

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

@router.get("/search", response_model=List[ExplorerMangaItem])
async def search_manga(
    q: str = Query(..., min_length=1, description="Search keyword for manga title"),
    limit: int = Query(24, ge=1, le=50)
):
    try:
        params = [
            ("title", q.strip()),
            ("limit", str(limit)),
            ("includes[]", "cover_art"),
            ("order[relevance]", "desc"),
            ("contentRating[]", "safe"),
            ("contentRating[]", "suggestive"),
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
            # Get best title
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

            # Get description
            desc_dict = attr.get("description", {})
            desc = None
            if isinstance(desc_dict, dict) and desc_dict:
                desc = desc_dict.get("en") or next(iter(desc_dict.values()), None)

            # Get tags
            tags = []
            for t in attr.get("tags", []):
                t_name = t.get("attributes", {}).get("name", {}).get("en")
                if t_name:
                    tags.append(t_name)

            # Cover art
            cover_url = None
            for rel in item.get("relationships", []):
                if rel.get("type") == "cover_art":
                    file_name = rel.get("attributes", {}).get("fileName")
                    if file_name:
                        cover_url = f"https://uploads.mangadex.org/covers/{m_id}/{file_name}.256.jpg"
                    break

            results.append(ExplorerMangaItem(
                id=m_id,
                title=title,
                description=desc,
                status=attr.get("status"),
                year=attr.get("year"),
                cover_url=cover_url,
                tags=tags[:5]
            ))

        return results
    except Exception as e:
        logger.error(f"Explorer search error: {e}")
        raise HTTPException(status_code=502, detail=f"Gagal mencari manga di MangaDex: {str(e)}")

@router.get("/manga/{manga_id}/chapters", response_model=List[ExplorerChapterItem])
async def get_manga_chapters(
    manga_id: str,
    lang: str = Query("all", description="Translated language filter (en, id, ja, all)"),
    limit: int = Query(100, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    try:
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

            # Group
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
                external_url=ext_url
            ))

        return chapters
    except Exception as e:
        logger.error(f"Explorer get chapters error: {e}")
        raise HTTPException(status_code=502, detail=f"Gagal mengambil daftar bab: {str(e)}")
