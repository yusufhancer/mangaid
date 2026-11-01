from fastapi import APIRouter
import httpx

router = APIRouter(tags=["Health"])

CURRENT_VERSION = {
    "version": "1.4.1",
    "release_date": "1 November 2026",
    "title": "MangaID Universal - Source-Specific Genres & Interconnected Tag Explorer",
    "changelog": [
        "Filter Genre Khusus Tiap Sumber: Genre/tag menyesuaikan web masing-masing (MangaDex, RAW Manga, Komik Indo, dan nhentai 18+) tanpa bercampur",
        "Pencarian Berdasarkan Genre Saja: Bisa mencari komik hanya dengan memilih genre tanpa wajib mengetik teks",
        "Interkoneksi Genre & Detail Manga: Seluruh tag komik ditampilkan lengkap (tanpa terpotong) dan tiap tag bisa langsung diklik untuk mencari komik serupa",
        "Auto Scrape Full Tags nhentai: Menampilkan seluruh 20+ tag doujinshi asli secara lengkap dan dinamis",
        "Dukungan RAW Manga, Opsi Baca Langsung & Riwayat Otomatis"
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
