from fastapi import APIRouter
import httpx

router = APIRouter(tags=["Health"])

CURRENT_VERSION = {
    "version": "1.5.5",
    "release_date": "4 November 2026",
    "title": "MangaID Pure Neural Voice Acting & Google Robot TTS Purge",
    "changelog": [
        "Pembersihan Total Suara Robotik Google: Menghapus seluruh fallback Web Speech API (SpeechSynthesisUtterance) dari frontend sehingga suara audiobook tidak lagi bersuara robotik kaku",
        "Pemulihan Suara Asli Gemini & Edge-TTS: Mengunci audio narasi murni pada Gemini Multi-Role Voice (Aoede, Charon, Fenrir) dan Microsoft Edge Neural Voice (id-ID-GadisNeural, id-ID-ArdiNeural) sesuai spesifikasi mangaidingatan.md",
        "Auto-Provisioning Audio Narasi: Backend otomatis menangani placeholder chapter dan narasi halaman untuk komik baca langsung sehingga audio mengalir stabil tanpa jeda",
        "Instant Cache-Buster Gambar (?v=2): Mengatasi disk cache browser yang menyimpan respons kosong dengan parameter versi unik",
        "Perbaikan Pemuatan Cover MangaDex: Mengatasi gambar hitam/kosong dengan menyesuaikan User-Agent resmi MangaID pada proxy backend",
        "Pemisahan 3 Halaman Utama Dedikasi: Jelajah, Penerjemah, dan Koleksi",
        "Zero-Click Popular Manga Homepage & Featured Hero Carousel"
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
