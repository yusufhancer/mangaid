from fastapi import APIRouter
import httpx

router = APIRouter(tags=["Health"])

CURRENT_VERSION = {
    "version": "1.4.8",
    "release_date": "2 November 2026",
    "title": "MangaID Instant Open (No Splash) & Bulletproof Engine",
    "changelog": [
        "Membuka Web Langsung Instan: Animasi splash screen intro saat awal masuk telah dihapus secara menyeluruh, antarmuka web sekarang langsung siap digunakan tanpa jeda waktu tunggu",
        "Integrasi Penuh nhentai v2 API: Browser TLS fingerprint impersonation (curl_cffi chrome124) dan multi-tier fallback (Cubari, Website mirror) bebas 403 Forbidden",
        "Explorer Detail & Multi-Mirror Stabil: Ekstraksi tag/genre lengkap dan proxy gambar CDN anti-blokir",
        "Mempertahankan UI Mobile Ergonomis & Database Koleksi Permanen (v1.4.6)"
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
