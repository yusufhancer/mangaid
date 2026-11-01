from sqlalchemy import create_engine, text
from sqlalchemy.pool import NullPool
from sqlalchemy.orm import declarative_base, sessionmaker
from ..core.config import settings

# Ensure data directory exists
settings.data_path

# SQLite connect args and pool configuration
is_sqlite = "sqlite" in settings.DATABASE_URL
connect_args = {"check_same_thread": False} if is_sqlite else {}
pool_kwargs = {"poolclass": NullPool} if is_sqlite else {}

engine = create_engine(
    settings.DATABASE_URL,
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
    Base.metadata.create_all(bind=engine)

    # Lightweight auto-migration for device_id column
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
