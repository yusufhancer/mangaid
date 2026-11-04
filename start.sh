#!/bin/bash
set -e

# Run robust python database seeder
python3 -c "
import sqlite3, os
from pathlib import Path

seed_paths = [
    Path('/app/backend/seed_data.sql'),
    Path('./backend/seed_data.sql'),
]
seed_sql = next((p for p in seed_paths if p.exists()), None)

if seed_sql:
    db_paths = [Path('/data/mangaid.db'), Path('/app/data/mangaid.db'), Path('data/mangaid.db')]
    for db_p in db_paths:
        try:
            if db_p.parent.exists():
                conn = sqlite3.connect(str(db_p))
                cur = conn.cursor()
                cur.execute(\"SELECT count(*) FROM sqlite_master WHERE type='table' AND name='chapters'\")
                t_exists = cur.fetchone()[0] > 0
                cnt = 0
                if t_exists:
                    cur.execute(\"SELECT count(*) FROM chapters\")
                    cnt = cur.fetchone()[0]
                if cnt == 0:
                    print(f'[MangaID Seeder] Seeding initial collection into {db_p}...')
                    cur.executescript(seed_sql.read_text(encoding='utf-8'))
                    conn.commit()
                    print(f'[MangaID Seeder] Successfully seeded {db_p}')
                conn.close()
        except Exception as e:
            print(f'[MangaID Seeder] Note on {db_p}: {e}')
" 2>/dev/null || true

PORT="${PORT:-8000}"
echo "[MangaID Cloud] Starting FastAPI Backend & UI on port ${PORT}..."
exec uvicorn backend.app.main:app --host 0.0.0.0 --port "${PORT}"
