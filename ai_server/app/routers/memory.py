import json
import logging
from fastapi import APIRouter
from pydantic import BaseModel
from app.services.model_manager import model_manager
from app.core.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)

EXTRACTION_SYSTEM = """You are a memory extraction assistant.
Extract facts worth remembering about the USER from this conversation.
Rules: Only extract facts about the USER. Minimum confidence 0.7.
Do NOT extract temporary states. DO extract preferences, goals, habits, relationships.
Output ONLY a valid JSON array. Nothing else. No explanation. No markdown.
If nothing worth remembering: output exactly []
Format: [{"subject":"user","predicate":"...","object":"...","raw":"...","confidence":0.0}]"""

class ExtractionRequest(BaseModel):
    messages: list[dict]   # [{"role": str, "content": str}]
    max_facts: int = 5

class ExtractionResponse(BaseModel):
    facts: list[dict]

@router.post("/memory/extract", response_model=ExtractionResponse)
async def extract_memory(request: ExtractionRequest):
    """
    Uses the currently loaded text model (not vision).
    max_tokens=512 — this is a short structured task.
    """
    if not model_manager.is_model_loaded():
        return ExtractionResponse(facts=[])

    # Format messages as readable conversation
    conv_str = "\n".join(
        f"{m.get('role', '').upper()}: {m.get('content', '')}"
        for m in request.messages[-12:]   # last 6 pairs max
    )

    prompt_messages = [
        {"role": "system", "content": EXTRACTION_SYSTEM},
        {"role": "user",   "content": f"Conversation:\n{conv_str}"}
    ]

    raw_output = ""
    try:
        async for token in model_manager.stream(prompt_messages, max_tokens=512, temperature=0.1):
            raw_output += token
    except Exception as e:
        logger.error(f"[Extraction] LLM call failed: {e}")
        return ExtractionResponse(facts=[])

    # Parse JSON — the only output should be a JSON array
    try:
        raw_output = raw_output.strip()
        # Strip any accidental markdown code fences
        if raw_output.startswith("```"):
            raw_output = raw_output.split("```")[1]
            if raw_output.lower().startswith("json"):
                raw_output = raw_output[4:]
        
        facts = json.loads(raw_output)
        if not isinstance(facts, list):
            facts = []

        # Filter low confidence
        facts = [f for f in facts if isinstance(f, dict) and float(f.get("confidence", 0)) >= 0.6]
        
        # Respect max_facts limit
        facts = facts[:request.max_facts]
        
        return ExtractionResponse(facts=facts)
        
    except (json.JSONDecodeError, ValueError) as e:
        logger.warning(f"[Extraction] JSON parse failed: {e} | Output was: {raw_output[:200]}")
        return ExtractionResponse(facts=[])