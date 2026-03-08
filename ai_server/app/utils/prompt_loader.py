import os
from pathlib import Path

# Define the directory where prompt templates are stored
PROMPTS_DIR = Path(__file__).resolve().parent.parent / "prompts"

def load_prompt_for_model(model_name: str, prompt_type: str = "chat") -> str:
    """
    Loads a prompt template for a specific model or falls back to default.
    Args:
        model_name (str): The name of the model (e.g., "Qwen3.5-35B").
        prompt_type (str): The type of prompt (e.g., "chat", "translation").

    Returns:
        str: The content of the prompt template.
    """
    # Normalize model name to finding matching files (simple logic for now)
    # You can expand this logic to map specific filenames to model families
    
    filename = "default.txt"
    
    if "qwen" in model_name.lower():
        filename = "qwen_chat.txt"
    elif "mistral" in model_name.lower():
        filename = "mistral_chat.txt"

    prompt_path = PROMPTS_DIR / filename
    
    if not prompt_path.exists():
        return "System: You are a helpful AI assistant.\nUser: {input}\nAssistant:"

    try:
        with open(prompt_path, "r", encoding="utf-8") as f:
            return f.read()
    except Exception as e:
        print(f"Error loading prompt {filename}: {e}")
        return "System: You are a helpful AI assistant.\nUser: {input}\nAssistant:"

def load_system_prompt() -> str:
    """
    Simple helper to just get the base system prompt if needed.
    """
    return "You are Kyuna, an advanced AI assistant."