from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .core.config import settings
from .core.logging import setup_logging, logger
from .db.session import init_db
from .api.health import router as health_router
from .api.ingest import router as ingest_router
from .api.jobs import router as jobs_router
from .api.chapters import router as chapters_router
from .api.explorer import router as explorer_router

init_db()

@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    logger.info("Initializing MangaID database...")
    init_db()
    logger.info("MangaID backend started successfully.")
    yield
    logger.info("MangaID backend shutting down.")

app = FastAPI(
    title="MangaID API",
    description="Universal AI Manga/Manhwa/Manhua Translator Backend",
    version="1.0.0",
    lifespan=lifespan
)

# CORS setup for local development (Next.js frontend on localhost:3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router, prefix="/api")
app.include_router(ingest_router, prefix="/api")
app.include_router(jobs_router, prefix="/api")
app.include_router(chapters_router, prefix="/api")
app.include_router(explorer_router, prefix="/api")

@app.get("/")
def root():
    return {
        "message": "Welcome to MangaID API",
        "docs": "/docs",
        "health": "/api/health"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
