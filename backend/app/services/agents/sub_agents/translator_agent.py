from .base import run_sub_agent
from typing import Dict, Any
from app.core.config import settings

async def run(task_description: str, context: str, run_id: str, sse_queue, db=None, user_id=None, model: str = None) -> str:
    tools_allowed = ["memory_search", "web_search"]
    return await run_sub_agent(
        "translator", 
        "agents/sub_agents/translator", 
        task_description, 
        context, 
        tools_allowed, 
        run_id, 
        sse_queue, 
        db, 
        user_id,
        model,
        max_tokens=settings.AGENT_MAX_TOKENS_TRANSLATOR
    )
