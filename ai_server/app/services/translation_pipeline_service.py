import gc
import re
import json
import asyncio
import platform
import logging
import torch 
from pathlib import Path

from app.services.ocr_pipeline_service import ocr_pipeline_service
from app.services.model_manager import model_manager
from app.core.config import settings

logger = logging.getLogger(__name__)

def _windows_force_vram_release() -> None:
    """
    Force the Windows OS to reclaim GPU memory pages after PyTorch del + empty_cache().
    No-op on Linux/macOS.
    Copy the implementation from model_manager.py where it already exists.
    """
    if platform.system() != "Windows":
        return
    
    try:
        import ctypes
        ctypes.windll.kernel32.SetProcessWorkingSetSize(-1, -1, -1)
        logger.info("Windows OS-level VRAM release triggered.")
    except Exception as e:
        logger.warning(f"Failed to force Windows VRAM release: {e}")
        pass   


async def hangoff_protocol() -> None:
    """
    Unload PyTorch models, force OS-level VRAM reclaim (Windows),
    Call only after all OCR pipeline work is complete.
    """
    logger.info("Executing Hangoff Protocol...")
    ocr_pipeline_service.unload()
    
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        torch.cuda.synchronize()   
    gc.collect()
    
    # ── OS-Level Memory Management ───────────────────────────────────────────
    _windows_force_vram_release()
    
    translation_model = getattr(settings, "TRANSLATION_MODEL", None)
    if not translation_model:
        raise RuntimeError(
            "TRANSLATION_MODEL is not set in .env. "
            "Set it to your LLM GGUF filename."
        )
        
    await model_manager.load_model(translation_model)
    logger.info("Hangoff Protocol complete. Translation model loaded.")

def _merge_translations(parsed: list[dict], originals: list[dict]) -> list[dict]:
    translation_map = {item["index"]: item.get("english", "") for item in parsed if "index" in item}
    return [{**r, "english": translation_map.get(r.get("index"), "")} for r in originals]


def _parse_translation_response(response: str, original_regions: list[dict]) -> list[dict]:
    """
    Parse the LLM's JSON response with aggressive fallback strategies.
    Step 0 always runs first: strip markdown fences.
    LLMs output ```json ... ``` blocks ~50% of the time
    even with an explicit "no fences" instruction in the prompt.
    """
    # Strip markdown fences (ALWAYS run first) ─────────────────────
    cleaned = re.sub(r"```(?:json)?\s*", "", response)
    cleaned = cleaned.replace("```", "").strip()
    
    # Direct parse of cleaned response ──────────────────────────
    try:
        parsed = json.loads(cleaned)
        if isinstance(parsed, list) and len(parsed) > 0:
            return _merge_translations(parsed, original_regions)
    except json.JSONDecodeError:
        pass
        
    # Find first '[' and last ']' in cleaned text ──────────────
    start = cleaned.find("[")
    end   = cleaned.rfind("]") + 1
    
    if start >= 0 and end > start:
        try:
            parsed = json.loads(cleaned[start:end])
            if isinstance(parsed, list) and len(parsed) > 0:
                return _merge_translations(parsed, original_regions)
        except json.JSONDecodeError:
            pass
            
    # Parse line-by-line for individual JSON objects ────────────
    partial = []
    for line in cleaned.splitlines():
        line = line.strip().rstrip(",")
        if line.startswith("{") and line.endswith("}"):
            try:
                obj = json.loads(line)
                if "index" in obj and "english" in obj:
                    partial.append(obj)
            except json.JSONDecodeError:
                continue
                
    if partial:
        return _merge_translations(partial, original_regions)
        
    # Return originals with empty english (do not fail the job) ─
    logger.warning(
        "Translation response could not be parsed after fence stripping. "
        f"Returning empty translations. Raw response head: {response[:200]}"
    )
    return [dict(r, english="") for r in original_regions]


async def translate_page(regions: list[dict]) -> list[dict]:
    """
    Translate ONE page using custom 'Sugoi' settings.
    Includes terminal streaming for debug visibility.
    """
    if not regions:
        return []
        
    input_json = json.dumps(
        [{"index": r.get("index"), "bbox": r.get("bbox"), "japanese": r.get("japanese"), "english": ""} for r in regions],
        ensure_ascii=False,
        indent=2,
    )
    
    # Load prompt from external SOP file
    prompt_path = Path(__file__).parent.parent / "prompts" / "translation.md"
    try:
        system_prompt = prompt_path.read_text("utf-8")
    except Exception as e:
        logger.error(f"Failed to load translation prompt from {prompt_path}: {e}")
        system_prompt = "You are a manga translator. Translate 'japanese' to 'english' in the provided JSON array."
    
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user",   "content": input_json},
    ]
    response_text = ""

    async for token in model_manager.generate_stream(
        messages=messages,
        max_tokens=4096,
        temperature=0.5,      
        top_k=40,             
        top_p=0.9,            
        min_p=0.05,           
        repeat_penalty=1.1,   
        stop=None,
    ):
        response_text += token
        
    return _parse_translation_response(response_text, regions)
