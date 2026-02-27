import os
import base64
import tempfile
from fastapi import APIRouter
from pydantic import BaseModel

from app.services.translation_service import translate_image_file

router = APIRouter()

class TranslateRequest(BaseModel):
    image: str           # base64 encoded image
    source_language: str = "auto"
    target_language: str = "en"

@router.post("/translate/image")
async def translate_image(request: TranslateRequest):
    """
    1. Decode base64 image -> save to temp file
    2. Run OCR via ocr_service
    3. Build translation prompt from all extracted text
    4. Call LLM for translation
    5. Return text mapping without overlaying
    """
    image_data = base64.b64decode(request.image)
    
    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
        tmp.write(image_data)
        tmp_path = tmp.name
        
    try:
        result = await translate_image_file(
            image_path=tmp_path,
            source_language=request.source_language,
            target_language=request.target_language,
            output_path=None,   # Delegate image overlay to the backend
        )
        return result
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)