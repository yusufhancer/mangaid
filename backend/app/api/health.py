from fastapi import APIRouter
import httpx

router = APIRouter(tags=["Health"])

CURRENT_VERSION = {
    "version": "1.4.5",
    "release_date": "2 November 2026",
    "title": "MangaID Strict Genre Enforcement & Active Tag Synchronization",
    "changelog": [
        "Filter Genre Akurat 100% (Strict Genre Enforcement): Memperbaiki bug di mana manga yang tidak berhubungan muncul. Setiap hasil pencarian diverifikasi wajib memiliki genre yang dicari",
        "Pencarian Spesifik Tema (Murim, Cultivation, Necromancer, Leveling, Dungeon, Yuri, Yaoi): Menggunakan pencarian presisi tinggi dan mengecualikan hasil palsu",
        "Sinkronisasi Tag & Penonjolan Visual: Genre yang dicari dijamin selalu tercantum di daftar genre kartu komik dan halaman detail bab dengan badge merah mencolok",
        "Filter Multi-Genre Berlapis: Mendukung pencarian banyak genre sekaligus dengan jaminan setiap komik memenuhi semua genre yang dipilih",
        "Database 780+ Genre & Tag Asli serta PWA MangaID Resmi"
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
