@echo off
title MangaID - Menghentikan Server
color 0C
chcp 65001 >nul
cd /d "%~dp0"

echo ===================================================================
echo           MENGHENTIKAN SERVER MANGAID...
echo ===================================================================
echo.

echo Menghentikan Cloudflare Tunnel...
taskkill /f /im cloudflared.exe >nul 2>&1

echo Menghentikan Backend di Port 8000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000 " ^| findstr "LISTENING"') do (
    taskkill /f /pid %%a >nul 2>&1
    echo  - Menghentikan PID %%a
)

echo Menghentikan Frontend di Port 3000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000 " ^| findstr "LISTENING"') do (
    taskkill /f /pid %%a >nul 2>&1
    echo  - Menghentikan PID %%a
)

:: Hapus file temporary tunnel url
if exist "%~dp0CLOUDFLARE_URL.txt" del "%~dp0CLOUDFLARE_URL.txt"

:: Matikan jendela cmd MangaID yang tersisa
taskkill /fi "WINDOWTITLE eq MangaID Backend*" /f >nul 2>&1
taskkill /fi "WINDOWTITLE eq MangaID Frontend*" /f >nul 2>&1
taskkill /fi "WINDOWTITLE eq MangaID Cloudflare*" /f >nul 2>&1

echo.
echo ===================================================================
echo   [OK] Server MangaID Berhasil Dimatikan Sepenuhnya!
echo ===================================================================
echo.
timeout /t 3 >nul
