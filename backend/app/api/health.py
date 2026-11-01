from fastapi import APIRouter

router = APIRouter(tags=["Health"])

CURRENT_VERSION = {
    "version": "1.2.0",
    "release_date": "1 November 2026",
    "title": "MangaID Truly Universal Multi-Source Edition",
    "changelog": [
        "Ekspansi Multi-Sumber Universal: Dukungan penuh MangaDex, nhentai (doujinshi 18+), Komikindo, Kiryuu, Manganato, dsb",
        "Direct Doujinshi Code Resolver: Cukup masukkan angka kode (misal 177013) langsung otomatis diekstrak",
        "Adapter Khusus Komik Indo: Ekstraksi gambar komik dari tema pembaca MangaReader & Madara (anti-hotlink bypass)",
        "Adapter Manganato & Global Manga: Otomatisasi referer headers untuk CDN proteksi tinggi",
        "Sistem Notifikasi Native & In-App terintegrasi"
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
