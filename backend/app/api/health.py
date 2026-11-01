from fastapi import APIRouter
import httpx

router = APIRouter(tags=["Health"])

CURRENT_VERSION = {
    "version": "1.4.2",
    "release_date": "1 November 2026",
    "title": "MangaID Truly Universal - Exhaustive Source Genres, Real-time Genre Search & Persistent User History",
    "changelog": [
        "100% Genre Asli dari Tiap Web: 77 tag resmi MangaDex, 80+ tag RAW, 86 tag resmi KomikIndo (dari daftar-manga), dan 120+ tag konten asli nhentai",
        "Pencarian Genre Interaktif Real-Time: Klik logo Filter atau ketik nama genre untuk memfilter ratusan tag seketika, tekan Enter atau tambah tag kustom",
        "Perlindungan Database & Riwayat Permanen: Dual-layer persistence (localStorage + SQLite auto-sync) menjaga riwayat komik agar tidak pernah hilang saat aplikasi di-update",
        "Fitur Backup & Pulihkan Riwayat: Tombol unduh backup JSON dan pulihkan riwayat langsung di halaman koleksi",
        "Pencarian Berdasarkan Genre Tanpa Wajib Judul & Interkoneksi Tag Lengkap"
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
