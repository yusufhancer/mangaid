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
        keys = []
        raw = self.GEMINI_API_KEY or ""
        for k in raw.split(","):
            k_clean = k.strip()
            if k_clean and k_clean not in keys:
                keys.append(k_clean)

        # Also collect GEMINI_API_KEY-2, GEMINI_API_KEY_2, GEMINI_API_KEY-3, etc. from environment
        for env_k, env_val in os.environ.items():
            upper = env_k.upper().replace("-", "_")
            if upper.startswith("GEMINI_API_KEY_") and env_val.strip():
                val = env_val.strip()
                if val not in keys:
                    keys.append(val)

        return keys

    @property
    def effective_database_url(self) -> str:
        env_db = os.environ.get("DATABASE_URL")
        if env_db:
            return env_db
        if os.path.exists("/data") and os.access("/data", os.W_OK):
            return "sqlite:////data/mangaid.db"
        return self.DATABASE_URL

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
