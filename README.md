# MangaID — Universal AI Manga/Manhwa/Manhua Translator

MangaID adalah aplikasi web penerjemah komik (Manga Jepang, Manhwa Korea, Manhua China) otomatis ke **Bahasa Indonesia kasual/gaul** menggunakan Google Gemini AI secara lokal (self-hosted).

---

## 🚀 Fitur Utama

- **Universal Multi-Layer Ingestion**: Bekerja untuk berbagai website tanpa whitelist kaku:
  - **Layer 0**: MangaDex Official API Adapter (langsung cepat & akurat)
  - **Layer 1**: Generic Static Extractor (heuristik filter logo, iklan, & skoring wadah gambar)
  - **Layer 2**: Playwright Headless Chromium (auto-scroll untuk lazy-load & dynamic JavaScript readers)
  - **Layer 3**: Gemini-Assisted Extractor (resolving galeri gambar ambigu menggunakan AI)
  - **Layer 4**: Manual Upload Fallback (Multiple Images, ZIP, CBZ, dan PDF)
- **AI Vision OCR (Google Gemini)**:
  - Deteksi posisi kotak balon teks (*bounding box*), tipe teks (dialog, narasi, efek suara), dan bahasa sumber asli.
  - Penanganan khusus untuk strip panjang Webtoon (auto-slicing & deduplikasi area tumpang tindih).
- **Penerjemahan Kontekstual Chapter**:
  - **Default: Bahasa Gaul** — percakapan modern, luwes, dan natural (*"nggak", "banget", "dong", "sih", "udah"*).
  - Pilihan preset nada: Gaul (default), Aku/Kamu, dan Netral/Sopan.
  - Glosarium otomatis yang konsisten untuk nama karakter dan panggilan sepanjang chapter.
- **Inpainting & Typesetting**:
  - Hapus teks bahasa asli menggunakan OpenCV inpainting & selective background sampling.
  - Pengetikan ulang teks terjemahan dengan font komik open-source (*Comic Neue*), auto word-wrap, dan auto-shrink font agar pas rapi di dalam balon.
- **Webtoon Reader & PDF Export**:
  - Pembaca vertikal tanpa putus (*infinite continuous scroll* ala Webtoon) yang nyaman di desktop maupun mobile.
  - Sakelar toggle cepat antara **🇮🇩 Terjemahan** dan **Teks Asli**.
  - Ekspor chapter lengkap menjadi file PDF sekali klik menggunakan `img2pdf`.

---

## ⚡ Cara Menjalankan Aplikasi

### 1. Cara Paling Cepat (1-Klik di Windows)
Cukup klik ganda (double-click) file:
```cmd
run_all.bat
```
Skrip ini akan otomatis membuka backend FastAPI di port `8000`, frontend Next.js di port `3000`, dan membuka browser di `http://localhost:3000`.

---

### 2. Menjalankan Secara Manual lewat Terminal

#### Jalankan Backend:
```powershell
.\venv\Scripts\python.exe -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
Dokumentasi API interaktif dapat diakses di:
- `http://localhost:8000/docs` (Swagger UI)
- `http://localhost:8000/api/health`

#### Jalankan Frontend:
```powershell
cd frontend
npm run dev
```
Buka web di:
- `http://localhost:3000`

---

## 🧪 Menjalankan Pengujian (Unit Tests)

```powershell
.\venv\Scripts\pytest.exe backend\tests -v
```
Semua 17 unit test mencakup pengujian keamanan SSRF, ekstraksi statis berbagai fixture HTML, adapter MangaDex, inpainting, dan typesetting.

---

## 📁 Struktur Direktori

```text
mangaid/
├── backend/
│   ├── app/
│   │   ├── ai/            # Gemini client, rate limiter, vision analyze, translate
│   │   ├── api/           # Endpoints: health, ingest, jobs, chapters
│   │   ├── core/          # Settings (.env), logging
│   │   ├── db/            # SQLite session & SQLAlchemy models
│   │   ├── ingestion/     # Adapters, static, headless, AI resolver, upload handler
│   │   ├── jobs/          # Async background job runner
│   │   ├── render/        # OpenCV inpaint, Pillow typeset, font bundle
│   │   └── main.py        # FastAPI app entrypoint
│   └── tests/             # Automated test suite & fixtures
├── frontend/              # Next.js App Router + Tailwind CSS Webtoon Reader
├── data/                  # Direktori data lokal (SQLite db, cache, uploads)
├── .env                   # API Key & konfigurasi lingkungan
├── run_all.bat            # One-click Windows launcher
└── README.md
```
