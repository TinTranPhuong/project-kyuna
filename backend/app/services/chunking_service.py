import re
from dataclasses import dataclass
import tiktoken

@dataclass
class ChunkData:
    chunk_index: int
    content: str
    token_count: int
    page_number: int | None
    section_heading: str | None

_ENCODER = tiktoken.get_encoding("cl100k_base")

def count_tokens(text: str) -> int:
    return len(_ENCODER.encode(text))

def semantic_chunk(text: str, target_tokens: int = 400, overlap_tokens: int = 50) -> list[ChunkData]:
    """
    1. Split at natural boundaries (double newlines, heading patterns)
    2. Merge small fragments up to target_tokens
    3. Split oversized blocks at sentence end (". ", "! ", "? ")
    4. Apply overlap: prepend last overlap_tokens from previous chunk
    """
    # Split at double newlines first
    raw_blocks = [b.strip() for b in re.split(r'\n\n+', text) if b.strip()]
    
    # Merge small blocks, split large ones
    merged = []
    current = ""
    for block in raw_blocks:
        candidate = f"{current}\n\n{block}".strip() if current else block
        if count_tokens(candidate) <= target_tokens:
            current = candidate
        else:
            if current:
                merged.append(current)
            
            # Block itself is oversized — split at sentence boundaries
            if count_tokens(block) > target_tokens:
                merged.extend(_split_at_sentences(block, target_tokens))
                current = ""  # Reset current so we don't duplicate the oversized block
            else:
                current = block
                
    if current:
        merged.append(current)
        
    # Apply overlap and build ChunkData objects
    chunks = []
    for i, content in enumerate(merged):
        if i > 0 and overlap_tokens > 0:
            prev_tokens = _ENCODER.encode(merged[i - 1])
            overlap_text = _ENCODER.decode(prev_tokens[-overlap_tokens:])
            content = overlap_text + " " + content
            
        chunks.append(ChunkData(
            chunk_index=i,
            content=content.strip(),
            token_count=count_tokens(content),
            page_number=None,      
            section_heading=None,  
        ))
        
    return chunks

def _split_at_sentences(text: str, max_tokens: int) -> list[str]:
    """Split oversized text at sentence boundaries."""
    sentences = re.split(r'(?<=[.!?]) +', text)
    blocks, current = [], ""
    for sent in sentences:
        candidate = f"{current} {sent}".strip() if current else sent
        if count_tokens(candidate) <= max_tokens:
            current = candidate
        else:
            if current:
                blocks.append(current)
            current = sent
    if current:
        blocks.append(current)
    return blocks