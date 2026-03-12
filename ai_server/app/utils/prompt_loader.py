"""
prompt_loader.py — ai_server/app/utils/prompt_loader.py

Loads system prompts from Markdown files under ai_server/app/prompts/.
Maps GGUF model filenames → prompt keys by reading the ai_server/.env file.

MODEL_PROMPT_MAP:
  CHAT_MODEL_FAST      → chats/fast.md
  CHAT_MODEL_THINKING  → chats/thinking.md
  CHAT_MODEL_CREATIVE  → chats/creative.md
  TRANSLATION_MODEL    → translation.md
"""

from pathlib import Path
import logging
from dotenv import dotenv_values

logger = logging.getLogger(__name__)

# Prompts root: ai_server/app/prompts/
_PROMPTS_DIR = Path(__file__).resolve().parents[1] / "prompts"

# .env file: ai_server/.env
_AI_ENV_PATH = Path(__file__).resolve().parents[2] / ".env"

# Key: exact GGUF filename  →  Value: path relative to prompts/ (no .md)
MODEL_PROMPT_MAP: dict[str, str] = {}

if _AI_ENV_PATH.exists():
    _env = dotenv_values(_AI_ENV_PATH)

    _map = {
        "CHAT_MODEL_FAST":      "chats/fast",
        "CHAT_MODEL_THINKING":  "chats/thinking",
        "CHAT_MODEL_CREATIVE":  "chats/creative",
        "TRANSLATION_MODEL":    "translation",
    }
    for env_key, prompt_key in _map.items():
        model = _env.get(env_key)
        if model:
            MODEL_PROMPT_MAP[model] = prompt_key
            logger.debug(f"[PromptLoader] Mapped '{model}' → '{prompt_key}'")
else:
    logger.warning(f"[PromptLoader] .env not found at {_AI_ENV_PATH}")

_cache: dict[str, str] = {}


def load_prompt(key: str, *, reload: bool = False) -> str:
    """Load a prompt by key (e.g. 'chats/fast') from the prompts directory."""
    if key in _cache and not reload:
        return _cache[key]

    prompt_path = _PROMPTS_DIR / f"{key}.md"
    if not prompt_path.exists():
        raise FileNotFoundError(
            f"[PromptLoader] Missing: {prompt_path}\n"
            f"Create ai_server/app/prompts/{key}.md to define this prompt."
        )

    text = prompt_path.read_text(encoding="utf-8").strip()
    _cache[key] = text
    logger.debug(f"[PromptLoader] '{key}' loaded ({len(text)} chars)")
    return text


def load_prompt_for_model(model_filename: str) -> str | None:
    """
    Look up which prompt belongs to a model filename and load it.
    Returns None if the model has no mapping or the .md file is missing.
    """
    key = MODEL_PROMPT_MAP.get(model_filename)
    if not key:
        logger.warning(
            f"[PromptLoader] No prompt mapped for '{model_filename}' — running without system prompt."
        )
        return None
    try:
        return load_prompt(key)
    except FileNotFoundError as e:
        logger.warning(str(e))
        return None


def reload_all() -> None:
    """Clear the in-memory cache — prompts are re-read from disk on next use."""
    _cache.clear()
    logger.info("[PromptLoader] Cache cleared.")