@echo off
echo Starting MangaID Backend (FastAPI) on http://127.0.0.1:8000 ...
.\venv\Scripts\python.exe -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
pause
