from fastapi import APIRouter
import httpx

router = APIRouter(tags=["Health"])

CURRENT_VERSION = {
    "version": "1.4.6",
    "release_date": "2 November 2026",
    "title": "MangaID Mobile Reader Polish, Robust Audio & Permanent Dual-Sync",
    "changelog": [
        "Header Pembaca HP Bersih & Ergonomis: Menu Opsi (Bottom Sheet) praktis di HP dengan tombol besar ramah jempol sehingga layar baca tidak penuh sesak",
        "Pergantian Mode Baca Responsif (Slide <-> Webtoon): Beralih instan antara Mode Slide dan Mode Webtoon dengan sinkronisasi halaman aktif otomatis",
        "Audiobook Pintar per Slide: Pada mode slide, audio AI otomatis memutar narasi slide yang sedang dibuka (tidak mengulang dari awal) dan dilengkapi fallback Web Speech",
        "Penyimpanan Database Permanen (Anti-Reset): Koleksi seri manga dan riwayat baca tersimpan permanen secara ganda (Dual-Sync SQLite + LocalStorage), dijamin tidak pernah hilang saat update aplikasi"
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
