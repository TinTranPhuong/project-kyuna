"""Code Reviewer agent — bugs, security, quality with severity labels."""
from app.services.agents.coding_agents.base import run_coding_agent

TOOLS = ["file_read", "file_search", "file_list"]

async def run(task: str, context: str, user_id: str, session_id: str, sse_queue=None) -> str:
    return await run_coding_agent(
        agent_name="code_reviewer",
        prompt_key="coding/code_reviewer",
        task_description=task,
        context=context,
        tools_allowed=TOOLS,
        user_id=user_id,
        session_id=session_id,
        sse_queue=sse_queue,
    )
