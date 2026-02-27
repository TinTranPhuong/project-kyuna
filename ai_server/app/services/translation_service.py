import base64
import json
from PIL import Image
from pathlib import Path

from app.services.ocr_service import ocr_service, TextRegion
from app.services.model_manager import model_manager

async def translate_image_file(
    image_path: str,
    source_language: str,
    target_language: str,
    output_path: str,
) -> dict:
    """
    Full pipeline for one image page.
    Returns: {"has_text": bool, "regions": [{original, translated, bbox}]}
    """
    # Step 1: Run OCR
    regions = ocr_service.extract_text(image_path)
    if not regions:
        return {"has_text": False, "regions": []}
        
    # Step 2: Build translation prompt — batch all text in one LLM call
    original_texts = [r.text for r in regions]
    prompt = build_translation_prompt(original_texts, source_language, target_language)
    
    # Step 3: Call model
    # We use generate_stream and accumulate the tokens since we need the complete response
    response_text = ""
    async for token in model_manager.generate_stream(
        messages=[{"role": "user", "content": prompt}],
        max_tokens=2048,
        temperature=0.1,   # low temperature = deterministic translation
    ):
        response_text += token
        
    # Step 4: Parse response — expect JSON array of translated strings
    translated_texts = parse_translation_response(response_text, len(original_texts))
    
    # Step 5: Create text mapping (No image overlaying done in AI layer)
    regions_with_translation = [
        {"bbox": r.bbox, "original": r.text, "translated": t}
        for r, t in zip(regions, translated_texts)
    ]
    
    return {"has_text": True, "regions": regions_with_translation}

def build_translation_prompt(texts: list[str], source: str, target: str) -> str:
    """
    Build a prompt that asks the LLM to translate all texts at once.
    Returns JSON array format to make parsing reliable.
    """
    return f"""Translate the following {source} text snippets to {target}.
Return ONLY a JSON array of translated strings, in the same order.
Do not add explanations. Example: ["Hello", "Good morning"]

Texts to translate:
{json.dumps(texts, ensure_ascii=False)}

Translated:"""

def parse_translation_response(response: str, expected_count: int) -> list[str]:
    """
    Parse LLM translation response.
    Try JSON array first. If that fails, split by newlines as fallback.
    If count doesn't match, pad with empty strings.
    """
    try:
        # Find JSON array in response (LLM may add extra text before/after)
        start = response.find("[")
        end = response.rfind("]") + 1
        
        if start >= 0 and end > start:
            parsed = json.loads(response[start:end])
            if isinstance(parsed, list):
                # Ensure we have the right count
                while len(parsed) < expected_count:
                    parsed.append("")
                return parsed[:expected_count]
                
    except json.JSONDecodeError:
        pass
        
    # Fallback: split by newlines
    lines = [l.strip() for l in response.strip().split("\n") if l.strip()]
    
    while len(lines) < expected_count:
        lines.append("")
        
    return lines[:expected_count]