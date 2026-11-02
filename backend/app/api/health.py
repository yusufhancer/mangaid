from fastapi import APIRouter
import httpx

router = APIRouter(tags=["Health"])

CURRENT_VERSION = {
    "version": "1.5.0",
    "release_date": "2 November 2026",
    "title": "MangaID MangaDex Modern Design System & Clean Catalog Redesign",
    "changelog": [
        "Desain Visual Bersih ala MangaDex: Menghilangkan pola desain 'AI-slop', digantikan dengan tema gelap slate elegan autentik MangaDex (#191a1c, #202125, #ff6740 accent) dan tipografi modern Inter yang nyaman di mata",
        "Top Navigation Bar Modern & Luas: Menggantikan sidebar kaku dengan top header bar responsif bergaya MangaDex yang dilengkapi pencarian global cepat dan navigasi instan",
        "Kartu Manga Rasio 7:10 & Detail Hero Blur: Tampilan poster vertikal proporsional dengan badge status (Ongoing, Completed, 18+), efek gradien halus, dan modal detail komik dengan latar hero cover blur",
        "Seluruh Fitur & Logika Inti Tetap Utuh: Mesin penerjemah AI, ekstraksi multi-sumber (MangaDex, Komikindo, nhentai v2), audiobook per slide, pembaca slide/webtoon, dan database ganda permanen tetap berjalan 100% sempurna"
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
