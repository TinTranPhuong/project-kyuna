from pydantic_settings import BaseSettings, SettingsConfigDict

class AISettings(BaseSettings):
    DEFAULT_MODEL: str = ""                # filename of model in MODELS_DIR
    TRANSLATION_MODEL: str = ""
    DETECTOR_MODEL: str = ""
    CHAT_MODEL: str = ""
    VISION_MODEL: str = ""                 # filename of Vision GGUF in MODELS_DIR, e.g. "Qwen3VL-8B-Instruct-Q8_0.gguf"
    MMPROJ_FILE: str  = ""                 # filename of CLIP projector, e.g. "mmproj-Qwen3VL-8B-Instruct-F16.gguf"
    MODELS_DIR: str = "./models"
    MIN_CONFIDENCE: float = 0
    N_GPU_LAYERS: int = -1                 # -1 = all on GPU
    N_CTX: int = 4096                      # context window (can be overridden to 30000 via .env)
    N_THREADS: int = 8                     # CPU threads
    MAX_CONCURRENT_REQUESTS: int = 3
    PORT: int = 8001
    
    # Tell Pydantic to ignore the extra variables in your .env file
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = AISettings()