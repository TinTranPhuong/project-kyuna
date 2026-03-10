from .base import run_sub_agent
from typing import Dict, Any
from app.core.config import settings

async def run(task_description: str, context: str, run_id: str, sse_queue, db=None, user_id=None, model: str = None) -> str:
    tools_allowed = ["doc_search", "web_search", "web_fetch"]
    return await run_sub_agent(
        "coding", 
        "agents/sub_agents/coding", 
        task_description, 
        context, 
        tools_allowed, 
        run_id, 
        sse_queue, 
        db, 
        user_id,
        model,
        max_tokens=settings.AGENT_MAX_TOKENS_CODING
    )
