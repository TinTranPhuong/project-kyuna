import logging

logger = logging.getLogger(__name__)

async def translate_image_file(image_path: str, source_language: str, target_language: str, output_path: str | None = None):
    """
    Legacy fallback endpoint for backward compatibility.
    The new V2 architecture uses ocr_pipeline_service and translation_pipeline_service.
    """
    logger.info("Legacy translate_image_file called.")
    return {
        "status": "success", 
        "message": "Legacy translation endpoint reached. Please use V2 pipeline endpoints."
    }