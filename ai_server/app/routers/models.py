from pathlib import Path
from fastapi import APIRouter, BackgroundTasks

from app.core.config import settings
from app.services.model_manager import model_manager

router = APIRouter()

@router.get("/models")
async def list_models():
    """
    List all available GGUF model files.
    Returns OpenAI-compatible format: {"data": [...]}
    """
    model_files = model_manager.list_models()
    models = []
    
    for filename in model_files:
        # Prevent the UI from seeing vision projectors as standalone models
        if filename.lower().startswith("mmproj-"):
            continue
            
        file_path = Path(settings.MODELS_DIR) / filename
        file_size_gb = file_path.stat().st_size / (1024 ** 3) if file_path.exists() else None
        
        vision_keywords = ["llava", "vision", "moondream", "qwen"]
        model_type = "vision" if any(x in filename.lower() for x in vision_keywords) else "text"
        
        # FIX: Check both text and vision slots to accurately report VRAM status to the UI
        is_loaded = (
            filename == model_manager.current_model_name or 
            filename == model_manager.current_vision_model_name
        )
        
        models.append({
            "id": filename,
            "name": filename.replace(".gguf", "").replace("-", " ").title(),
            "file_size_gb": round(file_size_gb, 1) if file_size_gb else None,
            "type": model_type,
            "is_loaded": is_loaded,
        })
        
    return {"object": "list", "data": models}

@router.post("/models/{model_name}/load")
async def load_model(model_name: str):
    """Explicitly load a text model. Useful for pre-warming before first chat request."""
    await model_manager.load_model(model_name)
    return {"status": "loaded", "model": model_name}

# NEW: The Phase 4 Latency Fix
@router.post("/models/prewarm-vision")
async def prewarm_vision_model(background_tasks: BackgroundTasks):
    """
    Fired by the frontend when navigating to the translator UI.
    Triggers the VRAM Hangoff Protocol early so the model is hot 
    by the time the user actually uploads an image.
    """
    if not model_manager.is_vision_model_loaded and settings.VISION_MODEL:
        # Load in the background so it doesn't block the frontend UI router
        background_tasks.add_task(model_manager.load_vision_model, settings.VISION_MODEL)
        return {"status": "warming_up", "model": settings.VISION_MODEL}
        
    return {"status": "already_hot"}