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
    
    # Fields
    file_size_gb: Optional[float] = None
    is_loaded: bool = False
    size: str = ""             
    context_window: int = 0
    description: Optional[str] = None
    prompt_key: Optional[str] = None  # maps to prompts/<key>.md

class ModelsResponse(BaseModel):
    object: str = "list"
    data: List[ModelCard]

@router.get("/models", response_model=ModelsResponse)
async def list_models():
    models_dir = Path(settings.MODELS_DIR)
    if not models_dir.exists():
        return ModelsResponse(data=[])

    # 🟢 YOUR CONFIG: Matches your .env filenames exactly
    presets = [
        {
            "filename": "Qwen3VL-8B-Instruct-Q8_0.gguf",
            "display_name": "Fast (Qwen 3 8B)",
            "description": "fast and can see things",
            "type": "vision",
            "prompt_key": "chats/fast",   # → prompts/chats/fast.md
        },
        {
            "filename": "Qwen3.5-35B-A3B-UD-IQ3_S.gguf",
            "display_name": "Thinking (Qwen 3.5 35B)",
            "description": "use for difficult tasks",
            "type": "text",
            "prompt_key": "chats/thinking",  # → prompts/chats/thinking.md
        }
    ]

    data = []
    
    for preset in presets:
        file_path = models_dir / preset["filename"]
        
        # Only show if file exists on disk
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
                prompt_key=preset.get("prompt_key"),
                is_loaded=is_loaded,
                size="0 GB",
                context_window=0
            ))

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