import json
import logging
from app.utils.ai_client import ai_client
from app.core.config import settings
from app.utils.prompt_loader import load_prompt

logger = logging.getLogger(__name__)

async def run_consensus(candidate_fact: str, model: str) -> bool:
    """
    Evaluates a candidate fact using two independent AI calls with the consensus prompt.
    Both must agree for the fact to be promoted.
    """
    prompt_instruction = load_prompt("agents/consensus")
    system = f"{prompt_instruction}\n\nCandidate Fact:\n{candidate_fact}"
    
    messages = [{"role": "system", "content": system}]
    
    # Needs two independent passes
    pass_1 = await _evaluate_pass(messages, model)
    pass_2 = await _evaluate_pass(messages, model)
    
    return pass_1 and pass_2

async def run_consensus_on_answer(answer: str, wm, model: str) -> dict:
    """
    Evaluates a final synthesized answer against the user's request context and tool results.
    Both independent passes must agree the answer is satisfactory.
    """
    prompt_instruction = load_prompt("agents/consensus_answer")
    
    context_str = wm.context if wm.context else "No context provided."
    results_str = str(wm.steps_results) if wm.steps_results else "No tool results."
    
    system = f"{prompt_instruction}\n\nOriginal Context:\n{context_str}\n\nTool Results:\n{results_str}\n\nCandidate Answer:\n{answer}"
    
    messages = [{"role": "system", "content": system}]
    
    pass_1, reason_1 = await _evaluate_answer_pass(messages, model)
    pass_2, reason_2 = await _evaluate_answer_pass(messages, model)
    
    agree = pass_1 and pass_2
    combined_reasonings = []
    if not pass_1: combined_reasonings.append(reason_1)
    if not pass_2: combined_reasonings.append(reason_2)
    if not combined_reasonings:
        combined_reasonings = [reason_1, reason_2]
        
    return {
        "agree": agree,
        "reasoning": " | ".join(combined_reasonings)
    }

async def _evaluate_pass(messages: list, model: str) -> bool:
    try:
        response_text = ""
        async for chunk in ai_client.chat_stream(messages, model, max_tokens=settings.AGENT_MAX_TOKENS_CONSENSUS):
            response_text += chunk
            
        from app.utils.response_utils import extract_json_object
        data = json.loads(extract_json_object(response_text))
        return data.get("agree", False)
    except Exception as e:
        logger.error(f"Consensus pass failed: {e}")
        return False

async def _evaluate_answer_pass(messages: list, model: str) -> tuple[bool, str]:
    try:
        response_text = ""
        async for chunk in ai_client.chat_stream(messages, model, max_tokens=settings.AGENT_MAX_TOKENS_CONSENSUS):
            response_text += chunk
            
        from app.utils.response_utils import extract_json_object
        data = json.loads(extract_json_object(response_text))
        return data.get("agree", False), data.get("reasoning", "No valid reason extracted.")
    except Exception as e:
        logger.error(f"Answer consensus pass failed: {e}")
        return False, f"Error: {e}"
