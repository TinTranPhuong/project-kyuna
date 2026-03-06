import re

def parse_txt(file_path: str, strip_markdown: bool = False) -> list[dict]:
    with open(file_path, "r", encoding="utf-8", errors="replace") as f:
        text = f.read()
        
    if strip_markdown:
        text = _strip_markdown(text)
        
    return [{"page_number": None, "text": text}]

def _strip_markdown(text: str) -> str:
    text = re.sub(r'^#{1,6}\s+', '', text, flags=re.MULTILINE)    # headings
    text = re.sub(r'\*\*(.+?)\*\*', r'\1', text)                  # bold
    text = re.sub(r'\*(.+?)\*', r'\1', text)                      # italic
    text = re.sub(r'\[(.+?)\]\(.+?\)', r'\1', text)               # links
    text = re.sub(r'`{1,3}.+?`{1,3}', '', text, flags=re.DOTALL)  # code
    return text.strip()