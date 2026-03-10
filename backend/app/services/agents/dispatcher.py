import asyncio
import logging
import json
from typing import Any, Dict, Optional
import inspect

from app.services.agents.tool_registry import TOOL_REGISTRY

logger = logging.getLogger(__name__)

# In-memory registry for Gate 2: run_id -> tool_name -> asyncio.Event
# Note: For multi-worker setups, this would need Redis PubSub.
_run_registry: Dict[str, Dict[str, asyncio.Event]] = {}
_run_results: Dict[str, Dict[str, str]] = {}

async def dispatch(tool_name: str, args: Dict[str, Any], run_id: str, sse_queue: asyncio.Queue, db=None, user_id=None) -> Any:
    """
    Executes a tool. If requires_hitl is True, emits an SSE event and waits for confirmation.
    """
    if tool_name not in TOOL_REGISTRY:
        logger.warning(f"Tool {tool_name} not found in registry.")
        return None

    tool = TOOL_REGISTRY[tool_name]
    
    # 1. Gate 2 - Check HITL
    if tool.get("requires_hitl", False):
        if run_id not in _run_registry:
            _run_registry[run_id] = {}
        if run_id not in _run_results:
            _run_results[run_id] = {}
            
        event = asyncio.Event()
        _run_registry[run_id][tool_name] = event
        
        # Emit confirmation event
        await sse_queue.put(f"data: {json.dumps({'event': 'confirmation_required', 'tool': tool_name, 'args': args})}\n\n")
        
        logger.info(f"Gate 2: Waiting for user confirmation on tool '{tool_name}' for run_id '{run_id}'")
        await event.wait()
        
        result = _run_results[run_id].get(tool_name, "cancelled")
        
        # Cleanup
        del _run_registry[run_id][tool_name]
        del _run_results[run_id][tool_name]
        
        if result == "cancelled":
            await sse_queue.put(f"data: {json.dumps({'event': 'confirmation_cancelled', 'tool': tool_name})}\n\n")
            return None
    
    # 2. Execute Tool
    try:
        fn = tool["fn"]
        # Determine args mapping.
        # This implementation simply passes args unpacked, but some tools may need user_id or db.
        # Safe fallback based on tool structure.
        kwargs = {}
        for key, value in args.items():
            kwargs[key] = value
            
        # Add implicitly required args depending on fn signature if not handled automatically
        sig = inspect.signature(fn)
        if "user_id" in sig.parameters and "user_id" not in kwargs and user_id:
            kwargs["user_id"] = str(user_id)
        if "db" in sig.parameters and "db" not in kwargs and db:
            kwargs["db"] = db
            
        await sse_queue.put(f"data: {json.dumps({'event': 'tool_start', 'tool': tool_name, 'args': args})}\n\n")
        
        result = await fn(**kwargs)
        
        await sse_queue.put(f"data: {json.dumps({'event': 'tool_result', 'tool': tool_name, 'result': result})}\n\n")
        return result
    except Exception as e:
        logger.error(f"Error executing tool {tool_name}: {e}")
        await sse_queue.put(f"data: {json.dumps({'event': 'tool_error', 'tool': tool_name, 'error': str(e)})}\n\n")
        return None

def confirm(run_id: str, tool_name: str):
    """Resumes a tool paused at Gate 2."""
    if run_id in _run_registry and tool_name in _run_registry[run_id]:
        _run_results[run_id][tool_name] = "proceed"
        _run_registry[run_id][tool_name].set()
        
def cancel(run_id: str, tool_name: str):
    """Cancels a tool paused at Gate 2."""
    if run_id in _run_registry and tool_name in _run_registry[run_id]:
        _run_results[run_id][tool_name] = "cancelled"
        _run_registry[run_id][tool_name].set()
