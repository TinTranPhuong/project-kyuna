import os
import time
from pathlib import Path
from fastapi import APIRouter, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional

from app.core.config import settings
from app.services.model_manager import model_manager

router = APIRouter()

class ModelCard(BaseModel):
    id: str
    name: str
    object: str = "model"
    created: int = int(time.time())
    owned_by: str = "user"
    type: str
    
    # Backend Fields
    file_size_gb: Optional[float] = None
    is_loaded: bool = False
    
    # Frontend Compatibility Fields
    size: str              # e.g. "8.0 GB"
    context_window: int    # e.g. 32

class ModelsResponse(BaseModel):
    object: str = "list"
    data: List[ModelCard]

@router.get("/models", response_model=ModelsResponse)
async def list_models():
    """
    Returns models with correct metadata for the Frontend UI.
    """
    models_dir = Path(settings.MODELS_DIR)
    
    if not models_dir.exists():
        return ModelsResponse(data=[])

    data = []
    for f in models_dir.iterdir():
        if not f.is_file() or not f.name.endswith(".gguf"):
            continue
        if f.name.lower().startswith("mmproj-"):
            continue

        # 1. Improved Type Detection
        name_lower = f.name.lower()
        vision_keywords = ["llava", "vision", "moondream", "-vl-", "vl_"]
        model_type = "vision" if any(k in name_lower for k in vision_keywords) else "text"
        
        # 2. Calculate Size
        size_gb = f.stat().st_size / (1024 ** 3)
        size_str = f"{size_gb:.1f} GB"
        
        # 3. Estimate Context Window
        ctx = 32 # Default
        if "128k" in name_lower: ctx = 128
        elif "moondream" in name_lower: ctx = 2
        elif "llama-3" in name_lower and "8b" in name_lower: ctx = 8
        
        # 4. Check Status
        is_loaded = (
            f.name == model_manager.current_model_name or 
            f.name == model_manager.current_vision_model_name
        )

        data.append(ModelCard(
            id=f.name,
            name=f.name.replace(".gguf", "").replace("-", " ").title(),
            type=model_type,
            file_size_gb=round(size_gb, 1),
            size=size_str,
            context_window=ctx,
            is_loaded=is_loaded
        ))
    
    # Sort: Loaded first
    data.sort(key=lambda x: (not x.is_loaded, x.name))
    
    return ModelsResponse(data=data)

@router.post("/models/{model_name}/load")
async def load_model(model_name: str):
    await model_manager.load_model(model_name)
    return {"status": "loaded", "model": model_name}

@router.post("/models/prewarm-vision")
async def prewarm_vision_model(background_tasks: BackgroundTasks):
    if not model_manager.is_vision_model_loaded and settings.VISION_MODEL:
        background_tasks.add_task(model_manager.load_vision_model, settings.VISION_MODEL)
        return {"status": "warming_up", "model": settings.VISION_MODEL}
    return {"status": "already_hot"}