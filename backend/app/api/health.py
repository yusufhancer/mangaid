from fastapi import APIRouter

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
