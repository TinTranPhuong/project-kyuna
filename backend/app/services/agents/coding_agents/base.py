"""
Shared execution logic for coding specialist agents.
Same tool-loop pattern as sub_agents/base.py but uses coding-specific prompts and file tools.
"""
import json
import re
import logging
from typing import List

from app.utils.ai_client import ai_client
from app.core.config import settings
from app.utils.prompt_loader import load_prompt
from app.utils.response_utils import strip_think_tags
from app.services.file_tools import (
    file_read, file_write, file_create, file_delete,
    file_list, file_rename, file_search
)

logger = logging.getLogger(__name__)

# Map tool names to their actual async functions
CODING_TOOL_FNS = {
    "file_read": file_read,
    "file_write": file_write,
    "file_create": file_create,
    "file_delete": file_delete,
    "file_list": file_list,
    "file_rename": file_rename,
    "file_search": file_search,
}

# Tool descriptions for injection into agent prompts
CODING_TOOL_DOCS = {
    "file_read": "Read file content. Args: { \"path\": \"relative/path\" }",
    "file_write": "Write/overwrite a file. Args: { \"path\": \"relative/path\", \"content\": \"full file content\" }",
    "file_create": "Create a new file (fails if exists, use file_write to overwrite). Args: { \"path\": \"relative/path\", \"content\": \"full file content\" }",
    "file_delete": "Delete a file (requires HITL confirmation). Args: { \"path\": \"relative/path\" }",
    "file_list": "List all files in the session. Args: {} (no arguments needed)",
    "file_rename": "Rename a file. Args: { \"old_path\": \"old/path\", \"new_path\": \"new/path\" }",
    "file_search": "Grep search across files. Args: { \"query\": \"search term\" }",
}


async def run_coding_agent(
    agent_name: str,
    prompt_key: str,
    task_description: str,
    context: str,
    tools_allowed: List[str],
    user_id: str,
    session_id: str,
    sse_queue=None,
    model: str = "",
    max_tokens: int = 0,
) -> str:
    """Execute a coding specialist agent with file tool capabilities."""
    if not model:
        model = settings.CHAT_MODEL_AGENT
    if not max_tokens:
        max_tokens = getattr(settings, 'AGENT_MAX_TOKENS_CODING', 16384)

    try:
        prompt_instruction = load_prompt(prompt_key)
    except FileNotFoundError:
        logger.warning(f"[coding] No prompt found for {prompt_key}, using default")
        prompt_instruction = f"You are the {agent_name} agent. Complete the task using the available file tools."

    # Build tool docs for allowed tools
    available_tools_docs = "\n".join([
        f"- {t}: {CODING_TOOL_DOCS[t]}" for t in tools_allowed if t in CODING_TOOL_DOCS
    ])

    system_prompt = (
        f"{prompt_instruction}\n\n"
        f"# AVAILABLE TOOLS\n{available_tools_docs}\n\n"
        f"# CRITICAL TOOL CALL INSTRUCTIONS\n"
        f"When you want to use a tool, you MUST output ONLY a raw JSON object — nothing else:\n"
        f'{{"tool_name": "<name>", "args": {{...}}}}\n\n'
        f"RULES:\n"
        f"- Output the JSON object DIRECTLY. No preamble, no explanation, no markdown.\n"
        f"- Do NOT wrap your response in <think> tags or reasoning text before the JSON.\n"
        f"- Do NOT use ```json code fences around tool calls.\n"
        f"- After each tool result, call another tool OR provide your final plain text summary.\n"
        f"- When you call file_write or file_create, the 'content' field must contain the COMPLETE file content. YOU MUST ESCAPE NEWLINES (`\\n`) and quotes (`\\\"`) inside the JSON string!\n\n"
        f"Examples:\n"
        f'{{"tool_name": "file_list", "args": {{}}}}\n'
        f'{{"tool_name": "file_read", "args": {{"path": "src/main.py"}}}}\n'
        f'{{"tool_name": "file_write", "args": {{"path": "src/main.py", "content": "print(\'hello\')\\n"}}}}\n'
        f'{{"tool_name": "file_create", "args": {{"path": "new_file.py", "content": "# new file\\n"}}}}\n\n'
        f"# SESSION CONTEXT\n{context}\n"
    )

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"Task: {task_description}"},
    ]

    max_loops = 8
    final_text_parts = []

    for loop_i in range(max_loops):
        try:
            if sse_queue:
                await sse_queue.put(json.dumps({"event": "agent_start", "agent": agent_name}))

            response_text = ""
            async for chunk in ai_client.chat_stream(messages, model, max_tokens=max_tokens):
                response_text += chunk

            clean_text = strip_think_tags(response_text).strip()

            if sse_queue:
                await sse_queue.put(json.dumps({"event": "agent_end", "agent": agent_name}))

            # Try to parse as tool call
            tool_call = _parse_tool_call(clean_text, tools_allowed)

            if tool_call:
                tool_name = tool_call["tool_name"]
                tool_args = tool_call.get("args", {})
                logger.info(f"[coding] {agent_name} calling {tool_name} with keys={list(tool_args.keys())}")

                if sse_queue:
                    # Don't send full content in args for SSE (can be huge)
                    safe_args = {k: (v[:100] + "..." if isinstance(v, str) and len(v) > 100 else v) for k, v in tool_args.items()}
                    await sse_queue.put(json.dumps({
                        "event": "tool_start", "tool": tool_name, "args": safe_args
                    }))

                # Execute the tool
                result = await _execute_coding_tool(
                    tool_name, tool_args, user_id, session_id, sse_queue
                )

                if sse_queue:
                    await sse_queue.put(json.dumps({
                        "event": "tool_result", "tool": tool_name,
                        "result": result[:500] if len(result) > 500 else result
                    }))

                messages.append({"role": "assistant", "content": clean_text})
                messages.append({"role": "user", "content": f"Tool Result:\n{result}\n\nContinue with more tools or provide your final summary."})
                continue
            else:
                # Check if agent called a real tool that's just not in its allowlist
                all_tools = list(CODING_TOOL_FNS.keys())
                rejected_call = _parse_tool_call(clean_text, all_tools)
                if rejected_call:
                    rejected_name = rejected_call["tool_name"]
                    logger.warning(f"[coding] {agent_name} called disallowed tool: {rejected_name}")
                    messages.append({"role": "assistant", "content": clean_text})
                    messages.append({"role": "user", "content": (
                        f"Tool '{rejected_name}' is NOT available to you. "
                        f"Your available tools are: {', '.join(tools_allowed)}. "
                        f"Use one of those tools or provide your final answer as plain text."
                    )})
                    continue
                # No tool call — this is the final answer
                return clean_text

        except Exception as e:
            logger.error(f"[coding] {agent_name} failed on loop {loop_i}: {e}", exc_info=True)
            return f"Error running {agent_name}: {str(e)}"

    return f"{agent_name} completed after {max_loops} tool calls."


def _parse_tool_call(text: str, allowed: List[str]) -> dict | None:
    """
    Extract a tool call JSON from the agent's response.
    
    Uses json.JSONDecoder.raw_decode() which correctly handles braces/quotes
    inside JSON string values (e.g. Python code with f-strings, dicts, etc).
    """
    decoder = json.JSONDecoder()

    # Pre-process: strip markdown fences if the whole text is wrapped
    stripped = text.strip()
    if stripped.startswith("```json"):
        stripped = stripped[7:]
    elif stripped.startswith("```"):
        stripped = stripped[3:]
    if stripped.endswith("```"):
        stripped = stripped[:-3]
    stripped = stripped.strip()

    # Strategy 1: Try raw_decode on the stripped text from every '{' position
    result = _raw_decode_tool_call(stripped, allowed, decoder)
    if result:
        return result

    # Strategy 2: If strip changed the text, also try the original
    if stripped != text.strip():
        result = _raw_decode_tool_call(text.strip(), allowed, decoder)
        if result:
            return result

    # Strategy 3: Find JSON blocks between code fences in the middle of text
    fence_pattern = r'```(?:json)?\s*(\{.*?\})\s*```'
    fence_matches = re.findall(fence_pattern, text, re.DOTALL)
    for match in fence_matches:
        result = _raw_decode_tool_call(match.strip(), allowed, decoder)
        if result:
            return result

    return None


def _raw_decode_tool_call(text: str, allowed: List[str], decoder: json.JSONDecoder) -> dict | None:
    """
    Scan text for each '{' and try json.raw_decode at that position.
    raw_decode correctly handles all JSON string escaping, so braces 
    inside string values (like Python code) don't break parsing.
    """
    idx = 0
    while idx < len(text):
        # Find the next '{' that might start a tool call
        pos = text.find('{', idx)
        if pos == -1:
            break

        # Quick check: does "tool_name" appear nearby?
        nearby = text[pos:pos + 300]
        if '"tool_name"' not in nearby:
            idx = pos + 1
            continue

        try:
            obj, end_pos = decoder.raw_decode(text, pos)
            if isinstance(obj, dict) and "tool_name" in obj and obj["tool_name"] in allowed:
                return obj
        except json.JSONDecodeError as e:
            # Log this — likely means the JSON was truncated (model hit max_tokens)
            snippet = text[pos:pos + 100].replace('\n', '\\n')
            logger.warning(f"[coding] JSON decode failed at pos {pos}: {e}. Snippet: {snippet}...")

        idx = pos + 1

    return None


async def _execute_coding_tool(
    tool_name: str, args: dict, user_id: str, session_id: str, sse_queue=None
) -> str:
    """Execute a coding file tool and emit SSE events for file changes."""
    fn = CODING_TOOL_FNS.get(tool_name)
    if not fn:
        return f"Unknown tool: {tool_name}"

    # Inject user_id and session_id into all tool calls
    kwargs = {"user_id": user_id, "session_id": session_id, **args}

    try:
        result = await fn(**kwargs)

        # Emit file_patch / file_created / file_deleted SSE events
        if sse_queue:
            if tool_name == "file_write" and "path" in args:
                content = args.get("content", "")
                changed_lines = list(range(1, content.count("\n") + 2))[:20]
                await sse_queue.put(json.dumps({
                    "event": "file_patch",
                    "file": args["path"],
                    "content": content,
                    "changed_lines": changed_lines
                }))
            elif tool_name == "file_create" and "path" in args:
                content = args.get("content", "")
                await sse_queue.put(json.dumps({
                    "event": "file_created",
                    "file": args["path"],
                    "content": content,
                }))
            elif tool_name == "file_delete" and "path" in args:
                await sse_queue.put(json.dumps({
                    "event": "file_deleted", "file": args["path"]
                }))

        return result
    except TypeError as e:
        logger.error(f"[coding] Tool {tool_name} bad args: {args} — {e}")
        return f"Tool error (bad arguments): {e}. Expected args: {CODING_TOOL_DOCS.get(tool_name, 'unknown')}"
    except Exception as e:
        logger.error(f"[coding] Tool {tool_name} failed: {e}")
        return f"Tool error: {e}"
