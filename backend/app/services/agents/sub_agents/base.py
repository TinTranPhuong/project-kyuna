import json
import logging
from typing import Dict, Any, List

from app.utils.ai_client import ai_client
from app.core.config import settings
from app.utils.prompt_loader import load_prompt
from app.services.agents.dispatcher import dispatch
from app.utils.response_utils import strip_think_tags

logger = logging.getLogger(__name__)

async def run_sub_agent(
    agent_name: str,
    prompt_key: str,
    task_description: str,
    context: str,
    tools_allowed: List[str],
    run_id: str,
    sse_queue,
    db=None,
    user_id=None,
    model: str = settings.CHAT_MODEL_AGENT,
    max_tokens: int = 13107
) -> str:
    """Core logic for a specialized sub-agent that can use tools."""
    prompt_instruction = load_prompt(prompt_key)
    
    # Give the agent a list of tools it can use based on its allowance
    from app.services.agents.tool_registry import TOOL_REGISTRY
    available_tools_docs = "\n".join([
        f"- {t}: {TOOL_REGISTRY[t]['description']}" for t in tools_allowed if t in TOOL_REGISTRY
    ])
    
    system_prompt = (
        f"{prompt_instruction}\n\n"
        f"Available Tools:\n{available_tools_docs}\n\n"
        f"Context from previous steps:\n{context}\n\n"
    )
    
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"Task: {task_description}"}
    ]
    
    # We allow the agent to iterate on tool loops. Simple loop for now: 1 iteration limit
    max_loops = 3
    for _ in range(max_loops):
        try:
            # Tell the client which sub-agent is active
            if sse_queue:
                await sse_queue.put(f"data: {json.dumps({'event': 'agent_start', 'agent': agent_name})}\n\n")

            response_text = ""
            async for chunk in ai_client.chat_stream(messages, model, max_tokens=max_tokens):
                response_text += chunk
            
            clean_text = strip_think_tags(response_text).strip()
            
            if sse_queue:
                await sse_queue.put(f"data: {json.dumps({'event': 'agent_end', 'agent': agent_name})}\n\n")

            # Check if it tried to call a tool (expecting a raw JSON block with tool_name and args)
            # Try to parse if it's formatted as json
            tool_call = None
            if clean_text.startswith("```json") and clean_text.endswith("```"):
                json_str = clean_text[7:-3].strip()
                try:
                    parsed = json.loads(json_str)
                    if "tool_name" in parsed and parsed["tool_name"] in tools_allowed:
                        tool_call = parsed
                except json.JSONDecodeError:
                    pass
            elif clean_text.startswith("{") and clean_text.endswith("}"):
                try:
                    parsed = json.loads(clean_text)
                    if "tool_name" in parsed and parsed["tool_name"] in tools_allowed:
                        tool_call = parsed
                except json.JSONDecodeError:
                    pass
                    
            if tool_call:
                # Dispatch tool
                logger.info(f"{agent_name} calling tool {tool_call['tool_name']}")
                tool_res = await dispatch(
                    tool_call["tool_name"], 
                    tool_call.get("args", {}), 
                    run_id, 
                    sse_queue, 
                    db=db, 
                    user_id=user_id
                )
                
                # If hitl was cancelled, dispatch returns None or handled status
                if tool_res is None or tool_res == "SKIP":
                    result_str = "Tool execution skipped or cancelled by human."
                else:
                    result_str = str(tool_res)
                    
                # Append to messages and loop so the agent can see the result and wrap up
                messages.append({"role": "assistant", "content": clean_text})
                messages.append({"role": "user", "content": f"Tool Result:\n{result_str}\n\nPlease proceed or wrap up."})
                continue # Next iteration
            else:
                # No tool call, must be final answer
                return clean_text
                
        except Exception as e:
            logger.error(f"{agent_name} failed: {e}")
            return f"Error running {agent_name}: {str(e)}"
            
    return f"{agent_name} hit max iterations. Last output: {messages[-1]['content']}"
