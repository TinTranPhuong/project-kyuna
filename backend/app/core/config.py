from pathlib import Path
from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_ENV_FILE = Path(__file__).resolve().parent.parent.parent / ".env"


class Settings(BaseSettings):
    # ── Database ──────────────────────────────────────────────────────────────
    DATABASE_URL: str = "postgresql+asyncpg://kyuna:password@localhost:5432/kyuna_db"

    # ── Connection Pool (PostgreSQL only — ignored for SQLite) ────────────────
    DB_POOL_SIZE: int = 5
    DB_MAX_OVERFLOW: int = 15
    DB_POOL_TIMEOUT: int = 30
    DB_POOL_RECYCLE: int = 1800

    # ── Auth ──────────────────────────────────────────────────────────────────
    SECRET_KEY: str = "CHANGE_ME_IN_ENV"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ── Services ──────────────────────────────────────────────────────────────
    AI_SERVER_URL: str = "http://localhost:8001"
    UPLOAD_DIR: str = "./uploads"
    WALLPAPER_DIR: str = "./uploads/wallpapers"
    CODING_SESSIONS_DIR: str = "./uploads/coding_sessions"
    MAX_UPLOAD_SIZE_MB: int = 100
    CHAT_MODEL_AGENT: str = ""
    CHAT_MODEL_ORCHESTRATOR: str = ""
    TRANSLATION_MODEL: str = ""

    # ── CORS ──────────────────────────────────────────────────────────────────
    ALLOWED_ORIGINS: Union[List[str], str] = ["http://localhost:5173"]

    # ── App ───────────────────────────────────────────────────────────────────
    ENVIRONMENT: str = "development"

    # ── DB ────────────────────────────────────────────────────────────────────
    QDRANT_URL: str = "http://localhost:6333"
    QDRANT_API_KEY: str = ""
    EXTRACTION_ENABLED: bool = True
    EXTRACTION_MIN_WORDS: int = 20
    EXTRACTION_EVERY_N_TURNS: int = 3
    DOCS_UPLOAD_DIR: str = "D:\\project-kyuna\\uploads\\docs"
    MAX_DOC_SIZE_MB: int = 50
    EMBEDDING_DIMENSIONS: int = 768

    # ── Agent Token Limits ────────────────────────────────────────────────────
    AGENT_MAX_TOKENS_SYNTHESIZER: int = 8192
    AGENT_MAX_TOKENS_ORCHESTRATOR: int = 16384
    AGENT_MAX_TOKENS_MEMORY: int = 8192
    AGENT_MAX_TOKENS_EVALUATOR: int = 8192
    AGENT_MAX_TOKENS_CONSENSUS: int = 8192
    AGENT_MAX_TOKENS_REFLECTOR: int = 16384
    AGENT_MAX_TOKENS_ANALYSIS: int = 8192
    AGENT_MAX_TOKENS_TRANSLATOR: int = 8192
    AGENT_MAX_TOKENS_CODING: int = 16384
    AGENT_MAX_TOKENS_WEB_SEARCH: int = 8192
    AGENT_MAX_TOKENS_CONTENT_WRITING: int = 16384
    AGENT_MAX_RETRIES: int = 3

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        return v

    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE),
        env_file_encoding="utf-8",
        extra="ignore",
    )

settings = Settings()