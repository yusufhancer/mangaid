from fastapi import APIRouter
import httpx

router = APIRouter(tags=["Health"])

CURRENT_VERSION = {
    "version": "1.5.2",
    "release_date": "2 November 2026",
    "title": "MangaID MangaDex Bulletproof Image CDN Proxy & Dual Fallback",
    "changelog": [
        "Perbaikan Pemuatan Cover MangaDex: Mengatasi gambar hitam/kosong dengan menyesuaikan User-Agent resmi MangaID pada proxy backend (menghindari Cloudflare edge verification di uploads.mangadex.org)",
        "Dual-Layer Fallback Otomatis: Klien web kini otomatis mencoba muat gambar langsung tanpa referer (referrerPolicy no-referrer) jika proxy mengalami jeda",
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
