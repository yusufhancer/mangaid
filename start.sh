#!/bin/sh
set -e

echo "[MangaID Cloud] Starting Backend FastAPI on port 8000..."
uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 &
BACKEND_PID=$!

echo "[MangaID Cloud] Waiting for backend to be ready..."
sleep 2

echo "[MangaID Cloud] Starting Frontend Next.js on port ${PORT:-3000}..."
npm run start -- -p ${PORT:-3000} &
FRONTEND_PID=$!

trap "kill $BACKEND_PID $FRONTEND_PID" SIGTERM SIGINT
wait
