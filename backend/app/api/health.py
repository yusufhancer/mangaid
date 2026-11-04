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
    from ..db.session import SessionLocal, db_url
    from ..db.models import Chapter, PageRecord
    from pathlib import Path
    import os

    db = SessionLocal()
    ch_count = 0
    pages_count = 0
    all_ch = []
    try:
        chapters = db.query(Chapter).all()
        ch_count = len(chapters)
        pages_count = db.query(PageRecord).count()
        all_ch = [{"id": c.id, "title": c.title, "dev_id": c.device_id, "pages": len(c.pages)} for c in chapters]
    except Exception as e:
        ch_count = f"Error: {e}"
    finally:
        db.close()

    seed_p = Path(__file__).resolve().parent.parent.parent / "seed_data.sql"

    return {
        "status": "ok",
        "app": "MangaID",
        "version": CURRENT_VERSION["version"],
        "db_url": db_url,
        "seed_sql_exists": seed_p.exists(),
        "seed_sql_path": str(seed_p),
        "chapters_count": ch_count,
        "page_records_count": pages_count,
        "chapters": all_ch
    }

@router.get("/version")
def get_version():
    return CURRENT_VERSION

@router.post("/db/seed")
def trigger_seed():
    from ..db.session import init_db, SessionLocal
    from ..db.models import Chapter, PageRecord
    init_db()
    db = SessionLocal()
    chapters = db.query(Chapter).all()
    count = len(chapters)
    pages = db.query(PageRecord).count()
    ch_list = [{"id": c.id, "title": c.title, "pages": len(c.pages)} for c in chapters]
    db.close()
    return {
        "status": "ok",
        "chapters_count": count,
        "page_records_count": pages,
        "chapters": ch_list
    }
