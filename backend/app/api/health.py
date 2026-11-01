from fastapi import APIRouter
import httpx

router = APIRouter(tags=["Health"])

CURRENT_VERSION = {
    "version": "1.4.4",
    "release_date": "2 November 2026",
    "title": "MangaID Master Complete Genre Universe (780+ Genres)",
    "changelog": [
        "Database Genre Super Lengkap: 780+ total genre unik (430+ tag nhentai, 290+ genre Komik Indo, 210+ genre MangaDex & RAW)",
        "Pencarian & Penambahan Genre Kustom: Ketik genre apa pun dan tekan Enter untuk langsung menambahkan ke filter aktif",
        "Pemetaan Cerdas (Smart Mapping): Alias & sinonim genre (Murim, Cultivation, Necromancer, Leveling, Reinkarnasi, dsb.) otomatis difilter di MangaDex & Komikindo",
        "Panel Filter Diperluas: Tampilan filter genre lebih leluasa dengan scroll halus dan indikator jumlah hasil pencarian tag",
        "Perbaikan Logo & Nama PWA resmi MangaID dan Animasi Splash Intro Murni"
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
