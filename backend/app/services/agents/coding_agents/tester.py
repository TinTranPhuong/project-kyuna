"""Tester agent — unit tests, integration tests, mocks, fixtures."""
from app.services.agents.coding_agents.base import run_coding_agent

TOOLS = ["file_read", "file_write", "file_create", "file_search", "file_list"]

async def run(task: str, context: str, user_id: str, session_id: str, sse_queue=None) -> str:
    return await run_coding_agent(
        agent_name="tester",
        prompt_key="coding/tester",
        task_description=task,
        context=context,
        tools_allowed=TOOLS,
        user_id=user_id,
        session_id=session_id,
        sse_queue=sse_queue,
    )
