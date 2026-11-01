from fastapi import APIRouter
import httpx

router = APIRouter(tags=["Health"])

CURRENT_VERSION = {
    "version": "1.3.0",
    "release_date": "1 November 2026",
    "title": "MangaID Universal Multi-Source Explorer",
    "changelog": [
        "Pencarian Multi-Sumber (Explorer): Bebas pilih sumber pencarian antara MangaDex, Komik Indo (Komikindo), atau nhentai (Doujinshi 18+)",
        "Zero Duplikat: Hasil pencarian rapi terisolasi per provider pilihan tanpa judul kembar",
        "Proxy Cover Gambar Universal: Dukungan anti-hotlink untuk poster Komikindo dan nhentai",
        "One-Click Ingestion: Langsung terjemahkan bab komik/doujinshi dari katalog tanpa copy-paste URL",
        "Sistem Notifikasi Update In-App & Native Web Push"
    ]
}

@router.get("/health")
def health_check():
    return {
        "status": "ok",
        "app": "MangaID",
        "version": CURRENT_VERSION["version"]
    }

@router.get("/version")
def get_version():
    return CURRENT_VERSION

@router.get("/diag")
async def run_diag(url: str):
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    }
    async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as c:
        try:
            r = await c.get(url, headers=headers)
            return {"url": url, "status": r.status_code, "len": len(r.text), "preview": r.text[:200]}
        except Exception as e:
            return {"url": url, "error": str(e)}
