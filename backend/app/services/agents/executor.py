import logging
import asyncio
from app.services.agents.orchestrator import WorkingMemory
from app.services.agents.dispatcher import dispatch
from app.schemas.agent import AgentPlanStep

logger = logging.getLogger(__name__)

async def execute_plan(steps: list[AgentPlanStep], working_memory: WorkingMemory, user_id, db, sse_queue: asyncio.Queue) -> WorkingMemory:
    """
    Executes a plan sequentially. Each result is written to WorkingMemory.
    Previous results are injected as context for the next step.
    """
    for index, step in enumerate(steps):
        # We assume step.args could optionally refer to previous results
        # A simple injection could format string arguments containing prev results.
        # For simplicity, we just execute step by step.
        logger.info(f"Executor running step {index + 1}: {step.tool_name}")
        if getattr(step, "agent_name", None) and getattr(step, "agent_name") != "none":
            from app.services.agents.sub_agents import SUB_AGENT_REGISTRY
            if step.agent_name in SUB_AGENT_REGISTRY:
                context = str(working_memory.steps_results)
                logger.info(f"Executor running sub-agent {step.agent_name} for step {index + 1}")
                result = await SUB_AGENT_REGISTRY[step.agent_name](
                    task_description=step.description, 
                    context=context, 
                    run_id=working_memory.run_id, 
                    sse_queue=sse_queue, 
                    db=db, 
                    user_id=user_id
                )
            else:
                logger.warning(f"Sub-agent {step.agent_name} not found.")
                result = f"Error: Agent {step.agent_name} not found."
        else:
            # Dispatch the tool via dispatcher. It will pause internally if Gate 2 HITL required.
            result = await dispatch(step.tool_name, step.args, working_memory.run_id, sse_queue, db=db, user_id=user_id)
        
        # Record result
        if result == "SKIP":
            continue
            
        working_memory.steps_results[int(step.step_index)] = result
        
    return working_memory
