from sqlalchemy import create_engine, text
from sqlalchemy.pool import NullPool
from sqlalchemy.orm import declarative_base, sessionmaker
from ..core.config import settings

# Ensure data directory exists
settings.data_path

db_url = settings.effective_database_url

# SQLite connect args and pool configuration
is_sqlite = "sqlite" in db_url
connect_args = {"check_same_thread": False} if is_sqlite else {}
pool_kwargs = {"poolclass": NullPool} if is_sqlite else {}

engine = create_engine(
    db_url,
    connect_args=connect_args,
    **pool_kwargs,
    echo=False
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    from . import models  # noqa
    from pathlib import Path
    Base.metadata.create_all(bind=engine)

    # Lightweight auto-migration for device_id column & auto-seeding Mieruko-chan
    with engine.connect() as conn:
        for table in ["chapters", "jobs", "ingest_sessions"]:
            try:
                result = conn.execute(text(f"PRAGMA table_info({table})")).fetchall()
                col_names = [r[1] for r in result]
                if col_names and "device_id" not in col_names:
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN device_id VARCHAR(64) DEFAULT 'default'"))
                    conn.commit()
            except Exception:
                pass

        # Auto-seed initial Mieruko-chan collection if database is fresh / empty / corrupted
        try:
            corrupted = False
            cnt = conn.execute(text("SELECT count(*) FROM chapters")).scalar() or 0
            if cnt > 0:
                bad_row = conn.execute(text("SELECT count(*) FROM chapters WHERE created_at = 'default'")).scalar() or 0
                if bad_row > 0:
                    corrupted = True
                    print(f"[MangaID] Detected {bad_row} corrupted chapter rows. Re-seeding collection...")

            if cnt == 0 or corrupted:
                candidate_paths = [
                    Path(__file__).resolve().parent.parent.parent / "seed_data.sql",
                    Path(__file__).resolve().parent.parent.parent / "backend" / "seed_data.sql",
                    Path("/app/backend/seed_data.sql"),
                ]
                seed_path = next((p for p in candidate_paths if p.exists()), None)
                if seed_path:
                    sql_text = seed_path.read_text(encoding="utf-8")
                    dbapi_conn = getattr(conn.connection, "dbapi_connection", None) or getattr(conn.connection, "driver_connection", None)
                    if dbapi_conn and hasattr(dbapi_conn, "executescript"):
                        dbapi_conn.executescript(sql_text)
                        conn.commit()
                        print(f"[MangaID] Auto-seeded initial collection from {seed_path}")
                    else:
                        for stmt in sql_text.split(";"):
                            stmt_clean = stmt.strip()
                            if stmt_clean:
                                conn.execute(text(stmt_clean))
                        conn.commit()
                        print(f"[MangaID] Auto-seeded initial collection (fallback) from {seed_path}")
        except Exception as e:
            print(f"[MangaID] Warning: auto-seed initial collection skipped: {e}")
