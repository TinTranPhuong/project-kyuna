import json
import logging
from dataclasses import dataclass
from typing import List

from app.schemas.agent import AgentPlanStep
from app.services.agents.orchestrator import WorkingMemory
from app.utils.ai_client import ai_client
from app.core.config import settings
from app.utils.prompt_loader import load_prompt

logger = logging.getLogger(__name__)

@dataclass
class EvalResult:
    passed: bool
    failed_steps: List[int]
    feedback: str

async def evaluate(plan_steps: List[AgentPlanStep], synthesized_answer: str, working_memory: WorkingMemory, model: str) -> EvalResult:
    """Verifies if the Synthesizer Agent successfully fulfilled original plan."""
    prompt_instruction = load_prompt("agents/evaluator")
    
    plan_text = json.dumps([s.model_dump() for s in plan_steps], indent=2)
    wm_text = json.dumps(working_memory.steps_results, indent=2)
    
    system_prompt = f"{prompt_instruction}\n\nPLAN:\n{plan_text}\n\nRESULTS:\n{wm_text}\n\nFINAL ANSWER:\n{synthesized_answer}"
    
    messages = [{"role": "system", "content": system_prompt}]
    
    try:
        response_text = ""
        async for chunk in ai_client.chat_stream(messages, model, max_tokens=settings.AGENT_MAX_TOKENS_EVALUATOR):
            response_text += chunk
            
        from app.utils.response_utils import extract_json_object
        data = json.loads(extract_json_object(response_text))
        return EvalResult(
            passed=data.get("passed", False),
            failed_steps=data.get("failed_steps", []),
            feedback=data.get("feedback", "No feedback.")
        )
    except Exception as e:
        logger.error(f"Evaluator failed: {e}")
        return EvalResult(passed=False, failed_steps=[], feedback=f"Evaluator error: {e}")
