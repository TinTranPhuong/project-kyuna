import os
import json
import base64
import tempfile
import asyncio
from pathlib import Path
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel

from app.services.translation_service import translate_image_file
from app.services.vision_translation_service import translate_image_vision
from app.services.model_manager import model_manager
from app.core.config import settings

# 🚨 New Phase 1 Pipeline Services
from app.services.ocr_pipeline_service import ocr_pipeline_service
from app.services.translation_pipeline_service import hangoff_protocol, translate_page

router = APIRouter()

# ══════════════════════════════════════════════════════════════════════════
#  NEW PIPELINE ENDPOINTS (6-Stage Architecture)
# ══════════════════════════════════════════════════════════════════════════

# ─── Endpoint 1: Stages 1+2+3 — OCR Pipeline ─────────────────────────────────
class OcrPipelineRequest(BaseModel):
    image: str      # base64-encoded full manga page (JPEG or PNG)

class OcrPipelineResponse(BaseModel):
    regions: list[dict]    # Each dict: {"index": int, "bbox": [x1,y1,x2,y2], "japanese": str}
    count: int

@router.post("/translate/ocr-pipeline", response_model=OcrPipelineResponse)
async def ocr_pipeline(request: OcrPipelineRequest):
    """
    Stages 1+2+3 in a single call.
    Accepts the full manga page as base64.
    Runs comic-text-detector → PIL crop (in RAM) → manga-ocr per crop.
    Returns [{index, bbox, japanese}].
    Zero crop files written to disk.
    """
    if not getattr(settings, "DETECTOR_MODEL", None):
        raise HTTPException(503, "DETECTOR_MODEL not configured in .env")

    # Decode base64 → temp file (only the full page is written, not crops)
    image_data = base64.b64decode(request.image)
    suffix = ".png" if image_data[:4] == b"\x89PNG" else ".jpg"
    
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(image_data)
        tmp_path = tmp.name

    try:
        # Run in thread executor — both models are synchronous PyTorch
        loop = asyncio.get_event_loop()
        regions = await loop.run_in_executor(
            None,
            ocr_pipeline_service.run,
            tmp_path,
        )
        return OcrPipelineResponse(regions=regions, count=len(regions))
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)   # only the full-page temp file, no crop files exist


# ─── Endpoint 2: Stages 4+5 — Hangoff + Translate (ONE PAGE AT A TIME) ───────
class TranslateBatchRequest(BaseModel):
    regions: list[dict]
    # Each dict must have: index (int), bbox ([x1,y1,x2,y2]), japanese (str)

class TranslateBatchResponse(BaseModel):
    regions: list[dict]
    # Each dict has all input fields + english (str)

@router.post("/translate/batch", response_model=TranslateBatchResponse)
async def translate_batch(request: TranslateBatchRequest):
    """
    Stages 4+5: Hangoff Protocol (if needed) + Qwen / OpenAI 20B translation.
    IMPORTANT — ONE PAGE PER CALL:
    The backend sends one page at a time. Do NOT aggregate multiple pages
    into one request. A 20-page CBZ = 20 separate calls to this endpoint.
    LLM stays loaded between calls (is_translation_model_loaded check).
    The Hangoff Protocol runs only on the FIRST call after the OCR pipeline
    (when is_translation_model_loaded is False). Subsequent calls skip it.
    """
    if not request.regions:
        return TranslateBatchResponse(regions=[])

    for r in request.regions:
        if "japanese" not in r or "index" not in r or "bbox" not in r:
            raise HTTPException(422, "Each region must have: index, bbox, japanese")

    # Stage 4: Hangoff Protocol — runs only if LLM is not already loaded
    if not model_manager.is_translation_model_loaded:
        await hangoff_protocol()

    # Stage 5: Translate this page's regions
    translated = await translate_page(request.regions)
    return TranslateBatchResponse(regions=translated)


# ══════════════════════════════════════════════════════════════════════════
#  LEGACY ENDPOINTS (Preserved for backwards compatibility)
# ══════════════════════════════════════════════════════════════════════════

# ==========================================
# EXISTING FALLBACK ENDPOINT
# ==========================================
class TranslateRequest(BaseModel):
    image: str
    source_language: str = "auto"
    target_language: str = "en"

@router.post("/translate/image")
async def translate_image(request: TranslateRequest):
    image_data = base64.b64decode(request.image)
    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
        tmp.write(image_data)
        tmp_path = tmp.name
        
    try:
        result = await translate_image_file(
            image_path=tmp_path,
            source_language=request.source_language,
            target_language=request.target_language,
            output_path=None,
        )
        return result
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)

# ==========================================
# HELPER: AUTO-DETECT VISION MODEL
# ==========================================
async def ensure_vision_model_loaded():
    """Helper to auto-detect Qwen3VL if .env is missing."""
    if not model_manager.is_vision_model_loaded:
        model_to_load = settings.VISION_MODEL
        
        # Auto-detect fallback if .env is empty
        if not model_to_load:
            models_dir = Path(settings.MODELS_DIR)
            # Look for any model containing 'Qwen3VL' in the name
            vision_models = list(models_dir.glob("*Qwen3VL*.gguf"))
            
            # Filter out the mmproj file so we only get the main model
            main_models = [m for m in vision_models if "mmproj" not in m.name.lower()]
            
            if main_models:
                model_to_load = main_models[0].name
                print(f"Server: Auto-detected vision model -> {model_to_load}")
            else:
                raise HTTPException(
                    status_code=503, 
                    detail="503 Service Unavailable: No vision model configured in .env, and no Qwen3VL file found in the models directory."
                )
                
        await model_manager.load_vision_model(model_to_load)

# ==========================================
# PHASE 1: VISION TRANSLATION SSE STREAMING
# ==========================================
class TranslateStreamRequest(BaseModel):
    image: str
    source_language: str = "auto"
    target_language: str = "en"

@router.post("/translate/image/stream")
async def translate_image_stream(request: TranslateStreamRequest):
    # Use the new bulletproof loader
    await ensure_vision_model_loaded()
        
    image_data = base64.b64decode(request.image)
    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
        tmp.write(image_data)
        tmp_path = tmp.name
        
    async def event_generator():
        try:
            async for region in translate_image_vision(
                image_path=tmp_path,
                source_language=request.source_language,
                target_language=request.target_language,
            ):
                yield f"data: {json.dumps(region, ensure_ascii=False)}\n\n"
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )

# ==========================================
# PHASE 4: VISION DETECTION VALIDATOR
# ==========================================
class ValidateRequest(BaseModel):
    image: str
    source_language: str = "ja"

@router.post("/translate/validate")
async def validate_detection(request: ValidateRequest):
    # Use the new bulletproof loader
    await ensure_vision_model_loaded()
        
    image_data = base64.b64decode(request.image)
    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
        tmp.write(image_data)
        tmp_path = tmp.name
        
    async def event_generator():
        try:
            async for region in translate_image_vision(
                image_path=tmp_path,
                source_language=request.source_language,
                target_language=request.source_language, 
            ):
                yield f"data: {json.dumps(region, ensure_ascii=False)}\n\n"
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )

# ==========================================
# SUPPORTED LANGUAGES
# ==========================================
SUPPORTED_LANGUAGES = [
    {"code": "ja",   "name": "Japanese"},
]

@router.get("/translate/languages")
async def get_supported_languages():
    return {"languages": SUPPORTED_LANGUAGES}