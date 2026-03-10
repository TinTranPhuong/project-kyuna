import json
import logging
from dataclasses import dataclass, field
from typing import List, Dict, Any
from app.schemas.agent import AgentPlanStep
from app.utils.ai_client import ai_client
from app.core.config import settings
from app.utils.prompt_loader import load_prompt

logger = logging.getLogger(__name__)

@dataclass
class WorkingMemory:
    run_id: str
    steps_results: Dict[int, Any] = field(default_factory=dict)
    context: str = ""

async def generate_plan(user_message: str, context: str, model: str) -> List[AgentPlanStep]:
    """Generates a step-by-step plan using the orchestrator system prompt."""
    prompt_instruction = load_prompt("agents/orchestrator")
    
    system_prompt = f"{prompt_instruction}\n\nContext:\n{context}" if context else prompt_instruction
    
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_message}
    ]
    
    try:
        response_text = ""
        async for chunk in ai_client.chat_stream(messages, model, max_tokens=settings.AGENT_MAX_TOKENS_ORCHESTRATOR):
            response_text += chunk
            
        from app.utils.response_utils import extract_json_array
        plan_data = json.loads(extract_json_array(response_text))
        
        steps = []
        for step in plan_data:
            steps.append(AgentPlanStep(**step))
            
        return steps
    except Exception as e:
        logger.error(f"Failed to generate plan: {e}")
        raise
