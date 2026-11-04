from fastapi import APIRouter
import httpx

router = APIRouter(tags=["Health"])

CURRENT_VERSION = {
    "version": "1.5.6",
    "release_date": "4 November 2026",
    "title": "MangaID Authentic Gemini Voice Acting Engine Restoration",
    "changelog": [
        "Pemulihan Penuh Model Asli Gemini TTS: Mengembalikan model kerja gemini-2.5-flash-preview-tts, gemini-3.1-flash-tts-preview, dan gemini-3.8-flash-tts menggantikan gemini-2.0-flash yang 404",
        "Dual-Transport REST + SDK Synthesis: Menggunakan arsitektur direct REST stream 24000Hz L16 PCM + SDK fallback untuk kehandalan 100% tanpa delay",
        "Rotasi Multi-Key Otomatis & Anti-Leak Blacklist: Menyaring kunci 403/bocor dan merotasikan 4 kunci aktif pengguna secara mulus saat mencapai limit burst RPM",
        "Pembersihan Total Audio Robotik & Stale Fallback Purge: Otomatis menghapus cache fallback MP3 lama saat audio WAV Gemini berkualitas tinggi berhasil dihasilkan",
        "Pemberitahuan Halaman Kosong dengan Suara Gemini: Halaman tanpa dialog kini dinarasikan menggunakan suara vokal Gemini (Aoede/Fenrir) asli",
        "Pembersihan Total Fallback Google Web Speech API di Frontend"
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
