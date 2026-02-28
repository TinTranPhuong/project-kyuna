from pathlib import Path
from fastapi import APIRouter

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
        
        models.append({
            "id": filename,
            "name": filename.replace(".gguf", "").replace("-", " ").title(),
            "file_size_gb": round(file_size_gb, 1) if file_size_gb else None,
            "type": model_type,
            "is_loaded": filename == model_manager.current_model_name,
        })
        
    return {"object": "list", "data": models}

@router.post("/models/{model_name}/load")
async def load_model(model_name: str):
    """Explicitly load a model. Useful for pre-warming before first chat request."""
    await model_manager.load_model(model_name)
    return {"status": "loaded", "model": model_name}