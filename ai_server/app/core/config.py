from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

# Resolve .env relative to THIS file, not the working directory.
# config.py is at: ai_server/app/core/config.py
# .env is at:      ai_server/.env
# So we go up 3 levels: core -> app -> ai_server
_ENV_FILE = Path(__file__).resolve().parent.parent.parent / ".env"

class AISettings(BaseSettings):
    DEFAULT_MODEL: str = ""
    CHAT_MODEL_FAST: str = ""
    CHAT_MODEL_THINKING: str = ""
    CHAT_MODEL_AGENT: str = ""
    CHAT_MODEL_CREATIVE: str = ""
    TRANSLATION_MODEL: str = ""
    DETECTOR_MODEL: str = ""
    VISION_MODEL: str = ""
    MMPROJ_FILE: str = ""
    MMPROJ_FILE_QWEN3: str = ""
    MMPROJ_FILE_QWEN35: str = ""
    MMPROJ_FILE_CREATIVE: str = ""
    MODELS_DIR: str = "./models"
    MIN_CONFIDENCE: float = 0
    N_GPU_LAYERS: int = -1
    N_CTX: int = 8192
    N_THREADS: int = 8
    MAX_CONCURRENT_REQUESTS: int = 3
    PORT: int = 8001

    # Generation defaults — loaded from .env
    MAX_TOKENS: int = 8192
    TEMPERATURE: float = 0.7
    TOP_P: float = 0.9
    TOP_K: int = 40
    REPEAT_PENALTY: float = 1.1
    MAX_THINK_TOKENS: int = 24576
    
    # ── Embedding Model Settings ──────────────────────────────────────────────
    EMBEDDING_MODEL: str = "nomic-ai/nomic-embed-text-v1.5"
    EMBEDDING_DIMENSIONS: int = 768
    EMBEDDING_BATCH_SIZE: int = 32

    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE),
        env_file_encoding="utf-8",
        extra="ignore",
    )

settings = AISettings()

# Print on startup so you can confirm the path is correct
print(f"[Config] Loading .env from: {_ENV_FILE}")
print(f"[Config] MAX_TOKENS={settings.MAX_TOKENS}  N_CTX={settings.N_CTX}")
print(f"[Config] FAST_MODEL={settings.CHAT_MODEL_FAST}")
print(f"[Config] THINK_MODEL={settings.CHAT_MODEL_THINKING}")
print(f"[Config] CREATIVE_MODEL={settings.CHAT_MODEL_CREATIVE}")
print(f"[Config] CREATIVE_MMPROJ_FILE={settings.MMPROJ_FILE_CREATIVE}")