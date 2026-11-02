from fastapi import APIRouter
import httpx

router = APIRouter(tags=["Health"])

CURRENT_VERSION = {
    "version": "1.5.3",
    "release_date": "2 November 2026",
    "title": "MangaID MangaDex Cache-Busted Image CDN & Dual Fallback",
    "changelog": [
        "Instant Cache-Buster Gambar (?v=2): Mengatasi disk cache browser yang menyimpan respons kosong dengan parameter versi unik, memaksa browser mengambil gambar asli secara instan",
        "Perbaikan Pemuatan Cover MangaDex: Mengatasi gambar hitam/kosong dengan menyesuaikan User-Agent resmi MangaID pada proxy backend (menghindari Cloudflare edge verification di uploads.mangadex.org)",
        "Dual-Layer Fallback Otomatis: Klien web otomatis mencoba muat gambar langsung tanpa referer jika proxy mengalami jeda",
        "Pemisahan 3 Halaman Utama Dedikasi: Navigasi bersih terbagi utuh antara Jelajah (Katalog Manga), Penerjemah (Studio Translasi AI), dan Koleksi (Perpustakaan Pribadi & Riwayat)",
        "Zero-Click Popular Manga Homepage: 24 manga terpopuler langsung tampil otomatis saat web dibuka",
        "Featured Hero Banner Carousel: Banner unggulan dinamis dengan latar blur sinematik, poster rasio 7:10, tag genre, dan sinopsis cerita"
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
