from fastapi import APIRouter
import httpx

router = APIRouter(tags=["Health"])

CURRENT_VERSION = {
    "version": "1.4.0",
    "release_date": "1 November 2026",
    "title": "MangaID Truly Universal Edition with RAW Manga, Multi-Genre Filter & Direct Reader",
    "changelog": [
        "Dukungan RAW Manga: Eksplorasi ribuan manga & manhwa RAW rilis resmi Jepang (JA) dan Korea (KO)",
        "Opsi 'Baca Langsung' & Otomatis Simpan Riwayat: Langsung baca bab komik tanpa proses terjemahan AI dengan viewer bebas iklan",
        "Filter Multi-Genre: Bebas filter komik berdasarkan lebih dari 1 genre sekaligus (Action, Romance, Isekai, Comedy, dsb)",
        "Pencarian Multi-Sumber Terpadu: MangaDex Global, RAW Manga, Komik Indo, dan nhentai 18+",
        "Perbaikan Sistem Navigasi Chapter & Performa Image Proxy"
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
