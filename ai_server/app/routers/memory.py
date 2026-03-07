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
        {"role": "user",   "content": f"Here is the conversation history:\n\n{conv_str}\n\nTask:\nNow, output the extracted facts as a JSON array as instructed above. Do NOT converse. Output ONLY the JSON."}
    ]
    raw_output = ""
    try:
        async for token in model_manager.generate_stream(prompt_messages, max_tokens=2048, temperature=0.1):
            raw_output += token
    except Exception as e:
        logger.error(f"[Extraction] LLM call failed: {e}")
        return ExtractionResponse(facts=[])

    # Parse JSON from "Thinking" models which might output a lot of text before the JSON
    try:
        # Strip DeepSeek/Qwen thinking process
        if "</think>" in raw_output:
            raw_output = raw_output.split("</think>")[-1].strip()

        # Look for a JSON code block first
        import re
        json_match = re.search(r"```(?:json)?\s*(\[[\s\S]*?\])\s*```", raw_output, re.IGNORECASE)
        if json_match:
            json_text = json_match.group(1).strip()
        else:
            # Fallback: look for a JSON array of objects using brackets
            start_idx = raw_output.find('[')
            end_idx = raw_output.rfind(']')
            if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
                json_text = raw_output[start_idx:end_idx+1]
            else:
                json_text = raw_output
        
        facts = json.loads(json_text)
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