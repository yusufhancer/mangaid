from fastapi import APIRouter
import httpx

router = APIRouter(tags=["Health"])

CURRENT_VERSION = {
    "version": "1.5.7",
    "release_date": "4 November 2026",
    "title": "MangaID Complete Audio Soul Engine & Auto-Seeded Koleksi",
    "changelog": [
        "Seed Otomatis Koleksi Mieruko-chan: Menyematkan Bab 1-4 Mieruko-chan lengkap dengan region dialog, terjemahan, dan rekaman audio asli Gemini WAV 24kHz ke database awal server",
        "On-Demand Gemini Vision OCR & Dialog Synthesis: Narasi otomatis mendeteksi dan menerjemahkan balon teks pada komik Baca Langsung (MangaDex/Komikindo) secara live dengan suara anime Aoede & Charon",
        "Resolusi Jalur File Lintas-Platform (Linux/Windows/Docker): Menormalkan seluruh jalur penyimpanan gambar dan audio sehingga tidak ada broken image/audio 404 saat migrasi OS",
        "Pemulihan Penuh Model Asli Gemini TTS: Mengembalikan model kerja gemini-2.5-flash-preview-tts, gemini-3.1-flash-tts-preview, dan gemini-3.8-flash-tts",
        "Dual-Transport REST + SDK Synthesis: Menggunakan arsitektur direct REST stream 24000Hz L16 PCM + SDK fallback untuk kehandalan 100% tanpa delay",
        "Pembersihan Total Fallback Google Web Speech API & Edge-TTS Purge"
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
