import os
import time
from pathlib import Path
from fastapi import APIRouter, BackgroundTasks, HTTPException
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

    # Fields
    file_size_gb: Optional[float] = None
    is_loaded: bool = False
    size: str = ""
    context_window: int = 0
    description: Optional[str] = None

class ModelsResponse(BaseModel):
    object: str = "list"
    data: List[ModelCard]

@router.get("/models", response_model=ModelsResponse)
async def list_models():
    models_dir = Path(settings.MODELS_DIR)
    if not models_dir.exists():
        return ModelsResponse(data=[])

    presets = []
    added = set()
    
    if getattr(settings, 'CHAT_MODEL_FAST', None) and settings.CHAT_MODEL_FAST not in added:
        presets.append({
            "filename": settings.CHAT_MODEL_FAST,
            "display_name": "VISION",
            "description": "I'm fast as fuck boi!",
            "type": "vision",
        })
        added.add(settings.CHAT_MODEL_FAST)
        
    if getattr(settings, 'CHAT_MODEL_THINKING', None) and settings.CHAT_MODEL_THINKING not in added:
        presets.append({
            "filename": settings.CHAT_MODEL_THINKING,
            "display_name": "CHAT",
            "description": "SHHHH, I'm overthinking",
            "type": "chat",
        })
        added.add(settings.CHAT_MODEL_THINKING)

    data = []
    for preset in presets:
        file_path = models_dir / preset["filename"]
        if file_path.exists():
            is_loaded = (
                preset["filename"] == model_manager.current_model_name or
                preset["filename"] == model_manager.current_vision_model_name
            )
            data.append(ModelCard(
                id=preset["filename"],
                name=preset["display_name"],
                type=preset["type"],
                description=preset["description"],
                is_loaded=is_loaded,
                size="0 GB",
                context_window=0
            ))

    return ModelsResponse(data=data)


@router.post("/models/{model_name}/load")
async def load_model(model_name: str):
    await model_manager.load_model(model_name)
    return {"status": "loaded", "model": model_name}


# FIX: Added missing unload endpoint
@router.post("/models/{model_name}/unload")
async def unload_model(model_name: str):
    """
    Unload a model from VRAM and free memory.
    Checks both the text model and vision model slots.
    Returns 404 if the model is not currently loaded.
    """
    is_text   = model_manager.current_model_name        == model_name
    is_vision = model_manager.current_vision_model_name == model_name

    if not is_text and not is_vision:
        raise HTTPException(
            status_code=404,
            detail=f"Model '{model_name}' is not currently loaded."
        )

    try:
        if is_text:
            await model_manager.unload_model()
        elif is_vision:
            await model_manager.unload_vision_model()
    except AttributeError:
        # Fallback: if model_manager doesn't have a dedicated unload method,
        # clear the reference and force garbage collection
        import gc
        if is_text:
            model_manager._model = None
            model_manager.current_model_name = None
        elif is_vision:
            model_manager._vision_model = None
            model_manager.current_vision_model_name = None
        gc.collect()
        # Try to release GPU memory if llama_cpp is available
        try:
            import llama_cpp
            llama_cpp.llama_backend_free()
            llama_cpp.llama_backend_init(numa=False)
        except Exception:
            pass

    return {"status": "unloaded", "model": model_name}


@router.post("/models/prewarm-vision")
async def prewarm_vision_model(background_tasks: BackgroundTasks):
    if not model_manager.is_vision_model_loaded and settings.VISION_MODEL:
        background_tasks.add_task(model_manager.load_vision_model, settings.VISION_MODEL)
        return {"status": "warming_up", "model": settings.VISION_MODEL}
    return {"status": "already_hot"}