from fastapi import APIRouter

router = APIRouter(tags=["Health"])

CURRENT_VERSION = {
    "version": "1.1.0",
    "release_date": "1 November 2026",
    "title": "MangaID Cloud Edition & Update Notifier",
    "changelog": [
        "Sistem Notifikasi Update Otomatis: Dapatkan informasi fitur & perbaikan terbaru langsung di dalam aplikasi",
        "Cloud Hosting 24/7 di Hugging Face ZeroGPU: MangaID aktif terus menerus tanpa laptop harus menyala",
        "Auto Multi-Key Gemini Engine: Kuota terjemahan AI lebih stabil dan bebas limit",
        "Peningkatan kecepatan loading reader & render webtoon"
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
