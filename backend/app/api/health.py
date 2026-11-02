from fastapi import APIRouter
import httpx

router = APIRouter(tags=["Health"])

CURRENT_VERSION = {
    "version": "1.4.7",
    "release_date": "2 November 2026",
    "title": "MangaID Bulletproof nhentai v2 & Multi-Mirror Integration",
    "changelog": [
        "Integrasi Resmi nhentai v2 API: Mengadopsi REST API v2 resmi nhentai dengan browser TLS fingerprint impersonation (curl_cffi chrome124) sehingga bebas 403 Forbidden dan Cloudflare bypass 100% lancar",
        "Sistem Cadangan Multi-Tier Tanpa Hambat: Jika nhentai v2 sibuk, sistem otomatis mengalihkan pengambilan ke Cubari Proxy API, mirror nhentai.website, dan nhentai.xxx secara instan tanpa error",
        "Normalisasi Otomatis URL & Kode Doujinshi: Mendukung input langsung kode galeri (contoh: 100975) maupun link mirror lama (seperti nhentai.to) dengan auto-redirect ke sumber aktif",
        "Explorer Detail & Gambar Anti-Block: Ekstraksi tag/genre doujinshi lengkap, penelusuran galeri akurat, dan proxy gambar CDN (i.nhentai.net) yang stabil",
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
