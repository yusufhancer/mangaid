import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
ENV_FILE = BASE_DIR / ".env"

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE) if ENV_FILE.exists() else None,
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # Gemini API
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL_VISION: str = "gemini-3.1-flash-lite-preview"
    GEMINI_MODEL_TEXT: str = "gemini-3.1-flash-lite-preview"
    GEMINI_MODEL_IMAGE: str = "gemini-3.1-flash-lite-preview"
    GEMINI_RPM: int = 15
    GEMINI_RPD: int = 1500

    # App
    DATA_DIR: str = "data"
    DATABASE_URL: str = "sqlite:///./data/mangaid.db"
    LOG_LEVEL: str = "INFO"
    MAX_PAGES_PER_JOB: int = 100
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    @property
    def gemini_api_keys(self) -> list[str]:
        raw = self.GEMINI_API_KEY or ""
        return [k.strip() for k in raw.split(",") if k.strip()]

    @property
    def primary_gemini_api_key(self) -> str:
        keys = self.gemini_api_keys
        return keys[0] if keys else ""

    @property
    def data_path(self) -> Path:
        p = BASE_DIR / self.DATA_DIR
        p.mkdir(parents=True, exist_ok=True)
        return p

settings = Settings()
