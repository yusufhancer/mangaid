@echo off
title MangaID - Universal AI Manga Translator
color 0B
chcp 65001 >nul
cd /d "%~dp0"

echo ===================================================================
echo           MANGAID - UNIVERSAL AI MANGA TRANSLATOR
echo ===================================================================
echo.
echo [1/4] Membersihkan proses lama...

:: Matikan proses lama jika ada di port 8000 / 3000 / cloudflared
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000 " ^| findstr "LISTENING"') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000 " ^| findstr "LISTENING"') do taskkill /f /pid %%a >nul 2>&1
taskkill /f /im cloudflared.exe >nul 2>&1

:: Ambil IP Wi-Fi lokal
for /f "usebackq tokens=*" %%i in (`powershell -NoProfile -Command "(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -match 'Wi-Fi|Wireless|WLAN' -or ($_.InterfaceAlias -match 'Ethernet' -and $_.IPAddress -like '192.168*') } | Select-Object -ExpandProperty IPAddress -First 1)"`) do set LOCAL_IP=%%i

if "%LOCAL_IP%"=="" set LOCAL_IP=127.0.0.1

echo [2/4] Menjalankan Backend (Python FastAPI di Port 8000)...
start "MangaID Backend" /min cmd /c "cd /d "%~dp0" && .\venv\Scripts\uvicorn.exe backend.app.main:app --host 0.0.0.0 --port 8000"

echo [3/4] Menjalankan Frontend (Next.js Reader di Port 3000)...
start "MangaID Frontend" /min cmd /c "cd /d "%~dp0frontend" && npm run dev"

echo [4/4] Menghubungkan Cloudflare Tunnel Publik (Gratis & Resmi)...
if exist "%~dp0CLOUDFLARE_URL.txt" del "%~dp0CLOUDFLARE_URL.txt"
start "MangaID Cloudflare Tunnel" /min cmd /c "cd /d "%~dp0" && .\venv\Scripts\python.exe backend\run_cloudflare.py"

:: Tunggu agar Cloudflare Tunnel dan Next.js siap
echo Menunggu Cloudflare Tunnel tersambung...
timeout /t 6 /nobreak >nul

set CF_URL=
if exist "%~dp0CLOUDFLARE_URL.txt" set /p CF_URL=<"%~dp0CLOUDFLARE_URL.txt"

cls
echo ===================================================================
echo           MANGAID BERHASIL DIAKTIFKAN! [ONLINE]
echo ===================================================================
echo.
if not "%CF_URL%"=="" (
echo   🌍 LINK RESMI CLOUDFLARE (Bisa dibuka dari HP mana saja / 4G / Wi-Fi):
echo   👉 %CF_URL%
echo.
)
echo   🏠 LINK WI-FI LOKAL:
echo   - Laptop: http://localhost:3000
echo   - HP:     http://%LOCAL_IP%:3000
echo.
echo ===================================================================
echo   Petunjuk untuk Membaca di HP:
echo   1. Buka browser di HP kamu (Chrome, Safari, dsb).
if not "%CF_URL%"=="" (
echo   2. Ketik link Cloudflare di atas: %CF_URL%
echo      (Bisa diakses dari mana saja, tidak wajib satu Wi-Fi!)
) else (
echo   2. Ketik alamat: http://%LOCAL_IP%:3000 (Pastikan 1 Wi-Fi)
)
echo.
echo   (Untuk mematikan server kapan saja, jalankan STOP_MANGAID.bat)
echo ===================================================================
echo.
echo Pilihan:
echo  [1] Buka MangaID di Laptop sekarang
echo  [2] Matikan Server sekarang (STOP)
echo  [3] Biarkan jendela ini terbuka
echo.
set /p opt="Pilih opsi (1/2/3): "

if "%opt%"=="1" (
    if not "%CF_URL%"=="" (
        start %CF_URL%
    ) else (
        start http://localhost:3000
    )
)
if "%opt%"=="2" (
    call "%~dp0STOP_MANGAID.bat"
    exit
)
