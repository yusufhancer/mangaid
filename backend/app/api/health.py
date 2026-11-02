from fastapi import APIRouter
import httpx

router = APIRouter(tags=["Health"])

CURRENT_VERSION = {
    "version": "1.5.1",
    "release_date": "2 November 2026",
    "title": "MangaID MangaDex True Split Architecture & Zero-Click Popular Catalog",
    "changelog": [
        "Pemisahan 3 Halaman Utama Dedikasi: Navigasi bersih terbagi utuh antara Jelajah (Katalog Manga), Penerjemah (Studio Translasi AI), dan Koleksi (Perpustakaan Pribadi & Riwayat)",
        "Zero-Click Popular Manga Homepage: Saat pertama kali membuka MangaID, 24 manga terpopuler langsung tampil otomatis layaknya beranda MangaDex tanpa perlu mencari manual",
        "Featured Hero Banner Carousel: Banner unggulan dinamis dengan latar blur sinematik, poster rasio 7:10, tag genre, sinopsis cerita, dan navigasi slide",
        "Pemilih Sumber Web Cepat: Tombol sumber di bagian atas Jelajah (🌐 MangaDex, 🇮🇩 Komik Indo, 🔞 nhentai, 🇯🇵 RAW Manga) yang otomatis menyegarkan katalog populer sumber bersangkutan",
        "Stabilitas & Logika 100% Utuh: Mesin penerjemah AI, pembaca slide/webtoon, audiobook per slide, dan dual-sync database tetap berjalan sempurna"
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
