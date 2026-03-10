import logging
from dataclasses import dataclass
from app.services.agents.evaluator import EvalResult
from app.services.agents.orchestrator import WorkingMemory
from app.utils.ai_client import ai_client
from app.core.config import settings
from app.utils.prompt_loader import load_prompt
import json

logger = logging.getLogger(__name__)

@dataclass
class ReflectionResult:
    is_satisfactory: bool
    feedback: str

async def reflect_mid(context: str, working_memory: WorkingMemory, model: str) -> str:
    """Runs after memory agent to review current context state."""
    prompt_instruction = load_prompt("agents/reflector")
    system = f"{prompt_instruction}\n\nCONTEXT:\n{context}\n\nRESULTS SO FAR:\n{working_memory.steps_results}"
    
    messages = [{"role": "system", "content": system}, {"role": "user", "content": "Reflect mid-task."}]
    
    result = ""
    try:
        async for chunk in ai_client.chat_stream(messages, model, max_tokens=settings.AGENT_MAX_TOKENS_REFLECTOR):
            result += chunk
    except Exception as e:
        logger.error(f"Mid-reflection failed: {e}")
    return result

async def reflect_post(answer: str, plan_steps: list, model: str) -> str:
    """Runs after synthesizer to review final answer."""
    prompt_instruction = load_prompt("agents/reflector")
    system = f"{prompt_instruction}\n\nPLAN:\n{plan_steps}\n\nANSWER DRAFT:\n{answer}"
    
    messages = [{"role": "system", "content": system}, {"role": "user", "content": "Reflect post-task."}]
    
    result = ""
    try:
        async for chunk in ai_client.chat_stream(messages, model, max_tokens=settings.AGENT_MAX_TOKENS_REFLECTOR):
            result += chunk
    except Exception as e:
        logger.error(f"Post-reflection failed: {e}")
    return result

async def reflect_post_exec(working_memory: WorkingMemory, model: str) -> str:
    """Runs after all sub-agents have finished execution, before synthesis."""
    prompt_instruction = load_prompt("agents/reflector")
    results = str(working_memory.steps_results) if working_memory.steps_results else "No tool results."
    system = f"{prompt_instruction}\n\nReview the raw execution output from the sub-agents and tools. Identify any missing information or critical flaws before synthesis.\n\nRAW OUTPUT:\n{results}"
    
    messages = [{"role": "system", "content": system}, {"role": "user", "content": "Reflect on execution results."}]
    result = ""
    try:
        async for chunk in ai_client.chat_stream(messages, model, max_tokens=settings.AGENT_MAX_TOKENS_REFLECTOR):
            result += chunk
    except Exception as e:
        logger.error(f"Post-exec reflection failed: {e}")
    return result

async def reflect_final(answer: str, eval_result: EvalResult, model: str) -> ReflectionResult:
    """The final gate checking if the evaluated answer is sufficient to show to the user, with structured output for a redo loop."""
    prompt_instruction = load_prompt("agents/reflector")
    
    # We enforce JSON output here rather than creating another prompt file
    json_schema = 'CRITICAL RULE: Output EXACTLY ONE JSON object (no markdown, no prose). DO NOT output any <think> tags, conversational text, or formatting. Schema: {"is_satisfactory": true|false, "feedback": "Why it is satisfactory or what needs to be redone."}'
    
    eval_status = "PASSED" if eval_result.passed else f"FAILED (Failed Steps: {eval_result.failed_steps})"
    system = f"{prompt_instruction}\n\n{json_schema}\n\nEVALUATOR VERDICT: {eval_status}\nEVALUATOR FEEDBACK: {eval_result.feedback}\n\nFINAL ANSWER DRAFT:\n{answer}"
    
    messages = [{"role": "system", "content": system}, {"role": "user", "content": "Perform final reflection and produce JSON."}]
    
    try:
        response_text = ""
        async for chunk in ai_client.chat_stream(messages, model, max_tokens=settings.AGENT_MAX_TOKENS_REFLECTOR):
            response_text += chunk
            
        from app.utils.response_utils import extract_json_object
        data = json.loads(extract_json_object(response_text))
        return ReflectionResult(
            is_satisfactory=data.get("is_satisfactory", False),
            feedback=data.get("feedback", "No feedback provided.")
        )
    except Exception as e:
        logger.error(f"Final reflection failed: {e}")
        # Trigger a retry on error, since max_retries prevents infinite loops anyway
        return ReflectionResult(is_satisfactory=False, feedback=f"Error in final reflection: {e}")
