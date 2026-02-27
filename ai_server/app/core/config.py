from pydantic_settings import BaseSettings

class AISettings(BaseSettings):
    DEFAULT_MODEL: str = ""                # filename of model in MODELS_DIR
    MODELS_DIR: str = "./models"
    N_GPU_LAYERS: int = -1                 # -1 = all on GPU
    N_CTX: int = 4096                      # context window (can be overridden to 30000 via .env)
    N_THREADS: int = 8                     # CPU threads
    MAX_CONCURRENT_REQUESTS: int = 3
    PORT: int = 8001
    
    model_config = {"env_file": ".env"}

settings = AISettings()