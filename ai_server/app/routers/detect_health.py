import torch
from fastapi import APIRouter
from app.services.detector_service import detector_service

router = APIRouter()

@router.get("/translate/detect/health")
async def detect_health():
    """
    Dev endpoint to verify detector state and VRAM usage.
    """
    vram_usage = 0
    if torch.cuda.is_available():
        vram_usage = torch.cuda.memory_allocated() / (1024 * 1024)  # MB

    return {
        "status": "loaded" if detector_service.is_loaded else "unloaded",
        "model_name": "comic-text-detector",
        "vram_usage_mb": round(vram_usage, 2),
        "device": "cuda" if torch.cuda.is_available() else "cpu"
    }