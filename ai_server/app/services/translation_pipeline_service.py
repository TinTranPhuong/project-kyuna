import gc
import re
import json
import asyncio
import platform
import logging
import torch # type: ignore

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
        # -1, -1 forces the OS to aggressively swap out unused memory pages
        ctypes.windll.kernel32.SetProcessWorkingSetSize(-1, -1, -1)
        logger.info("Windows OS-level VRAM release triggered.")
    except Exception as e:
        logger.warning(f"Failed to force Windows VRAM release: {e}")
        pass   # best-effort — do not crash the pipeline if ctypes fails


async def hangoff_protocol() -> None:
    """
    Stage 4: Unload PyTorch models, force OS-level VRAM reclaim (Windows),
    then load Qwen 35B / OpenAI 20B via llama.cpp.
    Call only after all OCR pipeline work is complete.
    """
    logger.info("Executing Hangoff Protocol...")
    
    # Unload both detector + OCR models in one call
    ocr_pipeline_service.unload()
    
    # Standard PyTorch cache flush
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        torch.cuda.synchronize()
        
    gc.collect()
    
    # ── Windows VRAM Ghost Memory Fix ────────────────────────────────────────
    # On Windows, PyTorch's empty_cache() marks the memory as free internally
    # but does NOT yield it back to the OS. llama.cpp then fails to get a
    # contiguous 22GB block for the LLM and throws CUDA OOM.
    # _windows_force_vram_release() calls Win32 SetProcessWorkingSetSize via
    # ctypes to force the OS to actually reclaim the pages.
    # This is a no-op on Linux/macOS — safe to call unconditionally.
    _windows_force_vram_release()
    
    translation_model = getattr(settings, "TRANSLATION_MODEL", None)
    if not translation_model:
        raise RuntimeError(
            "TRANSLATION_MODEL is not set in .env. "
            "Set it to your LLM GGUF filename (e.g. OpenAI-20B-NEOPlus-Uncensored-IQ4_NL.gguf)."
        )
        
    await model_manager.load_model(translation_model)
    logger.info("Hangoff Protocol complete. Translation model loaded.")


def _merge_translations(parsed: list[dict], originals: list[dict]) -> list[dict]:
    """Merge by index. Missing entries get empty english string."""
    translation_map = {item["index"]: item.get("english", "") for item in parsed if "index" in item}
    return [{**r, "english": translation_map.get(r.get("index"), "")} for r in originals]


def _parse_translation_response(response: str, original_regions: list[dict]) -> list[dict]:
    """
    Parse the LLM's JSON response with aggressive fallback strategies.
    Step 0 always runs first: strip markdown fences.
    LLMs output ```json ... ``` blocks ~50% of the time
    even with an explicit "no fences" instruction in the prompt.
    """
    # ── Step 0: Strip markdown fences (ALWAYS run first) ─────────────────────
    # Handles: ```json\n...\n``` and ```\n...\n``` and stray ``` anywhere
    cleaned = re.sub(r"```(?:json)?\s*", "", response)
    cleaned = cleaned.replace("```", "").strip()
    
    # ── Strategy 1: Direct parse of cleaned response ──────────────────────────
    try:
        parsed = json.loads(cleaned)
        if isinstance(parsed, list) and len(parsed) > 0:
            return _merge_translations(parsed, original_regions)
    except json.JSONDecodeError:
        pass
        
    # ── Strategy 2: Find first '[' and last ']' in cleaned text ──────────────
    start = cleaned.find("[")
    end   = cleaned.rfind("]") + 1
    
    if start >= 0 and end > start:
        try:
            parsed = json.loads(cleaned[start:end])
            if isinstance(parsed, list) and len(parsed) > 0:
                return _merge_translations(parsed, original_regions)
        except json.JSONDecodeError:
            pass
            
    # ── Strategy 3: Parse line-by-line for individual JSON objects ────────────
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
        
    # ── Strategy 4: Return originals with empty english (do not fail the job) ─
    logger.warning(
        "Translation response could not be parsed after fence stripping. "
        f"Returning empty translations. Raw response head: {response[:200]}"
    )
    return [dict(r, english="") for r in original_regions]


async def translate_page(regions: list[dict]) -> list[dict]:
    """
    Stage 5: Translate ONE page using custom 'Creative' settings.
    """
    if not regions:
        return []
        
    input_json = json.dumps(
        [{"index": r.get("index"), "bbox": r.get("bbox"), "japanese": r.get("japanese"), "english": ""} for r in regions],
        ensure_ascii=False,
        indent=2,
    )
    
    system_prompt = (
        "You are a professional manga translator specializing in Japanese to English localization.\n"
        "You are translating a single manga page. All items below are from the same scene.\n\n"
        "Rules:\n"
        "- Translate ONLY the \"japanese\" field values. Fill in the \"english\" field.\n"
        "- Keep all other fields (index, bbox) EXACTLY unchanged.\n"
        "- Preserve character voice and tone consistently across all bubbles.\n"
        "- For sound effects (short katakana like ドン, ガン): use punchy English equivalents (BOOM, CRASH).\n"
        "- For narration/internal monologue: natural flowing English.\n"
        "- Return ONLY the completed JSON array. No explanations, no markdown fences."
    )
    
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user",   "content": input_json},
    ]
    
    response_text = ""
    
    # 👇 HERE IS THE HARDCODED CONFIGURATION
    async for token in model_manager.generate_stream(
        messages=messages,
        max_tokens=4096,
        
        # 🚨 Your Custom "Creative" Settings:
        temperature=0.5,      # High creativity
        top_k=40,             # Standard filtering
        top_p=0.95,           # High nucleus sampling
        min_p=0.05,           # Cut off low-probability tokens
        repeat_penalty=1.1,   # Reduce repetition
        
        stop=None,
    ):
        response_text += token
        
    return _parse_translation_response(response_text, regions)
