import httpx
import re
import json
from pathlib import Path
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

# Load MangaDex official tags mapping
TAGS_FILE = Path(__file__).resolve().parent / "mangadex_tags.json"
MANGADEX_TAGS_MAP = {}
if TAGS_FILE.exists():
    try:
        with open(TAGS_FILE, "r", encoding="utf-8") as f:
            MANGADEX_TAGS_MAP = json.load(f)
    except Exception as e:
        logger.warning(f"Failed loading mangadex_tags.json: {e}")

# Pure Indonesian & language synonyms mapping to canonical MangaDex tag names
TAG_ALIASES = {
    "reinkarnasi": "Reincarnation",
    "reinkarnasi ke dunia lain": "Isekai",
    "isekai reinkarnasi": "Isekai",
    "dunia lain": "Isekai",
    "reverse isekai": "Isekai",
    "perjalanan waktu": "Time Travel",
    "time loop": "Time Travel",
    "rebirth": "Reincarnation",
    "transmigrasi": "Reincarnation",
    "transmigration": "Reincarnation",
    "bela diri": "Martial Arts",
    "silat": "Martial Arts",
    "pencak silat": "Martial Arts",
    "sihir": "Magic",
    "penyihir": "Magic",
    "monster": "Monsters",
    "monster girls": "Monster Girls",
    "iblis": "Demons",
    "raja iblis": "Demons",
    "demon king": "Demons",
    "hantu": "Ghosts",
    "arwah": "Ghosts",
    "game": "Video Games",
    "video game": "Video Games",
    "video games": "Video Games",
    "dunia game": "Video Games",
    "virtual reality": "Virtual Reality",
    "game virtual": "Virtual Reality",
    "romantis": "Romance",
    "komedi": "Comedy",
    "kehidupan sekolah": "School Life",
    "sekolah": "School Life",
    "high school": "School Life",
    "kantor": "Office Workers",
    "pekerja kantor": "Office Workers",
    "medis": "Medical",
    "dokter": "Medical",
    "masak": "Cooking",
    "makanan": "Cooking",
    "gourmet": "Cooking",
    "musik": "Music",
    "band": "Music",
    "idol": "Music",
    "olahraga": "Sports",
    "sport": "Sports",
    "sepak bola": "Sports",
    "hewan": "Animals",
    "pet": "Animals",
    "zombie": "Zombies",
    "zombie apocalypse": "Zombies",
    "vampir": "Vampires",
    "tragedi": "Tragedy",
    "misteri": "Mystery",
    "psikologis": "Psychological",
    "sejarah": "Historical",
    "bertahan hidup": "Survival",
    "pascakiamat": "Post-Apocalyptic",
    "apocalypse": "Post-Apocalyptic",
    "warna": "Full Color",
    "komik warna": "Full Color",
    "full color": "Full Color",
    "komik web": "Web Comic",
    "web comic": "Web Comic",
    "webtoon": "Long Strip",
    "manhwa webtoon": "Long Strip",
    "manhwa indo": "Long Strip",
    "sub indo": "Adaptation",
}

# Specific genre handlers with targeted title search, tag constraints, and tag injection
SPECIAL_GENRE_HANDLERS = {
    # 1. Yuri
    "yuri": {"tag": "Girls' Love", "exclude_tag": "Boys' Love", "inject": ["Yuri", "Girls' Love"]},
    "shoujo ai": {"tag": "Girls' Love", "exclude_tag": "Boys' Love", "inject": ["Shoujo Ai", "Girls' Love"]},
    "gl": {"tag": "Girls' Love", "exclude_tag": "Boys' Love", "inject": ["GL", "Girls' Love"]},
    # 2. Yaoi
    "yaoi": {"tag": "Boys' Love", "exclude_tag": "Girls' Love", "inject": ["Yaoi", "Boys' Love"]},
    "shounen ai": {"tag": "Boys' Love", "exclude_tag": "Girls' Love", "inject": ["Shounen Ai", "Boys' Love"]},
    "bl": {"tag": "Boys' Love", "exclude_tag": "Girls' Love", "inject": ["BL", "Boys' Love"]},
    # 3. Romcom
    "romcom": {"tag": "Romance", "tag2": "Comedy", "inject": ["Romcom", "Romance", "Comedy"]},
    "romance comedy": {"tag": "Romance", "tag2": "Comedy", "inject": ["Romance Comedy", "Romance", "Comedy"]},
    "romance comedy (romcom)": {"tag": "Romance", "tag2": "Comedy", "inject": ["Romcom", "Romance", "Comedy"]},
    "komedi romantis": {"tag": "Romance", "tag2": "Comedy", "inject": ["Komedi Romantis", "Romance", "Comedy"]},
    # 4. Murim
    "murim": {"title": "Murim", "lang": "ko", "inject": ["Murim", "Manhwa", "Martial Arts"]},
    # 5. Cultivation
    "cultivation": {"tag": "Wuxia", "title": "Cultivation", "inject": ["Cultivation", "Wuxia"]},
    "kultivasi": {"tag": "Wuxia", "title": "Cultivation", "inject": ["Kultivasi", "Wuxia"]},
    "kultivasi abadi": {"tag": "Wuxia", "title": "Cultivation", "inject": ["Kultivasi Abadi", "Wuxia"]},
    "kultivasi iblis": {"tag": "Wuxia", "title": "Cultivation", "inject": ["Kultivasi Iblis", "Wuxia"]},
    "xianxia": {"tag": "Wuxia", "title": "Xianxia", "inject": ["Xianxia", "Wuxia"]},
    "xuanhuan": {"tag": "Wuxia", "title": "Xuanhuan", "inject": ["Xuanhuan", "Wuxia"]},
    # 6. Necromancer
    "necromancer": {"title": "Necromancer", "inject": ["Necromancer", "Fantasy"]},
    # 7. Leveling
    "leveling": {"title": "Leveling", "inject": ["Leveling"]},
    "solo leveling": {"title": "Solo Leveling", "inject": ["Solo Leveling"]},
    "system leveling": {"title": "Leveling", "inject": ["System Leveling"]},
    # 8. Dungeon
    "dungeon": {"title": "Dungeon", "inject": ["Dungeon", "Fantasy"]},
    "dungeon master": {"title": "Dungeon", "inject": ["Dungeon Master", "Fantasy"]},
    # 9. Tower
    "tower": {"title": "Tower", "inject": ["Tower"]},
    "tower climbing": {"title": "Tower", "inject": ["Tower Climbing"]},
    # 10. System
    "system": {"title": "System", "inject": ["System"]},
    "system hunter": {"title": "System", "inject": ["System Hunter"]},
    # 11. Otome
    "otome": {"tag": "Villainess", "title": "Otome", "inject": ["Otome", "Villainess"]},
    "otome game": {"tag": "Villainess", "title": "Otome", "inject": ["Otome Game", "Villainess"]},
    "otome isekai": {"tag": "Villainess", "title": "Otome", "inject": ["Otome Isekai", "Villainess"]},
    # 12. Villainess
    "villainess": {"tag": "Villainess", "inject": ["Villainess"]},
    "villainess redemption": {"tag": "Villainess", "inject": ["Villainess Redemption"]},
    # 13. Regression
    "regression": {"title": "Regression", "tag": "Time Travel", "inject": ["Regression", "Time Travel"]},
    "regresi": {"title": "Regression", "tag": "Time Travel", "inject": ["Regresi", "Time Travel"]},
    "regresi (regression)": {"title": "Regression", "tag": "Time Travel", "inject": ["Regresi", "Time Travel"]},
    # 14. Revenge
    "revenge": {"title": "Revenge", "inject": ["Revenge"]},
    "balas dendam": {"title": "Revenge", "inject": ["Balas Dendam"]},
    "pembalasan dendam": {"title": "Revenge", "inject": ["Pembalasan Dendam"]},
    # 15. Overpowered
    "overpowered": {"title": "Overpowered", "inject": ["Overpowered"]},
    "overpowered (op mc)": {"title": "Overpowered", "inject": ["Overpowered (OP MC)"]},
    "op mc": {"title": "Overpowered", "inject": ["OP MC"]},
    # 16. Hunter
    "hunter": {"title": "Hunter", "inject": ["Hunter"]},
    "hunters": {"title": "Hunter", "inject": ["Hunters"]},
    # 17. Academy
    "academy": {"title": "Academy", "tag": "School Life", "inject": ["Academy", "School Life"]},
    "akademi": {"title": "Academy", "tag": "School Life", "inject": ["Akademi", "School Life"]},
    "magic academy": {"title": "Academy", "tag": "Magic", "inject": ["Magic Academy", "Magic"]},
    "akademi sihir": {"title": "Academy", "tag": "Magic", "inject": ["Akademi Sihir", "Magic"]},
}

def get_mangadex_tag_id(name: str) -> Optional[str]:
    if not MANGADEX_TAGS_MAP:
        return None
    clean = name.strip().lower()
    if clean in TAG_ALIASES:
        clean = TAG_ALIASES[clean].lower()
    for tag_name, tag_id in MANGADEX_TAGS_MAP.items():
        if tag_name.lower() == clean:
            return tag_id
    return None

def apply_mangadex_filters(params: list, genres: Optional[str]):
    """
    Applies demographic, format, tag filters, and special handlers.
    Returns: (unmatched_keywords: List[str], inject_tags: List[str], title_override: Optional[str])
    """
    unmatched_keywords = []
    inject_tags = []
    title_override = None

    if not genres:
        return unmatched_keywords, inject_tags, title_override

    for g in genres.split(","):
        g_clean = g.strip()
        if not g_clean:
            continue
        g_lower = g_clean.lower()

        # 1. Check special genre handler first
        if g_lower in SPECIAL_GENRE_HANDLERS:
            h = SPECIAL_GENRE_HANDLERS[g_lower]
            if "inject" in h:
                inject_tags.extend(h["inject"])
            if "tag" in h:
                tid = MANGADEX_TAGS_MAP.get(h["tag"])
                if tid and ("includedTags[]", tid) not in params:
                    params.append(("includedTags[]", tid))
            if "tag2" in h:
                tid2 = MANGADEX_TAGS_MAP.get(h["tag2"])
                if tid2 and ("includedTags[]", tid2) not in params:
                    params.append(("includedTags[]", tid2))
            if "exclude_tag" in h:
                etid = MANGADEX_TAGS_MAP.get(h["exclude_tag"])
                if etid and ("excludedTags[]", etid) not in params:
                    params.append(("excludedTags[]", etid))
            if "lang" in h:
                if ("originalLanguage[]", h["lang"]) not in params:
                    params.append(("originalLanguage[]", h["lang"]))
            if "title" in h and not title_override:
                title_override = h["title"]
            continue

        # 2. Demographic
        if g_lower in ("shounen", "shoujo", "seinen", "josei"):
            params.append(("publicationDemographic[]", g_lower))
            inject_tags.append(g_clean)
        # 3. Origin
        elif g_lower in ("manhwa", "korean", "raw korea", "🇰🇷 raw korea"):
            params.append(("originalLanguage[]", "ko"))
            inject_tags.append("Manhwa")
        elif g_lower in ("manhua", "chinese", "raw china", "🇨🇳 raw china"):
            params.append(("originalLanguage[]", "zh"))
            inject_tags.append("Manhua")
        elif g_lower in ("manga", "japanese", "raw jepang", "🇯🇵 raw jepang"):
            params.append(("originalLanguage[]", "ja"))
            inject_tags.append("Manga")
        # 4. Rating
        elif g_lower in ("ecchi", "erotica"):
            if ("contentRating[]", "erotica") not in params:
                params.append(("contentRating[]", "erotica"))
            inject_tags.append("Ecchi")
        elif g_lower == "safe":
            params.append(("contentRating[]", "safe"))
        elif g_lower == "suggestive":
            params.append(("contentRating[]", "suggestive"))
        # 5. Tag Map
        else:
            tag_id = get_mangadex_tag_id(g_clean)
            if tag_id:
                if ("includedTags[]", tag_id) not in params:
                    params.append(("includedTags[]", tag_id))
                inject_tags.append(g_clean)
            else:
                unmatched_keywords.append(g_clean)
                inject_tags.append(g_clean)

    return unmatched_keywords, inject_tags, title_override

def validate_manga_matches_genres(
    searched_genres: List[str],
    tags: List[str],
    title: str,
    desc: Optional[str] = None,
    orig_lang: Optional[str] = None
) -> bool:
    """
    Guarantees that a returned manga genuinely satisfies ALL searched genres.
    Rejects false positives (e.g. SPY x FAMILY for Murim, or Boys' Love for Yuri).
    """
    title_l = (title or "").lower()
    desc_l = (desc or "").lower()
    tags_l = [t.lower() for t in tags]

    for g in searched_genres:
        gl = g.lower().strip()
        if not gl:
            continue

        # 1. Yuri / Girls' Love
        if gl in ("yuri", "shoujo ai", "gl", "girls' love"):
            if "boys' love" in tags_l or "yaoi" in tags_l:
                return False
            if "girls' love" not in tags_l and "yuri" not in tags_l and "yuri" not in title_l:
                return False

        # 2. Yaoi / Boys' Love
        elif gl in ("yaoi", "shounen ai", "bl", "boys' love"):
            if "girls' love" in tags_l or "yuri" in tags_l:
                return False
            if "boys' love" not in tags_l and "yaoi" not in tags_l and "yaoi" not in title_l:
                return False

        # 3. Murim
        elif gl == "murim":
            is_murim = (
                "murim" in title_l
                or "murim" in desc_l
                or (orig_lang in ("ko", "zh") and any(t in ("martial arts", "wuxia") for t in tags_l))
            )
            if not is_murim or (orig_lang == "ja" and "murimuri" in title_l):
                return False

        # 4. Cultivation / Kultivasi
        elif gl in ("cultivation", "kultivasi", "xianxia", "xuanhuan"):
            is_cult = (
                "wuxia" in tags_l
                or any(k in title_l or k in desc_l for k in ("cultivat", "xianxia", "xuanhuan", "immortal", "daoist", "sect master", "spirit root"))
            )
            if not is_cult:
                return False

        # 5. Necromancer
        elif gl == "necromancer":
            if "necromanc" not in title_l and "necromanc" not in desc_l:
                return False

        # 6. Leveling
        elif gl in ("leveling", "solo leveling", "system leveling"):
            if "level" not in title_l and "level" not in desc_l:
                return False

        # 7. Dungeon
        elif gl in ("dungeon", "dungeon master"):
            if "dungeon" not in title_l and "labyrinth" not in title_l and "dungeon" not in desc_l:
                return False

        # 8. Tower
        elif gl in ("tower", "tower climbing"):
            if "tower" not in title_l and "tower" not in desc_l:
                return False

        # 9. Villainess
        elif gl in ("villainess", "villainess redemption"):
            if "villainess" not in tags_l and "akuyaku" not in title_l and "villainess" not in title_l:
                return False

        # 10. General tags: verify tag or title contains it
        else:
            tag_match = any(gl == t or gl in t for t in tags_l)
            text_match = bool(re.search(r"\b" + re.escape(gl) + r"\b", title_l)) or gl in desc_l
            if not (tag_match or text_match):
                return False

    return True

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

async def _search_mangadex(q: str, limit: int, genres: Optional[str] = None) -> List[ExplorerMangaItem]:
    fetch_limit = min(limit * 2, 50) if genres else limit
    params = [
        ("limit", str(fetch_limit)),
        ("includes[]", "cover_art"),
        ("contentRating[]", "safe"),
        ("contentRating[]", "suggestive"),
        ("contentRating[]", "erotica"),
    ]

    unmatched, inject_tags, title_override = apply_mangadex_filters(params, genres)

    if q.strip():
        search_query = f"{q.strip()} {' '.join(unmatched)}".strip()
        params.append(("title", search_query))
        params.append(("order[relevance]", "desc"))
    elif title_override:
        params.append(("title", title_override))
        params.append(("order[relevance]", "desc"))
    elif unmatched:
        params.append(("title", " ".join(unmatched)))
        params.append(("order[relevance]", "desc"))
    else:
        params.append(("order[followedCount]", "desc"))

    async with httpx.AsyncClient(timeout=20.0, headers=MANGADEX_HEADERS) as client:
        resp = await client.get(f"{MANGADEX_API_BASE}/manga", params=params)
        resp.raise_for_status()
        data = resp.json()

    searched_list = [g.strip() for g in genres.split(",") if g.strip()] if genres else []

    results = []
    for item in data.get("data", []):
        m_id = item.get("id")
        attr = item.get("attributes", {})
        orig_lang = attr.get("originalLanguage", "ja")
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

        # Extract all tags
        raw_tags = []
        for t in attr.get("tags", []):
            t_name = t.get("attributes", {}).get("name", {}).get("en")
            if t_name and t_name not in raw_tags:
                raw_tags.append(t_name)

        # Validate that this manga genuinely matches all searched genres
        if searched_list:
            if not validate_manga_matches_genres(searched_list, raw_tags, title, desc, orig_lang):
                continue

        # Enrich tags so that the searched genres are prominent and present
        final_tags = []
        for g_s in searched_list:
            if g_s not in final_tags:
                final_tags.append(g_s)
        for g_inj in inject_tags:
            if g_inj not in final_tags:
                final_tags.append(g_inj)
        for t in raw_tags:
            if t not in final_tags:
                final_tags.append(t)

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
            tags=final_tags,
            source="mangadex",
            original_url=f"https://mangadex.org/title/{m_id}"
        ))

        if len(results) >= limit:
            break

    return results

async def _search_raw_manga(q: str, limit: int, genres: Optional[str] = None) -> List[ExplorerMangaItem]:
    fetch_limit = min(limit * 2, 50) if genres else limit
    params = [
        ("limit", str(fetch_limit)),
        ("originalLanguage[]", "ja"),
        ("originalLanguage[]", "ko"),
        ("includes[]", "cover_art"),
        ("contentRating[]", "safe"),
        ("contentRating[]", "suggestive"),
        ("contentRating[]", "erotica"),
    ]

    unmatched, inject_tags, title_override = apply_mangadex_filters(params, genres)

    if q.strip():
        search_query = f"{q.strip()} {' '.join(unmatched)}".strip()
        params.append(("title", search_query))
        params.append(("order[relevance]", "desc"))
    elif title_override:
        params.append(("title", title_override))
        params.append(("order[relevance]", "desc"))
    elif unmatched:
        params.append(("title", " ".join(unmatched)))
        params.append(("order[relevance]", "desc"))
    else:
        params.append(("order[followedCount]", "desc"))

    async with httpx.AsyncClient(timeout=20.0, headers=MANGADEX_HEADERS) as client:
        resp = await client.get(f"{MANGADEX_API_BASE}/manga", params=params)
        resp.raise_for_status()
        data = resp.json()

    searched_list = [g.strip() for g in genres.split(",") if g.strip()] if genres else []

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

        # Extract all tags
        raw_tags = [lang_label, "RAW"]
        for t in attr.get("tags", []):
            t_name = t.get("attributes", {}).get("name", {}).get("en")
            if t_name and t_name not in raw_tags:
                raw_tags.append(t_name)

        # Validate that this manga genuinely matches all searched genres
        if searched_list:
            if not validate_manga_matches_genres(searched_list, raw_tags, title, desc, orig_lang):
                continue

        # Enrich tags with matched and injected tags at the very front
        final_tags = []
        for g_s in searched_list:
            if g_s not in final_tags:
                final_tags.append(g_s)
        for g_inj in inject_tags:
            if g_inj not in final_tags:
                final_tags.append(g_inj)
        for t in raw_tags:
            if t not in final_tags:
                final_tags.append(t)

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
            tags=final_tags,
            source="raw",
            original_url=f"https://mangadex.org/title/{m_id}"
        ))

        if len(results) >= limit:
            break

    return results

async def _search_komikindo(q: str, limit: int, genres: Optional[str] = None) -> List[ExplorerMangaItem]:
    # Fallback to MangaDex Indonesian-translated catalog
    try:
        fetch_limit = min(limit * 2, 50) if genres else limit
        params = [
            ("limit", str(fetch_limit)),
            ("availableTranslatedLanguage[]", "id"),
            ("includes[]", "cover_art"),
            ("contentRating[]", "safe"),
            ("contentRating[]", "suggestive"),
        ]

        unmatched, inject_tags, title_override = apply_mangadex_filters(params, genres)

        if q.strip():
            search_query = f"{q.strip()} {' '.join(unmatched)}".strip()
            params.append(("title", search_query))
            params.append(("order[relevance]", "desc"))
        elif title_override:
            params.append(("title", title_override))
            params.append(("order[relevance]", "desc"))
        elif unmatched:
            params.append(("title", " ".join(unmatched)))
            params.append(("order[relevance]", "desc"))
        else:
            params.append(("order[followedCount]", "desc"))

        async with httpx.AsyncClient(timeout=15.0, headers=MANGADEX_HEADERS) as client:
            resp = await client.get(f"{MANGADEX_API_BASE}/manga", params=params)
            if resp.status_code == 200:
                data = resp.json()
                searched_list = [g.strip() for g in genres.split(",") if g.strip()] if genres else []
                results = []
                for item in data.get("data", []):
                    m_id = item.get("id")
                    attr = item.get("attributes", {})
                    orig_lang = attr.get("originalLanguage", "")
                    t_dict = attr.get("title", {})
                    title = None
                    if isinstance(t_dict, dict) and t_dict:
                        title = t_dict.get("en") or t_dict.get("ja-ro") or next(iter(t_dict.values()), None)
                    if not title:
                        title = "Untitled Manga"

                    desc_dict = attr.get("description", {})
                    desc = None
                    if isinstance(desc_dict, dict) and desc_dict:
                        desc = desc_dict.get("en") or next(iter(desc_dict.values()), None)

                    raw_tags = ["Sub Indo", "Bahasa ID"]
                    for t in attr.get("tags", []):
                        t_name = t.get("attributes", {}).get("name", {}).get("en")
                        if t_name and t_name not in raw_tags:
                            raw_tags.append(t_name)

                    # Validate that this manga genuinely matches all searched genres
                    if searched_list:
                        if not validate_manga_matches_genres(searched_list, raw_tags, title, desc, orig_lang):
                            continue

                    # Enrich tags with matched and injected tags at the very front
                    final_tags = []
                    for g_s in searched_list:
                        if g_s not in final_tags:
                            final_tags.append(g_s)
                    for g_inj in inject_tags:
                        if g_inj not in final_tags:
                            final_tags.append(g_inj)
                    for t in raw_tags:
                        if t not in final_tags:
                            final_tags.append(t)

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
                        description=desc or "Tersedia Bab Bahasa Indonesia (Scanlation Indo)",
                        status=attr.get("status"),
                        year=attr.get("year"),
                        cover_url=cover_url,
                        tags=final_tags,
                        source="komikindo",
                        original_url=f"https://mangadex.org/title/{m_id}"
                    ))

                    if len(results) >= limit:
                        break

                return results
    except Exception as e:
        logger.warning(f"Indonesian fallback search error: {e}")

    return []

async def _search_nhentai(q: str, limit: int, genres: Optional[str] = None) -> List[ExplorerMangaItem]:
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

                    # Extract all tags from detail page
                    raw_tags = [t.get_text(strip=True) for t in soup.select(".tag-container .tags a .name")]
                    tags = ["Doujinshi", "18+"] + [t for t in raw_tags if t not in ("Doujinshi", "18+")]

                    results.append(ExplorerMangaItem(
                        id=f"nh-{clean_q}",
                        title=title,
                        description=f"Kode Doujinshi #{clean_q}",
                        status="Completed",
                        cover_url=cover_proxy,
                        tags=tags,
                        source="nhentai",
                        original_url=f"https://nhentai.to/g/{clean_q}/"
                    ))
                    return results
        except Exception as e:
            logger.warning(f"Direct nhentai code fetch error: {e}")

    # General search with query or genres
    try:
        search_terms = []
        if clean_q:
            search_terms.append(clean_q)
        if genres:
            for g in genres.split(","):
                g_c = g.strip()
                if g_c:
                    search_terms.append(g_c)

        query_str = " ".join(search_terms) if search_terms else "popular"
        search_url = f"https://nhentai.to/search?q={quote(query_str)}"
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

                    tags = ["Doujinshi", "18+"]
                    if genres:
                        for gn in genres.split(","):
                            if gn.strip() and gn.strip() not in tags:
                                tags.append(gn.strip())

                    results.append(ExplorerMangaItem(
                        id=f"nh-{code}",
                        title=title,
                        description=f"Doujinshi galeri #{code}",
                        status="18+",
                        cover_url=cover_proxy,
                        tags=tags,
                        source="nhentai",
                        original_url=f"https://nhentai.to/g/{code}/"
                    ))
    except Exception as e:
        logger.warning(f"nhentai search error: {e}")

    return results

@router.get("/search", response_model=List[ExplorerMangaItem])
async def search_manga(
    q: str = Query("", description="Kata kunci pencarian judul manga (opsional jika menggunakan filter genre)"),
    source: str = Query("mangadex", description="Sumber pencarian: mangadex, raw, komikindo, nhentai"),
    genres: Optional[str] = Query(None, description="Daftar genre dipisah koma (multi-select)"),
    limit: int = Query(24, ge=1, le=50)
):
    source_clean = source.strip().lower()
    q_clean = q.strip()
    genres_clean = genres.strip() if genres else None

    if not q_clean and not genres_clean:
        return []

    try:
        if source_clean in ("raw", "jepang", "korea"):
            return await _search_raw_manga(q_clean, limit=limit, genres=genres_clean)
        elif source_clean == "nhentai":
            return await _search_nhentai(q_clean, limit=limit, genres=genres_clean)
        elif source_clean in ("komikindo", "indo", "id"):
            return await _search_komikindo(q_clean, limit=limit, genres=genres_clean)
        else:
            return await _search_mangadex(q_clean, limit=limit, genres=genres_clean)
    except Exception as e:
        logger.error(f"Explorer search error (source={source_clean}, q={q_clean}, genres={genres_clean}): {e}")
        raise HTTPException(status_code=502, detail=f"Gagal mencari manga: {str(e)}")

@router.get("/manga/{manga_id}/details", response_model=ExplorerMangaItem)
async def get_manga_details(manga_id: str):
    try:
        if manga_id.startswith("nh-"):
            code = manga_id[3:]
            detail_url = f"https://nhentai.to/g/{code}/"
            async with httpx.AsyncClient(timeout=15.0, headers=WEB_HEADERS, follow_redirects=True) as client:
                resp = await client.get(detail_url)
                if resp.status_code == 200:
                    soup = BeautifulSoup(resp.text, "html.parser")
                    title_el = soup.select_one("#info h1, #info h2, h1")
                    title = title_el.get_text(strip=True) if title_el else f"Doujinshi #{code}"
                    cover_el = soup.select_one("#cover img")
                    cover_src = (cover_el.get("src") or cover_el.get("data-src") or "") if cover_el else ""
                    cover_proxy = f"/api/proxy/image?url={quote(cover_src, safe='')}" if cover_src else None
                    raw_tags = [t.get_text(strip=True) for t in soup.select(".tag-container .tags a .name")]
                    tags = ["Doujinshi", "18+"] + [t for t in raw_tags if t not in ("Doujinshi", "18+")]
                    return ExplorerMangaItem(
                        id=f"nh-{code}",
                        title=title,
                        description=f"Doujinshi #{code}",
                        status="Completed",
                        cover_url=cover_proxy,
                        tags=tags,
                        source="nhentai",
                        original_url=detail_url
                    )
        elif manga_id.startswith("ki-"):
            comic_url = unquote(manga_id[3:])
            async with httpx.AsyncClient(timeout=15.0, headers=WEB_HEADERS, follow_redirects=True) as client:
                resp = await client.get(comic_url)
                if resp.status_code == 200:
                    soup = BeautifulSoup(resp.text, "html.parser")
                    title_el = soup.select_one(".entry-title, h1.judul, h1")
                    title = title_el.get_text(strip=True) if title_el else "Komik Indo"
                    cover_el = soup.select_one(".thumb img, .animecover img")
                    cover_src = (cover_el.get("src") or cover_el.get("data-src") or "") if cover_el else ""
                    cover_proxy = f"/api/proxy/image?url={quote(cover_src, safe='')}" if cover_src else None
                    genre_els = soup.select(".genre-info a, .spe a, .genres-container a")
                    tags = [g.get_text(strip=True) for g in genre_els] or ["Manga", "Indonesia"]
                    return ExplorerMangaItem(
                        id=manga_id,
                        title=title,
                        description="Komik Indonesia dari Komikindo",
                        status="Ongoing",
                        cover_url=cover_proxy,
                        tags=tags,
                        source="komikindo",
                        original_url=comic_url
                    )
        else:
            # MangaDex manga detail
            async with httpx.AsyncClient(timeout=15.0, headers=MANGADEX_HEADERS) as client:
                resp = await client.get(f"{MANGADEX_API_BASE}/manga/{manga_id}?includes[]=cover_art")
                if resp.status_code == 200:
                    item = resp.json().get("data", {})
                    attr = item.get("attributes", {})
                    t_dict = attr.get("title", {})
                    title = next(iter(t_dict.values()), "Untitled Manga") if t_dict else "Untitled Manga"
                    desc_dict = attr.get("description", {})
                    desc = desc_dict.get("en") or next(iter(desc_dict.values()), None) if desc_dict else None
                    tags = []
                    for t in attr.get("tags", []):
                        t_name = t.get("attributes", {}).get("name", {}).get("en")
                        if t_name and t_name not in tags:
                            tags.append(t_name)

                    # Enrich with recognizable sub-genres and synonyms
                    title_l = title.lower()
                    desc_l = (desc or "").lower()
                    orig_lang = attr.get("originalLanguage", "")
                    if "murim" in title_l or "murim" in desc_l or (orig_lang in ("ko", "zh") and any(t.lower() in ("martial arts", "wuxia") for t in tags)):
                        if "Murim" not in tags:
                            tags.insert(0, "Murim")
                    if "cultivat" in title_l or "cultivat" in desc_l or "Wuxia" in tags:
                        if "Cultivation" not in tags:
                            tags.insert(0, "Cultivation")
                    if "necromanc" in title_l or "necromanc" in desc_l:
                        if "Necromancer" not in tags:
                            tags.insert(0, "Necromancer")
                    if "level" in title_l or "level" in desc_l:
                        if "Leveling" not in tags:
                            tags.insert(0, "Leveling")
                    if "dungeon" in title_l or "dungeon" in desc_l or "labyrinth" in title_l:
                        if "Dungeon" not in tags:
                            tags.insert(0, "Dungeon")
                    if "tower" in title_l or "tower" in desc_l:
                        if "Tower" not in tags:
                            tags.insert(0, "Tower")
                    if "Girls' Love" in tags and "Yuri" not in tags:
                        tags.insert(0, "Yuri")
                    if "Boys' Love" in tags and "Yaoi" not in tags:
                        tags.insert(0, "Yaoi")
                    if "Reincarnation" in tags and "Reinkarnasi" not in tags:
                        tags.append("Reinkarnasi")
                    cover_file = None
                    for rel in item.get("relationships", []):
                        if rel.get("type") == "cover_art":
                            cover_file = rel.get("attributes", {}).get("fileName")
                            break
                    cover_url = f"/api/proxy/image?url=https://uploads.mangadex.org/covers/{manga_id}/{cover_file}.256.jpg" if cover_file else None
                    return ExplorerMangaItem(
                        id=manga_id,
                        title=title,
                        description=desc,
                        status=attr.get("status"),
                        year=attr.get("year"),
                        cover_url=cover_url,
                        tags=tags,
                        source="mangadex",
                        original_url=f"https://mangadex.org/title/{manga_id}"
                    )
    except Exception as e:
        logger.warning(f"Failed to get manga details for {manga_id}: {e}")
    raise HTTPException(status_code=404, detail=f"Manga details tidak ditemukan untuk ID {manga_id}")

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

            def _sort_key(ch: ExplorerChapterItem):
                try:
                    return float(ch.chapter_number)
                except ValueError:
                    return 0.0

            chapters.sort(key=_sort_key)
            return chapters

        # 3. MangaDex default & fallback
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
