from fastapi import APIRouter
import httpx

router = APIRouter(tags=["Health"])

CURRENT_VERSION = {
    "version": "1.4.3",
    "release_date": "2 November 2026",
    "title": "MangaID Authentic Logo Branding & Smooth Zoom Splash Intro",
    "changelog": [
        "Perbaikan Logo & Nama PWA: Nama app dikunci menjadi 'MangaID' dan seluruh ikon PWA disinkronkan dengan logo resmi merah metalik",
        "Animasi Splash Intro Logo Murni: Transisi halus logo MangaID dari kecil ke besar secara lembut tanpa lonjakan naik-turun",
        "Override Manifest Gradio: Menghilangkan logo oranye Gradio dan menggantinya dengan manifes asli MangaID",
        "100% Genre Asli Tiap Web & Pencarian Genre Real-Time",
        "Perlindungan Riwayat Permanen & Fitur Backup / Pulihkan"
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
