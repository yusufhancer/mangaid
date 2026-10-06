@echo off
echo ========================================================
echo        Starting MangaID Application (Backend + Frontend)
echo ========================================================
echo.
start "MangaID Backend" cmd /c run_backend.bat
start "MangaID Frontend" cmd /c run_frontend.bat
echo Backend running on http://127.0.0.1:8000
echo Frontend running on http://localhost:3000
echo Opening browser...
timeout /t 5 >nul
start http://localhost:3000
