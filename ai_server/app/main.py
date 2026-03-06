from contextlib import asynccontextmanager
from fastapi import FastAPI

from app.core.config import settings
from app.services.model_manager import model_manager
from app.routers import chat, models, translate, embeddings, memory as memory_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Server boots instantly without locking up VRAM
    print("Server started. Models will be lazy-loaded on first request.")
    
    yield
    
    # Cleanup on shutdown
    print("Shutdown: Unloading models and purging VRAM...")
    model_manager.unload()

app = FastAPI(
    title="AI Inference Server",
    description="Local inference server for Project Kyuna",
    version="1.0.0",
    lifespan=lifespan
)

# Include core routers
app.include_router(chat.router,          prefix="/v1", tags=["chat"])
app.include_router(models.router,        prefix="/v1", tags=["models"])
app.include_router(translate.router,     prefix="/v1", tags=["translate"])
app.include_router(embeddings.router,    prefix="/v1", tags=["embeddings"])
app.include_router(memory_router.router, prefix="/v1", tags=["memory"])

@app.get("/v1/health", tags=["system"])
async def health():
    return {
        "status": "ok",
        "model_loaded": model_manager.is_model_loaded(),
        "model_name": model_manager.current_model_name,
        "vram_usage_mb": model_manager.get_vram_usage(),
    }