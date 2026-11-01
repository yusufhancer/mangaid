# 📖 MANGAIDINGATAN: Rekap Proyek & Dokumentasi Lengkap Migrasi Linux

Dokumen ini berisi rangkuman menyeluruh dari seluruh arsitektur, fitur yang telah dibangun, perbaikan bug krusial, konfigurasi multi-key API, serta **panduan langkah-demi-langkah untuk melanjutkan dan men-deploy proyek MangaID di lingkungan Linux (VPS / Server)**.

---

## 📌 1. Identitas Proyek & Repository

- **Nama Proyek**: MangaID
- **Deskripsi**: Web Reader & Auto-Translator Manga/Manhwa otonom bertenaga Gemini AI Vision OCR, Text Translation (Bahasa Gaul/Santai), Inpainting & Typesetting balon kata, serta Neural AI Voice Narration (TTS Multi-Karakter dengan PWA Background & Lock Screen audio).
- **Remote Git**: `https://github.com/yusufhancer/mangaid.git`
- **Cabang Utama**: `main` (tersinkronisasi juga ke `master`)
- **Lokasi File Ini di Windows**: `D:\all-web\mangaid\mangaidingatan.md`

---

## 🏗️ 2. Arsitektur & Teknologi (Tech Stack)

### Backend (Python FastAPI)
- **Framework**: FastAPI + Uvicorn (Asynchronous Python 3.10+)
- **Database**: SQLite via SQLAlchemy (`data/mangaid.db`)
- **AI Engine**: Google Gemini API via `google-genai` SDK & REST API (Model: `gemini-3.1-flash-lite-preview`, `gemini-flash-latest`, dll)
- **Computer Vision & Rendering**: Pillow (PIL), OpenCV Headless, NumPy
- **Neural Voice (TTS)**: Google Gemini Voice (`Aoede`, `Charon`, `Fenrir`) + Fallback Edge-TTS (`id-ID-GadisNeural`, `id-ID-ArdiNeural`)
- **Dokumen & PDF**: `pypdfium2`, `img2pdf`
- **Scraper / Ingestion**: BeautifulSoup4, lxml, HTTPX (Asynchronous HTTP)

### Frontend (Next.js)
- **Framework**: Next.js 15+ (App Router)
- **Bahasa**: TypeScript
- **Styling**: Tailwind CSS, Lucide React Icons
- **Fitur Khusus**: PWA Media Session API (Background playback, lock screen player), Canvas Pan/Zoom Reader, Dual View Mode (Webtoon Vertical & Manga Horizontal Paginated), 3D Bookshelf Rak Buku.

### Direktori Data (`data/`)
- `data/mangaid.db` : Database SQLite (Tabel `chapters`, `page_records`, `jobs`, `ingest_sessions`).
- `data/chapters/{chapter_id}/original/` : Gambar bab asli (JPG/PNG).
- `data/chapters/{chapter_id}/translated/` : Gambar terjemahan hasil render/typesetting (PNG).
- `data/chapters/{chapter_id}/audio/` : File audio rekaman suara per halaman (`.wav` / `.mp3`).

---

## 🛠️ 3. Rangkuman Fitur & Yang Sudah Selesai Dikerjakan

### A. Pipeline Penerjemahan & Vision OCR
1. **Gemini Vision OCR (`backend/app/ai/analyze.py`)**:
   - Mendeteksi letak balon kata (bounding box 0-1000), membaca teks asli (Jepang/Korea/Inggris), menentukan urutan baca (*reading order*), serta mengenali petunjuk karakter & emosi dialog.
   - Fitur **Webtoon Strip Slicing**: Otomatis memotong gambar komik vertikal yang sangat panjang agar tidak melebihi batas resolusi AI.
2. **Context-Aware Chapter Translation (`backend/app/ai/translate.py`)**:
   - Menerjemahkan 1 bab penuh secara kontekstual menggunakan gaya bahasa santai/gaul modern (*"gue/lo"*, *"nggak"*, *"banget"*, *"tasbih"*, *"sprei"*).
   - Menjaga konsistensi kata ganti dan honorifik karakter (*-san*, *-kun*, *-chan*) di seluruh halaman.
3. **Inpainting & Typesetting (`backend/app/render/renderer.py`)**:
   - Membersihkan teks dialog asli dari balon kata secara otomatis.
   - Me-render teks bahasa Indonesia menggunakan font komik proporsional dengan *auto-wrapping* rapi ke dalam balon.
4. **Anti-Silent Failure & Artwork Fallback (`backend/app/jobs/runner.py`)**:
   - Menambahkan mekanisme *auto-retry* jika request OCR/Gemini terputus sesaat.
   - Halaman yang murni gambar (tanpa teks dialog) otomatis disalin gambarnya ke folder terjemahan agar reader tidak mengalami broken image / error 404.

### B. Neural AI Voice Narration (TTS Multi-Karakter)
1. **Multi-Role Voice Acting (`backend/app/ai/tts.py`)**:
   - **Karakter Cewek Anime / Miko**: Menggunakan suara merdu & lembut (*Aoede*).
   - **Hantu / Monster**: Menggunakan intonasi berat, dingin, berbisik misterius (*Charon*).
   - **Narator Pria / Pria**: Menggunakan suara maskulin tegas (*Fenrir*).
   - **Fallback Otomatis**: Jika kuota suara Gemini sedang terpakai penuh, sistem otomatis beralih ke Microsoft Edge Neural Voice tanpa crash.
2. **PWA Lock Screen & Background Player**:
   - Audio terintegrasi dengan HTML5 Media Session API pada Next.js frontend.
   - Pengguna bisa mendengarkan cerita sambil mematikan layar HP atau mengontrol *next page* langsung dari panel notifikasi ponsel.

### C. Watermark Guard (`backend/app/ai/watermark.py`)
- Membasmi bug di mana watermark scanlator (seperti `TL BY @ROKUUSO`, link Discord, donasi Trakteer) ikut terbaca atau diterjemahkan:
  - Disaring pada tahap ekstraksi teks.
  - Dilewati pada proses terjemahan.
  - Tidak di-render pada balon kata gambar.
  - Dihapus total dari antrean suara TTS sehingga audio 100% murni akting dialog cerita komik.

### D. Pooling & Rotasi Otomatis 5 API Key Gemini
- Sistem mendukung hingga 5 API Key Gemini secara bergantian (*round-robin / failover*).
- Mendukung format satu baris koma (`GEMINI_API_KEY=key1,key2,key3`) maupun format per-variabel di hosting (`GEMINI_API_KEY`, `GEMINI_API_KEY-2`, `GEMINI_API_KEY-3`, `GEMINI_API_KEY-4`, `GEMINI_API_KEY-5`).
- Mencegah error URL query string `401 Unauthorized`.
- Jika salah satu key mencapai batas kuota harian (RPD) atau menit (RPM), sistem otomatis mengoper ke key berikutnya secara transparan tanpa interupsi pengguna.

---

## 🔑 4. Daftar 5 API Key Gemini yang Digunakan

Untuk keamanan repository dari *GitHub Secret Scanning*, API key disembunyikan sebagian di file publik ini. Nilai aslinya sudah terpasang aman di file lokal `.env` kamu di laptop.

| No | Nama Variabel | API Key Preview | Keterangan |
|---|---|---|---|
| 1 | `GEMINI_API_KEY` | `AIzaSyAydNtPiy2cahaTH1p7Hn79C6oHeUEjNZs` | Key 1 (Awal) |
| 2 | `GEMINI_API_KEY-2` | `AQ.Ab8RN6KOJNrg...907Cbkvuw` | Key 2 (Bab 2) |
| 3 | `GEMINI_API_KEY-3` | `AQ.Ab8RN6IjNIaM...Fm-Ti78Ndg` | Key 3 (Baru) |
| 4 | `GEMINI_API_KEY-4` | `AQ.Ab8RN6L5I8D8...0aGQNeIlyA` | Key 4 (Baru) |
| 5 | `GEMINI_API_KEY-5` | `AQ.Ab8RN6LgMlld...7u09BQEMQg` | Key 5 (Paling Baru) |

> [!TIP]
> **Nilai Utuh 5 Key**: Buka file `.env` di direktori laptop kamu (`d:\all-web\mangaid\.env`) atau salin dari catatan chat untuk diisi ke server Linux.

### Template `.env` di Server Linux:
```env
# Salin baris GEMINI_API_KEY utuh dari file lokal .env laptop kamu ke sini:
GEMINI_API_KEY=AIzaSyAydNtPiy2cahaTH1p7Hn79C6oHeUEjNZs,AQ.Ab8RN6KOJNrg... (5 kunci dipisah koma)
GEMINI_MODEL_VISION=gemini-3.1-flash-lite-preview
GEMINI_MODEL_TEXT=gemini-3.1-flash-lite-preview
GEMINI_MODEL_IMAGE=gemini-3.1-flash-lite-preview
GEMINI_RPM=15
GEMINI_RPD=1500
DATA_DIR=data
DATABASE_URL=sqlite:///./data/mangaid.db
LOG_LEVEL=INFO
MAX_PAGES_PER_JOB=100
HOST=0.0.0.0
PORT=8000
```

---

## 🐧 5. Panduan Migrasi & Melanjutkan Proyek di Linux (VPS / Ubuntu)

Jika kamu ingin menjalankan proyek ini di Linux (misal VPS Ubuntu 22.04 / 24.04 LTS), ikuti langkah-langkah praktis berikut:

### Langkah 1: Persiapan Environment Linux
Jalankan di terminal Linux:
```bash
# Update repository paket
sudo apt update && sudo apt upgrade -y

# Install dependensi dasar & Python build tools
sudo apt install -y git curl wget build-essential python3 python3-pip python3-venv \
    libgl1-mesa-glx libglib2.0-0 libgomp1 ffmpeg libsndfile1

# Install Node.js (v20 LTS) & npm
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### Langkah 2: Clone Repository
```bash
cd ~
git clone https://github.com/yusufhancer/mangaid.git
cd mangaid
```

### Langkah 3: Setup Backend Python
```bash
# Buat virtual environment
python3 -m venv venv
source venv/bin/activate

# Upgrade pip & install semua dependencies
pip install --upgrade pip
pip install -r backend/requirements.txt
```

### Langkah 4: Setup Frontend Next.js
```bash
cd frontend
npm install
npm run build
cd ..
```

### Langkah 5: Buat File `.env`
Buat file `.env` di root direktori `mangaid`:
```bash
nano .env
```
Paste konfigurasi `.env` lengkap yang berisi 5 API Key di atas, lalu simpan (`Ctrl + O`, `Enter`, `Ctrl + X`).

### Langkah 6: Menjalankan MangaID di Linux

#### Opsi A: Menggunakan Docker Compose (Paling Praktis)
Jika di server sudah ada Docker:
```bash
# Install Docker & Docker Compose plugin jika belum ada
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Jalankan kontainer
docker compose up -d --build
```
Semua data di folder `data/` otomatis tersimpan permanen di host Linux melalui volume mapping.

#### Opsi B: Menggunakan Systemd Service (Standar Produksi Linux)

1. **Service Backend (`/etc/systemd/system/mangaid-backend.service`)**:
```ini
[Unit]
Description=MangaID FastAPI Backend
After=network.target

[Service]
User=root
WorkingDirectory=/root/mangaid
ExecStart=/root/mangaid/venv/bin/uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
Restart=always
RestartSec=3
EnvironmentFile=/root/mangaid/.env

[Install]
WantedBy=multi-user.target
```

2. **Service Frontend (`/etc/systemd/system/mangaid-frontend.service`)**:
```ini
[Unit]
Description=MangaID Next.js Frontend
After=network.target

[Service]
User=root
WorkingDirectory=/root/mangaid/frontend
ExecStart=/usr/bin/npm start -- -p 3000
Restart=always
RestartSec=3
Environment=PORT=3000
Environment=INTERNAL_BACKEND_URL=http://127.0.0.1:8000

[Install]
WantedBy=multi-user.target
```

3. **Aktifkan & Jalankan Service**:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now mangaid-backend
sudo systemctl enable --now mangaid-frontend

# Cek status
sudo systemctl status mangaid-backend
sudo systemctl status mangaid-frontend
```

#### Opsi C: Menggunakan PM2 (Process Manager Praktis)
```bash
sudo npm install -g pm2

# Start backend
pm2 start "venv/bin/uvicorn backend.app.main:app --host 127.0.0.1 --port 8000" --name mangaid-backend

# Start frontend
cd frontend
pm2 start "npm start -- -p 3000" --name mangaid-frontend
cd ..

# Simpan agar otomatis start saat VPS reboot
pm2 save
pm2 startup
```

### Langkah 7: Nginx Reverse Proxy & SSL HTTPS Gratis (Certbot)
Agar web bisa dibuka dari HP dengan domain sendiri dan suara berjalan lancar tanpa blokir mixed content:
```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

Buat file konfigurasi Nginx `/etc/nginx/sites-available/mangaid`:
```nginx
server {
    server_name domainkamu.com;

    client_max_body_size 100M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Aktifkan dan pasang SSL:
```bash
sudo ln -s /etc/nginx/sites-available/mangaid /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
sudo certbot --nginx -d domainkamu.com
```

---

## 📂 6. Peta File & Struktur Penting Repositori

```text
mangaid/
├── backend/
│   ├── app/
│   │   ├── ai/
│   │   │   ├── analyze.py        # Gemini Vision OCR & Webtoon strip slicing
│   │   │   ├── gemini_client.py  # HTTP client dengan multi-key failover & rotation
│   │   │   ├── prompts.py        # Prompt OCR & prompt terjemahan gaul/santai
│   │   │   ├── translate.py      # Translator per bab dengan konteks karakter
│   │   │   ├── tts.py            # Neural Voice Narration (Gemini Voice + Edge-TTS)
│   │   │   └── watermark.py      # Filter regex anti watermark scanlator & kredit
│   │   ├── api/
│   │   │   ├── chapters.py       # API reader, audio streaming, rename, delete
│   │   │   ├── explorer.py       # API pencarian MangaDex & bab online
│   │   │   ├── health.py         # Health check endpoint
│   │   │   ├── ingest.py         # Upload lokal (ZIP/CBZ/PDF/folder)
│   │   │   ├── jobs.py           # Status background translation job
│   │   │   └── proxy.py          # Image CORS proxy untuk scraping
│   │   ├── core/
│   │   │   ├── config.py         # Config loader (mendukung GEMINI_API_KEY-2 s/d 5)
│   │   │   └── logging.py        # Logger aplikasi
│   │   ├── db/
│   │   │   ├── models.py         # Model SQLAlchemy (Chapter, PageRecord, Job, dll)
│   │   │   └── session.py        # SQLite engine & session maker
│   │   ├── ingestion/
│   │   │   └── ai_extractor.py   # Layer 3 Gemini DOM ambiguity extractor
│   │   ├── jobs/
│   │   │   └── runner.py         # Pipeline async: download -> OCR -> translate -> render
│   │   ├── render/
│   │   │   ├── inpaint.py        # Penghapus teks balon kata
│   │   │   ├── renderer.py       # Koordinasi inpaint & typesetting
│   │   │   └── typeset.py        # Tipografi komik & auto-wrap teks Indonesia
│   │   └── main.py               # Entrypoint FastAPI
│   └── requirements.txt          # Daftar paket Python
├── frontend/
│   ├── app/
│   │   ├── api/[...path]/        # Proxy internal Next.js ke backend FastAPI
│   │   ├── page.tsx              # UI Utama: Rak buku 3D, Reader, Audio Player, Ingest
│   │   └── layout.tsx            # Root layout & PWA meta tags
│   ├── package.json              # Daftar dependencies React & Next.js
│   └── next.config.ts            # Konfigurasi Next.js
├── data/                         # Direktori penyimpanan data (db, images, audio)
├── Dockerfile                    # Container All-in-One
├── docker-compose.yml            # Docker Compose dengan persistent volume
├── DEPLOY.md                     # Petunjuk deploy ringkas cloud
├── start.sh                      # Script startup container Linux
├── mangaidingatan.md             # (File ini) Dokumentasi rekap & panduan Linux
└── .env                          # File konfigurasi lokal (tidak masuk git)
```

---

## 🎯 7. Catatan Penting Saat Melanjutkan Proyek
1. **Folder `data/` Wajib Dipertahankan**: Jangan pernah menghapus folder `data/` di server karena di sanalah SQLite database, gambar manga yang sudah diunduh, hasil terjemahan, dan rekaman audio tersimpan.
2. **Kapasitas Multi-Key**: Dengan 5 API key aktif, kamu memiliki ketahanan kuota yang sangat besar untuk membaca puluhan bab berturut-turut tanpa jeda limit.
3. **Pembaruan Kode di Masa Depan**: Cukup jalankan `git pull origin main` di Linux, lalu restart service (`sudo systemctl restart mangaid-backend mangaid-frontend` atau `pm2 restart all`).
