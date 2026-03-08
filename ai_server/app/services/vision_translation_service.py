import json
import logging
import asyncio
from app.services.model_manager import model_manager

logger = logging.getLogger(__name__)

async def translate_image_vision(image_path: str, source_language: str, target_language: str):
    """
    Legacy fallback endpoint for single-pass Vision LLM streaming.
    The architecture uses ocr_pipeline_service and translation_pipeline_service.
    """
    logger.info("Legacy translate_image_vision called.")
    yield {"status": "info", "message": "Using legacy vision endpoint. Please use pipeline."}
    await asyncio.sleep(0.5)
    yield {"status": "done", "regions": []}