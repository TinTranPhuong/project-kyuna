import asyncio
import logging
from dataclasses import dataclass
import uuid

from app.services.embedding_service import embedding_service
from app.services.qdrant_service import qdrant_service
from app.services.memory_service import memory_service
from app.utils.ai_client import ai_client
from app.core.config import settings
from app.utils.prompt_loader import load_prompt

logger = logging.getLogger(__name__)

@dataclass
class MemoryContext:
    episodic: list
    semantic: list
    universal: list
    formatted: str

async def query_all_layers(user_id: str | uuid.UUID, query: str, db, model: str) -> MemoryContext:
    """
    Runs episodic, semantic, universal memory searches in parallel via asyncio.gather.
    Returns structurally assembled MemoryContext and calls the AI to format it.
    """
    vector = await embedding_service.embed_query(query)
    
    if vector:
         episodic, semantic, universal = await asyncio.gather(
             qdrant_service.search_memories(user_id, vector),
             qdrant_service.search_documents(user_id, vector),
             memory_service.get_universal_facts(db, user_id)
         )
    else:
         episodic, semantic = [], []
         universal = await memory_service.get_universal_facts(db, user_id)
         
    prompt_instruction = load_prompt("agents/memory_agent")
    system_prompt = f"{prompt_instruction}\n\nUser Query: {query}\n\nEpisodic: {episodic}\nSemantic: {semantic}\nUniversal: {universal}"
    
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": "Format the combined retrieved context based on your instructions."}
    ]
    
    formatted_context = ""
    try:
        async for chunk in ai_client.chat_stream(messages, model, max_tokens=settings.AGENT_MAX_TOKENS_MEMORY):
             formatted_context += chunk
    except Exception as e:
        logger.error(f"Failed to generate Memory Agent context: {e}")
        formatted_context = str(episodic) + "\n" + str(semantic) + "\n" + str(universal)
        
    return MemoryContext(
         episodic=episodic,
         semantic=semantic,
         universal=universal,
         formatted=formatted_context
    )
