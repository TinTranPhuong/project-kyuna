"""
prompt_loader.py — ai_server/app/utils/prompt_loader.py

Loads system prompts from Markdown files under ai_server/app/prompts/.

Folder layout:
    prompts/
      chats/
        fast.md         ← Fast model (Qwen 3 8B)
        thinking.md     ← Thinking model (Qwen 3.5 35B)
        autotitle.md    ← Auto-title a conversation in 5 words
      translation.md    ← Manga bubble translation rules

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 HOW TO ADD A NEW MODEL PROMPT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  1. Create  prompts/chats/mymodel.md
  2. Add an entry to MODEL_PROMPT_MAP below:
       "MyModel-7B-Q4.gguf": "chats/mymodel"
  3. Restart the server. Done.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

from pathlib import Path
import logging
from dotenv import dotenv_values

logger = logging.getLogger(__name__)

# Prompts root is always relative to this file:
_PROMPTS_DIR = Path(__file__).resolve().parents[3] / "ai_server" / "app" / "prompts"

# Key   : exact GGUF filename (must match .env / models.py preset)
# Value : path relative to prompts/ WITHOUT the .md extension
MODEL_PROMPT_MAP: dict[str, str] = {}

# Dynamically read the AI Server's .env file
_ai_env_path = _PROMPTS_DIR.parent.parent.parent / "ai_server" / ".env"
if _ai_env_path.exists():
    _ai_env_config = dotenv_values(_ai_env_path)
    
    _fast_model = _ai_env_config.get("CHAT_MODEL_FAST")
    if _fast_model:
        MODEL_PROMPT_MAP[_fast_model] = "chats/fast"
        
    _thinking_model = _ai_env_config.get("CHAT_MODEL_THINKING")
    if _thinking_model:
        MODEL_PROMPT_MAP[_thinking_model] = "chats/thinking"
        
    _translation_model = _ai_env_config.get("TRANSLATION_MODEL")
    if _translation_model:
        MODEL_PROMPT_MAP[_translation_model] = "translation"

_cache: dict[str, str] = {}


def load_prompt(key: str, *, reload: bool = False) -> str:
    """
    Load a prompt by key (subdirectory/name without .md).

    Examples:
        load_prompt("chats/fast")       → prompts/chats/fast.md
        load_prompt("chats/thinking")   → prompts/chats/thinking.md
        load_prompt("chats/autotitle")  → prompts/chats/autotitle.md
        load_prompt("translation")      → prompts/translation.md

    Raises FileNotFoundError if the .md file does not exist.
    """
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

    Returns None (no system prompt) if the model has no entry in
    MODEL_PROMPT_MAP or if the .md file is missing — never crashes.

    Example:
        load_prompt_for_model("Qwen3.5-35B-A3B-UD-IQ3_S.gguf")
        → loads prompts/chats/thinking.md
    """
    key = MODEL_PROMPT_MAP.get(model_filename)
    if not key:
        logger.warning(f"[PromptLoader] No prompt mapped for '{model_filename}' — running without system prompt.")
        return None
    try:
        return load_prompt(key)
    except FileNotFoundError as e:
        logger.warning(str(e))
        return None


def reload_all() -> None:
    """Clear the cache — all prompts are re-read from disk on next use."""
    _cache.clear()
    logger.info("[PromptLoader] Cache cleared.")