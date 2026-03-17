"""Coding Reflector — pre/mid-run plan validation."""
import json
import logging
from app.utils.ai_client import ai_client
from app.core.config import settings
from app.utils.prompt_loader import load_prompt
from app.utils.response_utils import strip_think_tags

logger = logging.getLogger(__name__)


async def run_reflection(
    plan_or_step: str,
    context: str,
    model: str = "",
    max_tokens: int = 4096,
) -> str:
    """Run the reflector to validate a plan or step. Returns reflection text."""
    if not model:
        model = settings.CHAT_MODEL_AGENT

    prompt = load_prompt("coding/reflector")
    system_prompt = f"{prompt}\n\nSession Context:\n{context}"

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"Review this plan/step:\n{plan_or_step}"},
    ]

    response_text = ""
    async for chunk in ai_client.chat_stream(messages, model, max_tokens=max_tokens):
        response_text += chunk

    return strip_think_tags(response_text).strip()
