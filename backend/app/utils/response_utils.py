def strip_think_tags(text: str) -> str:
    """Strips <think> tags and markdown backticks from model output before JSON parsing."""
    if "</think>" in text:
        text = text.split("</think>")[-1].strip()
        
    text = text.strip()
    if text.startswith("```json"):
        text = text[7:]
    if text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
        
    return text.strip()

def extract_json_array(text: str) -> str:
    """Finds the first JSON array in the text and returns it."""
    text = strip_think_tags(text)
    try:
        start_idx = text.index('[')
        end_idx = text.rindex(']') + 1
        return text[start_idx:end_idx]
    except ValueError:
        return text

def extract_json_object(text: str) -> str:
    """Finds the first JSON object in the text and returns it."""
    text = strip_think_tags(text)
    try:
        start_idx = text.index('{')
        end_idx = text.rindex('}') + 1
        return text[start_idx:end_idx]
    except ValueError:
        return text
