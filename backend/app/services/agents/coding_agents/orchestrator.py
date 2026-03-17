"""Coding Orchestrator — generates JSON plan delegating to specialist agents."""
import json
import logging
from app.utils.ai_client import ai_client
from app.core.config import settings
from app.utils.prompt_loader import load_prompt
from app.utils.response_utils import strip_think_tags

logger = logging.getLogger(__name__)


async def generate_coding_plan(
    message: str,
    context: str,
    model: str = "",
    max_tokens: int = 8192,
) -> list[dict]:
    """
    Returns a list of plan steps: [{ "agent": "...", "task": "..." }, ...]
    """
    if not model:
        model = settings.CHAT_MODEL_ORCHESTRATOR or settings.CHAT_MODEL_AGENT

    prompt = load_prompt("coding/orchestrator")
    system_prompt = f"{prompt}\n\nSession Context:\n{context}"

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": message},
    ]

    response_text = ""
    async for chunk in ai_client.chat_stream(messages, model, max_tokens=max_tokens):
        response_text += chunk

    clean = strip_think_tags(response_text).strip()

    # Extract JSON array from response
    try:
        # Try direct parse
        plan = json.loads(clean)
        if isinstance(plan, list):
            return plan
        if isinstance(plan, dict) and "steps" in plan:
            return plan["steps"]
    except json.JSONDecodeError:
        pass

    # Try to find JSON array in text
    start = clean.find("[")
    end = clean.rfind("]") + 1
    if start >= 0 and end > start:
        try:
            plan = json.loads(clean[start:end])
            if isinstance(plan, list):
                return plan
        except json.JSONDecodeError:
            pass

    logger.error(f"[coding-orchestrator] Failed to parse plan: {clean[:200]}")
    return [{"agent": "analysis", "task": message}]
