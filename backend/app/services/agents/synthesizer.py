import logging
from app.services.agents.orchestrator import WorkingMemory
from app.utils.ai_client import ai_client
from app.core.config import settings
from app.utils.prompt_loader import load_prompt

logger = logging.getLogger(__name__)

async def synthesize(user_message: str, working_memory: WorkingMemory, model: str) -> str:
    """
    Builds prompt from all tool results, calls AI with synthesizer.md to draft the final response.
    """
    prompt_instruction = load_prompt("agents/synthesizer")
    
    context_builder = [f"System Constraints: {prompt_instruction}", f"Original Core Request: {user_message}"]
    
    if working_memory.steps_results:
        for step_idx, result in working_memory.steps_results.items():
            context_builder.append(f"\n--- TOOL RESULT (Step {step_idx}) ---\n{result}\n")
    else:
        context_builder.append("\nNo tool results to synthesize.")
        
    if working_memory.context:
        context_builder.append(f"\n--- ADDITIONAL CONTEXT ---\n{working_memory.context}\n")
        
    system_prompt = "\n".join(context_builder)
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": "Begin final synthesis now."}
    ]
    
    try:
        response_text = ""
        async for chunk in ai_client.chat_stream(messages, model, max_tokens=settings.AGENT_MAX_TOKENS_SYNTHESIZER):
            response_text += chunk
        return response_text
    except Exception as e:
        logger.error(f"Failed to synthesize output: {e}")
        return "An error occurred during final synthesis."
