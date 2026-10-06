#!/bin/bash

echo "[MangaID Cloud] Starting Backend FastAPI on port 8000..."
uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 &
BACKEND_PID=$!

echo "[MangaID Cloud] Waiting for backend to initialize..."
sleep 2

echo "[MangaID Cloud] Starting Frontend Next.js on port ${PORT:-3000}..."
./node_modules/.bin/next start -H 0.0.0.0 -p ${PORT:-3000} &
FRONTEND_PID=$!

trap "kill -TERM $BACKEND_PID $FRONTEND_PID 2>/dev/null || true" EXIT TERM INT
wait
