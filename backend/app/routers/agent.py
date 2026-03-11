from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import Optional, Dict, Any
from uuid import UUID
import asyncio
import json
from app.core.database import get_db
from app.core.config import settings
from app.dependencies.auth import get_current_user
from app.models.user import User

from app.models.agent import AgentPlan, AgentRun
from app.schemas.agent import AgentApproveRequest, AgentPlanStep
from app.services.agents import orchestrator, dispatcher
from fastapi.responses import StreamingResponse

router = APIRouter()

# Global dict to store sse_queues mapping run_id -> asyncio.Queue
_sse_queues: Dict[str, asyncio.Queue] = {}

# Simple in-memory storage for run state (model and original message) to pass across endpoints
_run_data: Dict[str, Dict[str, Any]] = {}

@router.post("/runs")
async def create_agent_run(
    request: Request,
    body: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)):
    """
    Generates a step-by-step plan for the user and emits via SSE. Includes Phase 2/3 pre-planning.
    """
    conversation_id_str = body.get("conversation_id")
    user_message = body.get("message")
    model_used = body.get("model_used")
    
    if not conversation_id_str or not user_message:
        raise HTTPException(status_code=400, detail="conversation_id and message are required.")
        
    try:
        conversation_id = UUID(conversation_id_str)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid conversation_id format.")

    plan = AgentPlan(conversation_id=conversation_id, user_id=current_user.id)
    db.add(plan)
    await db.commit()
    await db.refresh(plan)
    
    run = AgentRun(plan_id=plan.id, mode="agentic")
    db.add(run)
    await db.commit()
    await db.refresh(run)
    
    # --- SAVE USER MESSAGE ---
    from app.services.chat_service import verify_and_save_user_message
    from app.schemas.chat import ChatMessageRequest
    try:
        await verify_and_save_user_message(
            db=db,
            user_id=str(current_user.id),
            conversation_id=conversation_id,
            data=ChatMessageRequest(content=user_message, model_used=model_used)
        )
    except Exception as e:
        print(f"Failed to save user message: {e}")

    # Fetch recent conversation history
    from app.models.chat import ChatMessage
    stmt = select(ChatMessage).where(ChatMessage.conversation_id == conversation_id).order_by(ChatMessage.created_at.asc())
    messages = list((await db.execute(stmt)).scalars().all())
    
    from app.utils.response_utils import strip_think_tags
    history_lines = []
    
    # If the current user message was saved successfully, exclude it from the history
    if messages and messages[-1].role == "user" and messages[-1].content == user_message:
        past_messages = messages[:-1]
    else:
        past_messages = messages
        
    # Take the last 10 messages for context
    for msg in past_messages[-10:]: 
        role = "User" if msg.role == "user" else "Assistant"
        content = strip_think_tags(msg.content).strip() if msg.role == "assistant" else msg.content
        history_lines.append(f"{role}: {content}")
        
    conversation_history_str = "\n".join(history_lines) if history_lines else "No prior conversation history."

    run_id_str = str(run.id)
    _run_data[run_id_str] = {"message": user_message, "model": model_used, "memory_context": "", "conversation_history": conversation_history_str, "conversation_id": conversation_id}
    
    queue = asyncio.Queue()
    _sse_queues[run_id_str] = queue

    async def _event_generator():
        try:
            from app.services.agents.memory_agent import query_all_layers
            from app.services.agents.reflector import reflect_mid
            from app.services.agents.orchestrator import WorkingMemory
            
            # Fetch conversation history early for memory agent
            history_ctx = _run_data[run_id_str].get("conversation_history", "")
            
            # 1. Memory Agent
            await queue.put("data: " + json.dumps({'event': 'token', 'token': 'Gathering context layered memories...\n'}) + "\n\n")
            await queue.put("data: " + json.dumps({'event': 'agent_start', 'agent': 'memory'}) + "\n\n")
            memory_ctx = await query_all_layers(user_id=current_user.id, query=user_message, conversation_history=history_ctx, db=db, model=model_used)
            await queue.put("data: " + json.dumps({'event': 'agent_end', 'agent': 'memory'}) + "\n\n")
            
            # 2. Reflector Mid
            await queue.put("data: " + json.dumps({'event': 'token', 'token': 'Reflecting on context...\n'}) + "\n\n")
            await queue.put("data: " + json.dumps({'event': 'agent_start', 'agent': 'reflector'}) + "\n\n")
            wm = WorkingMemory(run_id=run_id_str, context=memory_ctx.formatted)
            reflection = await reflect_mid(memory_ctx.formatted, wm, model_used)
            await queue.put("data: " + json.dumps({'event': 'agent_end', 'agent': 'reflector'}) + "\n\n")
            
            # Inject conversation history into context
            history_ctx = _run_data[run_id_str].get("conversation_history", "")
            combined_context = f"--- CONVERSATION HISTORY ---\n{history_ctx}\n\n--- MEMORIES ---\n{memory_ctx.formatted}\n\n--- REFLECTION ---\n{reflection}"
            _run_data[run_id_str]["memory_context"] = combined_context
            
            # 3. Create plan (with max 3 retries if JSON fails)
            orchestrator_model = settings.CHAT_MODEL_ORCHESTRATOR or model_used
            
            max_plan_retries = 3
            steps = None
            last_error = None
            
            for attempt in range(max_plan_retries):
                await queue.put("data: " + json.dumps({'event': 'token', 'token': f'Generating plan (Attempt {attempt + 1})...\n'}) + "\n\n")
                await queue.put("data: " + json.dumps({'event': 'agent_start', 'agent': 'orchestrator'}) + "\n\n")
                
                try:
                    steps = await orchestrator.generate_plan(user_message, combined_context, orchestrator_model)
                    if not steps:
                        raise ValueError("Orchestrator returned an empty plan. Retrying.")
                    await queue.put("data: " + json.dumps({'event': 'agent_end', 'agent': 'orchestrator'}) + "\n\n")
                    break
                except Exception as e:
                    last_error = e
                    await queue.put("data: " + json.dumps({'event': 'agent_end', 'agent': 'orchestrator'}) + "\n\n")
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.warning(f"Orchestrator plan failed on attempt {attempt + 1}: {e}")
            
            if not steps:
                raise RuntimeError(f"Failed to generate plan after {max_plan_retries} attempts. Last error: {last_error}")
            
            steps_dict = [s.model_dump() for s in steps]
            
            plan.steps = steps_dict
            await db.commit()

            yield "data: " + json.dumps({'event': 'plan_ready', 'steps': steps_dict, 'run_id': run_id_str}) + "\n\n"
            
            while True:
                msg = await queue.get()
                yield msg
                if "done" in msg and '"event": "done"' in msg:
                    break
        except Exception as e:
            yield "data: " + json.dumps({'event': 'error', 'detail': str(e)}) + "\n\n"
        finally:
            try:
                from app.utils.ai_client import ai_client
                await ai_client.unload_model(settings.CHAT_MODEL_ORCHESTRATOR)
            except Exception:
                pass
            _sse_queues.pop(run_id_str, None)

    return StreamingResponse(_event_generator(), media_type="text/event-stream")


@router.post("/runs/{run_id}/plan/approve")
async def approve_plan(
    run_id: UUID,
    payload: AgentApproveRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(AgentRun).where(AgentRun.id == run_id)
    run = (await db.execute(stmt)).scalar_one_or_none()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
        
    stmt = select(AgentPlan).where(AgentPlan.id == run.plan_id)
    plan = (await db.execute(stmt)).scalar_one()

    plan.steps = [step.model_dump() for step in payload.steps]
    from datetime import datetime
    plan.status = "approved"
    plan.approved_at = datetime.utcnow()
    await db.commit()
    
    run_id_str = str(run_id)
    if run_id_str in _sse_queues:
        await _sse_queues[run_id_str].put("data: " + json.dumps({'event': 'plan_approved', 'steps': plan.steps}) + "\n\n")
    
    # Fire off Phase 2 + Phase 3 workflow asynchronously
    asyncio.create_task(_execute_full_workflow(run_id_str, payload.steps, current_user.id, payload.enable_consensus))

    return {"status": "approved", "run_id": run_id}

async def _execute_full_workflow(run_id_str: str, steps: list[AgentPlanStep], user_id, enable_consensus: bool = False):
    if run_id_str not in _sse_queues:
        return
        
    queue = _sse_queues[run_id_str]
    run_context = _run_data.get(run_id_str, {"message": "Unknown", "model": settings.CHAT_MODEL_AGENT, "memory_context": ""})
    
    try:
        from app.core.database import AsyncSessionLocal
        from app.services.agents.executor import execute_plan
        from app.services.agents.synthesizer import synthesize
        from app.services.agents.evaluator import evaluate
        from app.services.agents.reflector import reflect_post, reflect_post_exec, reflect_final
        from app.services.agents.consensus import run_consensus_on_answer
        from app.services.agents.orchestrator import WorkingMemory
        
        async with AsyncSessionLocal() as db:
            # 1. Execute
            await queue.put("data: " + json.dumps({'event': 'agent_start', 'agent': 'executor'}) + "\n\n")
            wm = WorkingMemory(run_id=run_id_str, context=run_context["memory_context"])
            wm = await execute_plan(steps, wm, user_id, db, queue)
            await queue.put("data: " + json.dumps({'event': 'agent_end', 'agent': 'executor'}) + "\n\n")

        # 1.5. Post-Exec Reflection
        await queue.put("data: " + json.dumps({'event': 'agent_start', 'agent': 'reflector'}) + "\n\n")
        post_exec_reflection = await reflect_post_exec(wm, run_context["model"])
        wm.context += f"\n--- POST-EXEC REFLECTION ---\n{post_exec_reflection}"
        await queue.put("data: " + json.dumps({'event': 'agent_end', 'agent': 'reflector'}) + "\n\n")
        
        # 2. Synthesize
        await queue.put("data: " + json.dumps({'event': 'token', 'token': '\n\n*Synthesizing...*\n'}) + "\n\n")
        await queue.put("data: " + json.dumps({'event': 'agent_start', 'agent': 'synthesizer'}) + "\n\n")
        synthesized_answer = await synthesize(run_context["message"], wm, run_context["model"])
        await queue.put("data: " + json.dumps({'event': 'agent_end', 'agent': 'synthesizer'}) + "\n\n")
        
        # 3. Evaluate
        await queue.put("data: " + json.dumps({'event': 'token', 'token': '\n*Evaluating...*\n'}) + "\n\n")
        await queue.put("data: " + json.dumps({'event': 'agent_start', 'agent': 'evaluator'}) + "\n\n")
        eval_result = await evaluate(steps, synthesized_answer, wm, run_context["model"])
        await queue.put("data: " + json.dumps({'event': 'agent_end', 'agent': 'evaluator'}) + "\n\n")
        
        # 4. Consensus (conditional)
        if enable_consensus:
            await queue.put("data: " + json.dumps({'event': 'token', 'token': '\n*Gathering Consensus...*\n'}) + "\n\n")
            await queue.put("data: " + json.dumps({'event': 'agent_start', 'agent': 'consensus'}) + "\n\n")
            consensus_result = await run_consensus_on_answer(synthesized_answer, wm, run_context["model"])
            if not consensus_result.get("agree"):
                synthesized_answer += f"\n\n**Consensus Check Failed:** {consensus_result.get('reasoning')}"
            await queue.put("data: " + json.dumps({'event': 'agent_end', 'agent': 'consensus'}) + "\n\n")
        
        # 5. Final Reflection Loop & Output
        max_retries = getattr(settings, "AGENT_MAX_RETRIES", 2)
        for attempt in range(max_retries + 1):
            await queue.put("data: " + json.dumps({'event': 'token', 'token': f'\n*Final Reflection (Attempt {attempt + 1})...*\n'}) + "\n\n")
            await queue.put("data: " + json.dumps({'event': 'agent_start', 'agent': 'reflector'}) + "\n\n")
            
            final_reflection = await reflect_final(synthesized_answer, eval_result, run_context["model"])
            await queue.put("data: " + json.dumps({'event': 'agent_end', 'agent': 'reflector'}) + "\n\n")
            
            if final_reflection.is_satisfactory or attempt == max_retries:
                if attempt == max_retries and not final_reflection.is_satisfactory:
                    synthesized_answer += f"\n\n**Final Reflection Feedback (Max Retries Reached):** {final_reflection.feedback}"
                break
                
            # If not satisfactory, we redo synthesize & evaluate
            wm.context += f"\n--- REDO FEEDBACK (Attempt {attempt + 1}) ---\n{final_reflection.feedback}"
            
            await queue.put("data: " + json.dumps({'event': 'token', 'token': '\n\n*Re-Synthesizing...*\n'}) + "\n\n")
            await queue.put("data: " + json.dumps({'event': 'agent_start', 'agent': 'synthesizer'}) + "\n\n")
            synthesized_answer = await synthesize(run_context["message"], wm, run_context["model"])
            await queue.put("data: " + json.dumps({'event': 'agent_end', 'agent': 'synthesizer'}) + "\n\n")
            
            await queue.put("data: " + json.dumps({'event': 'token', 'token': '\n*Re-Evaluating...*\n'}) + "\n\n")
            await queue.put("data: " + json.dumps({'event': 'agent_start', 'agent': 'evaluator'}) + "\n\n")
            eval_result = await evaluate(steps, synthesized_answer, wm, run_context["model"])
            await queue.put("data: " + json.dumps({'event': 'agent_end', 'agent': 'evaluator'}) + "\n\n")
            
        await queue.put("data: " + json.dumps({'event': 'token', 'token': "\n\n" + synthesized_answer}) + "\n\n")

        # --- SAVE FINAL RESPONSE TO DB ---
        c_id = run_context.get("conversation_id")
        if c_id:
            try:
                from app.services.chat_service import save_message
                from app.workers.extraction_worker import run_extraction
                from sqlalchemy import select
                from app.models.chat import ChatConversation
                
                await save_message(
                    db=db,
                    conversation_id=c_id,
                    role="assistant",
                    content=synthesized_answer,
                    model=run_context["model"]
                )
                
                # Retrieve conversation to check message count for extraction
                stmt = select(ChatConversation).where(ChatConversation.id == c_id)
                conv = (await db.execute(stmt)).scalar_one_or_none()
                if conv:
                    should_extract = (
                        settings.EXTRACTION_ENABLED
                        and conv.message_count % settings.EXTRACTION_EVERY_N_TURNS == 0
                        and conv.message_count >= settings.EXTRACTION_EVERY_N_TURNS
                    )
                    if should_extract:
                        asyncio.create_task(run_extraction(conv.id, user_id))
            except Exception as e:
                print(f"Error saving agent chat response: {e}")

    except Exception as e:
        await queue.put("data: " + json.dumps({'event': 'token', 'token': f'\n\n**Workflow Error:** {e}'}) + "\n\n")
    finally:
        await queue.put("data: " + json.dumps({'event': 'done', 'run_id': run_id_str}) + "\n\n")
        try:
            from app.utils.ai_client import ai_client
            if run_context["model"]:
                await ai_client.unload_model(run_context["model"])
        except Exception:
            pass
        _run_data.pop(run_id_str, None)

@router.post("/runs/{run_id}/plan/cancel")
async def cancel_plan(
    run_id: UUID,
    db: AsyncSession = Depends(get_db)):
    stmt = select(AgentRun).where(AgentRun.id == run_id)
    run = (await db.execute(stmt)).scalar_one_or_none()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
        
    stmt = select(AgentPlan).where(AgentPlan.id == run.plan_id)
    plan = (await db.execute(stmt)).scalar_one()
    plan.status = "cancelled"
    await db.commit()
    
    if str(run_id) in _sse_queues:
        await _sse_queues[str(run_id)].put("data: " + json.dumps({'event': 'done', 'reason': 'cancelled'}) + "\n\n")
    
    try:
        from app.utils.ai_client import ai_client
        await ai_client.unload_model(settings.CHAT_MODEL_ORCHESTRATOR)
        run_data = _run_data.get(str(run_id))
        if run_data and run_data.get("model"):
            await ai_client.unload_model(run_data["model"])
    except Exception:
        pass
        
    return {"status": "cancelled"}

@router.post("/runs/{run_id}/tools/{tool_name}/confirm")
async def confirm_tool(run_id: str, tool_name: str):
    dispatcher.confirm(run_id, tool_name)
    return {"status": "confirmed"}

@router.post("/runs/{run_id}/tools/{tool_name}/cancel")
async def cancel_tool(run_id: str, tool_name: str):
    dispatcher.cancel(run_id, tool_name)
    return {"status": "cancelled"}
