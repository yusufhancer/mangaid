#!/bin/bash
set -e

echo "[MangaID Cloud] Starting Backend FastAPI on port 8000..."
uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 &

echo "[MangaID Cloud] Waiting for backend to initialize..."
sleep 2

echo "[MangaID Cloud] Starting Frontend Next.js on port ${PORT:-3000}..."
exec ./node_modules/.bin/next start -H 0.0.0.0 -p ${PORT:-3000}
