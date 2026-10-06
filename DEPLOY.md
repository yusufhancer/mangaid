# 🚀 Panduan Deploy MangaID ke Cloud (24/7 Online Tanpa Laptop)

Dengan konfigurasi ini, server MangaID bisa berjalan di cloud internet secara mandiri sehingga **laptop kamu bisa dimatikan total** dan kamu bisa mengaksesnya dari HP kapan saja.

---

## 📦 File Deployment yang Sudah Disediakan
1. **`Dockerfile`**: Kontainer All-in-One (Next.js Frontend + FastAPI Backend berjalan bersamaan dalam 1 port). Cocok untuk Railway, Render, Koyeb, atau Fly.io.
2. **`docker-compose.yml`**: Konfigurasi multi-container untuk VPS Linux dengan volume persistensi data manga.
3. **`Dockerfile.backend`** & **`Dockerfile.frontend`**: Untuk deployment terpisah (misal Backend di Render, Frontend di Vercel).

---

## 🌟 Opsi 1: Railway.app (Paling Cepat & Otomatis)

1. **Buat Repository di GitHub**:
   - Buka [github.com](https://github.com) -> Buat repository baru (pilih **Private**).
   - Di terminal laptop kamu, jalankan:
     ```bash
     git remote add origin https://github.com/USERNAME_KAMU/NAMA_REPO.git
     git branch -M main
     git push -u origin main
     ```

2. **Deploy di Railway**:
   - Buka [railway.app](https://railway.app) -> Login dengan GitHub.
   - Klik **"New Project"** -> **"Deploy from GitHub repo"** -> Pilih repo MangaID kamu.
   - Masuk ke tab **Variables**, tambahkan:
     - `GEMINI_API_KEY` = `(Isi API Key Gemini kamu)`
   - Masuk ke tab **Settings** -> Klik **"Generate Domain"**.
   - **Selesai!** Kamu akan mendapatkan link HTTPS gratis yang bisa dibuka dari HP kapan saja tanpa perlu laptop nyala.

---

## 🌟 Opsi 2: VPS Linux Murah (Paling Stabil & Data Permanen)

Cocok untuk VPS Rp 50.000/bln (IDCloudHost, Biznet Gio) atau Oracle Cloud Free Tier:

1. Di terminal VPS kamu, install Docker:
   ```bash
   curl -fsSL https://get.docker.com | sh
   ```
2. Clone repository kamu:
   ```bash
   git clone https://github.com/USERNAME_KAMU/NAMA_REPO.git mangaid
   cd mangaid
   ```
3. Buat file `.env` di VPS:
   ```bash
   cp .env.example .env
   nano .env  # Masukkan GEMINI_API_KEY kamu
   ```
4. Jalankan MangaID:
   ```bash
   docker compose up -d
   ```
5. Akses langsung via IP VPS kamu: `http://IP_VPS:3000` atau pasang Cloudflare Tunnel gratis agar dapat domain HTTPS.
