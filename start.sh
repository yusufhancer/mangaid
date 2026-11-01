#!/bin/bash
set -e

PORT="${PORT:-8000}"
echo "[MangaID Cloud] Starting FastAPI Backend & UI on port ${PORT}..."
exec uvicorn backend.app.main:app --host 0.0.0.0 --port "${PORT}"
