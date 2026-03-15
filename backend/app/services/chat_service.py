import json
import time
import asyncio
import logging
from typing import AsyncGenerator

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload

from app.models.chat import ChatConversation, ChatMessage
from app.schemas.chat import CreateConversationRequest, ChatMessageRequest
from app.utils.ai_client import ai_client
from app.core.config import settings
from app.services.embedding_service import embedding_service
from app.services.qdrant_service import qdrant_service
from app.services.context_assembler import context_assembler
from app.services.memory_service import memory_service
from app.workers.extraction_worker import run_extraction

logger = logging.getLogger(__name__)  

async def get_available_models() -> list[dict]:
    """Fetches available models from the local AI inference server."""
    try:
        return await ai_client.list_models()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, 
            detail=f"AI Server is unreachable: {str(e)}"
        )

async def get_fallback_model() -> str:
    """Dynamically grabs the first available loaded model from your AI Server."""
    models = await get_available_models()
    if models and len(models) > 0:
        return models[0].get("id", "")
    return ""

async def create_conversation(db: AsyncSession, user_id: str, data: CreateConversationRequest) -> ChatConversation:
    """Creates a new chat conversation."""
    conversation = ChatConversation(
        user_id=user_id,
        title=data.title or "New Conversation",
        system_prompt=data.system_prompt
    )
    db.add(conversation)
    await db.commit()
    await db.refresh(conversation)
    return conversation

async def get_conversations(db: AsyncSession, user_id: str, skip: int, limit: int) -> list[ChatConversation]:
    """Lists non-archived conversations ordered by most recently updated."""
    stmt = select(ChatConversation).where(
        ChatConversation.user_id == user_id,
        ChatConversation.is_archived.is_(False)
    ).order_by(desc(ChatConversation.updated_at)).offset(skip).limit(limit)
    
    result = await db.execute(stmt)
    return list(result.scalars().all())

async def get_conversation_detail(db: AsyncSession, user_id: str, conversation_id: str) -> dict:
    """Fetches a conversation and its messages, verifying ownership."""
    stmt = select(ChatConversation).where(
        ChatConversation.id == conversation_id,
        ChatConversation.user_id == user_id
    ).options(selectinload(ChatConversation.messages)) 
    
    result = await db.execute(stmt)
    conversation = result.scalar_one_or_none()
    
    if not conversation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
        
    return conversation

async def update_conversation(db: AsyncSession, user_id: str, conversation_id: str, data: CreateConversationRequest, is_archived: bool = None) -> ChatConversation:
    """Updates title, prompt, or archive status."""
    stmt = select(ChatConversation).where(ChatConversation.id == conversation_id, ChatConversation.user_id == user_id)
    conversation = (await db.execute(stmt)).scalar_one_or_none()
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
        
    if data.title is not None:
        conversation.title = data.title
    if data.system_prompt is not None:
        conversation.system_prompt = data.system_prompt
    if is_archived is not None:
        conversation.is_archived = is_archived
        
    await db.commit()
    await db.refresh(conversation)
    return conversation

async def delete_conversation(db: AsyncSession, user_id: str, conversation_id: str, hard_delete: bool) -> None:
    """Soft or hard deletes a conversation."""
    stmt = select(ChatConversation).where(ChatConversation.id == conversation_id, ChatConversation.user_id == user_id)
    conversation = (await db.execute(stmt)).scalar_one_or_none()
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
        
    if hard_delete:
        await db.delete(conversation)
    else:
        conversation.is_archived = True
        
    await db.commit()

async def save_message(db: AsyncSession, conversation_id: str, role: str, content: str, tokens_used: int = None, generation_ms: int = None, model: str = None, image_base64: str = None) -> ChatMessage:
    """Saves a single message and updates the conversation's message count and updated_at timestamp."""
    message = ChatMessage(
        conversation_id=conversation_id,
        role=role,
        content=content,
        tokens_used=tokens_used,
        generation_ms=generation_ms,
        model_used=model,
        image_base64=image_base64
    )
    db.add(message)
    
    # Update conversation metadata
    stmt = select(ChatConversation).where(ChatConversation.id == conversation_id)
    conversation = (await db.execute(stmt)).scalar_one()
    conversation.message_count += 1
    
    await db.commit()
    return message

async def verify_and_save_user_message(db: AsyncSession, user_id: str, conversation_id: str, data: ChatMessageRequest) -> None:
    """Validates the conversation and saves the incoming user message."""
    stmt = select(ChatConversation).where(ChatConversation.id == conversation_id, ChatConversation.user_id == user_id)
    conversation = (await db.execute(stmt)).scalar_one_or_none()
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
        
    await save_message(db, conversation_id, role="user", content=data.content, image_base64=data.image_base64)
    
    # Auto-title on the very first user message
    if conversation.message_count == 1 and conversation.title == "New Conversation":
        await auto_title_conversation(db, conversation, data.content, data.model_used)

async def auto_title_conversation(db: AsyncSession, conversation: ChatConversation, first_user_message: str, model: str) -> None:
    """Asks the AI for a short title and updates the conversation."""
    target_model = model or conversation.model_used
    if not target_model:
        target_model = await get_fallback_model()
        
    from app.utils.prompt_loader import load_prompt
    system_instruction = load_prompt("chats/autotitle")
    user_content = f"{first_user_message.strip()} /no_think"

    messages = [
        {"role": "system", "content": system_instruction},
        {"role": "user",   "content": user_content},
    ]
    
    title_chunks = []
    try:
        async for chunk in ai_client.chat_stream(messages, target_model, max_tokens=20):
            title_chunks.append(chunk)
            
        generated_title = "".join(title_chunks).strip().strip('"').strip("'")

        import re
        generated_title = re.sub(r'<think>.*?</think>', '', generated_title, flags=re.DOTALL).strip()
        generated_title = generated_title.strip('"').strip("'").strip()

        if generated_title:
            conversation.title = generated_title
            await db.commit()
    except Exception as e:
        print(f"Failed to auto-title conversation: {e}")
        
async def stream_chat_response(db: AsyncSession, user_id: str, conversation_id: str, requested_model: str) -> AsyncGenerator[str, None]:
    """
    Streams the AI response back to the client via Server-Sent Events (SSE).
    Injects memory context before the stream.
    Saves the complete AI response after streaming.
    Optionally queues background extraction.
    """
    # ── Fetch conversation with all messages (same as original) ──────────────
    stmt = select(ChatConversation).where(
        ChatConversation.id == conversation_id,
        ChatConversation.user_id == user_id
    ).options(selectinload(ChatConversation.messages))

    conversation = (await db.execute(stmt)).scalar_one()

    target_model = requested_model or conversation.model_used
    if not target_model:
        target_model = await get_fallback_model()

    # ── NEW STEP 1: parallel memory retrieval ─────────────────────────────────
    start_time = time.time()
    last_user_msg = next(
        (m.content for m in reversed(conversation.messages) if m.role == "user"), ""
    )

    query_vector = await embedding_service.embed_query(last_user_msg)

    memories, doc_chunks, universals = [], [], []
    if query_vector:
        memories, doc_chunks, universals = await asyncio.gather(
            qdrant_service.search_memories(user_id, query_vector),
            qdrant_service.search_documents(user_id, query_vector),
            memory_service.get_universal_facts(db, user_id),
        )
    else:
        # AI server offline — still get universal facts from PostgreSQL
        universals = await memory_service.get_universal_facts(db, user_id)

    logger.info(f"[Memory] Retrieval took {(time.time() - start_time) * 1000:.1f}ms — "
                f"{len(memories)} memories, {len(doc_chunks)} chunks, {len(universals)} universals")

    # ── NEW STEP 2: build enriched system prompt ──────────────────────────────
    context_block = context_assembler.build(universals, memories, doc_chunks)

    # Load the model-specific persona prompt (e.g., thinking.md / fast.md).
    # Without this, the AI server skips its own prompt when our system message
    # already exists — leaving the model with raw context but no personality.
    from app.utils.prompt_loader import load_prompt_for_model
    model_persona = load_prompt_for_model(target_model) or ""

    # Assemble: persona + user-set system prompt + RAG context + usage instruction
    parts = [p for p in [model_persona, conversation.system_prompt or ""] if p.strip()]
    if context_block:
        parts.append(context_block)
        parts.append(
            "When answering the user, draw on the above context (memories, "
            "documents, facts) if it is relevant. Reference the source when helpful. "
            "If the context does not cover the question, answer from your own knowledge."
        )
    combined_system = "\n\n".join(parts).strip()

    messages_payload = []
    if combined_system:
        messages_payload.append({"role": "system", "content": combined_system})
    
    is_vision = bool(conversation.messages and conversation.messages[-1].image_base64)
    for msg in conversation.messages:
        if msg.image_base64:
            messages_payload.append({
                "role": msg.role,
                "content": [
                    {"type": "image_url", "image_url": {"url": msg.image_base64}},
                    {"type": "text", "text": msg.content}
                ]
            })
        else:
            messages_payload.append({"role": msg.role, "content": msg.content})

    # ── Emit memory metadata SSE event before tokens ─────────────
    yield f"data: {json.dumps({'memory_context': {'memories': len(memories), 'chunks': len(doc_chunks), 'universals': len(universals)}})}\n\n"

    # ── Stream AI response ────────────────────────────────────────────────────
    accumulated_content = []
    stream_start = time.time()

    try:
        from app.services.agents.tool_registry import TOOL_REGISTRY

        buffer_str = ""
        is_capturing_tool = False
        tool_content_str = ""

        async for token in ai_client.chat_stream(messages_payload, target_model, is_vision=is_vision):
            buffer_str += token
            
            if not is_capturing_tool:
                if "<tool>" in buffer_str:
                    is_capturing_tool = True
                    idx = buffer_str.index("<tool>")
                    before = buffer_str[:idx]
                    if before:
                        accumulated_content.append(before)
                        yield f"data: {json.dumps({'token': before})}\n\n"
                    tool_content_str = buffer_str[idx:]
                    buffer_str = ""
                elif any(buffer_str.endswith(prefix) for prefix in ["<", "<t", "<to", "<too", "<tool"]):
                    # Wait for next token to confirm if it's a tool tag
                    pass
                else:
                    accumulated_content.append(buffer_str)
                    yield f"data: {json.dumps({'token': buffer_str})}\n\n"
                    buffer_str = ""
            else:
                tool_content_str += token
                buffer_str = "" 
                
                if "</tool>" in tool_content_str:
                    is_capturing_tool = False
                    idx = tool_content_str.index("</tool>") + len("</tool>")
                    tool_json_block = tool_content_str[:idx]
                    after = tool_content_str[idx:]
                    
                    try:
                        inner_text = tool_json_block.replace("<tool>", "").replace("</tool>", "").strip()
                        
                        # Strip standard markdown fences if present
                        if inner_text.startswith("```json"):
                            inner_text = inner_text[7:]
                        elif inner_text.startswith("```"):
                            inner_text = inner_text[3:]
                        if inner_text.endswith("```"):
                            inner_text = inner_text[:-3]
                        
                        inner_json = inner_text.strip()
                        
                        # Emergency fallback: if there's text before/after the { ... }, extract just the JSON
                        if not inner_json.startswith("{") and "{" in inner_json and "}" in inner_json:
                            start_idx = inner_json.find("{")
                            end_idx = inner_json.rfind("}") + 1
                            inner_json = inner_json[start_idx:end_idx]
                        
                        # Lenient parsing for missing trailing braces
                        parsed = False
                        tool_req = None
                        for suffix in ["", "}", "}}", '"', '"}', '"}}']:
                            try:
                                tool_req = json.loads(inner_json + suffix, strict=False)
                                parsed = True
                                break
                            except json.JSONDecodeError:
                                pass
                        
                        if not parsed:
                            # regex fallback for unescaped quotes in markdown
                            import re
                            name_match = re.search(r'"name"\s*:\s*"([^"]+)"', inner_json)
                            if name_match:
                                t_n = name_match.group(1)
                                if t_n == "create_docx":
                                    title_match = re.search(r'"title"\s*:\s*"([^"]+)"', inner_json)
                                    c_title = title_match.group(1) if title_match else "Document"
                                    c_match = re.search(r'"content"\s*:\s*"(.*)', inner_json, re.DOTALL)
                                    if c_match:
                                        c_text = c_match.group(1)
                                        c_text = re.sub(r'"?\s*\}?\s*\}?\s*$', '', c_text)
                                        c_text = c_text.replace('\\n', '\n').replace('\\"', '"')
                                        tool_req = {"name": t_n, "args": {"title": c_title, "content": c_text}}
                                        parsed = True
                        
                        if not parsed:
                            raise ValueError("Could not decode tool JSON even with lenient suffixes.")
                        
                        t_name = tool_req.get("name")
                        t_args = tool_req.get("args", {})
                        
                        if t_name in ["create_docx", "create_xlsx", "create_pptx"] and t_name in TOOL_REGISTRY:
                            t_args["user_id"] = user_id
                            msg_token = f"\n\n*Generating {t_name}...*\n"
                            yield f"data: {json.dumps({'token': msg_token})}\n\n"
                            
                            # Execute the tool
                            from app.services.agents.tool_registry import TOOL_REGISTRY
                            tool_fn = TOOL_REGISTRY[t_name]["fn"]
                            result = await tool_fn(**t_args)
                            
                            res_str = f"\n\n{result}\n\n"
                            formatted_res = res_str.replace("\\n", "\n")
                            accumulated_content.append(formatted_res)
                            yield f"data: {json.dumps({'token': formatted_res})}\n\n"
                        else:
                            accumulated_content.append(tool_json_block)
                            yield f"data: {json.dumps({'token': tool_json_block})}\n\n"
                            
                    except Exception as e:
                        logger.error(f"Failed to execute inline tool. JSON was: {repr(inner_json)} Error: {e}")
                        accumulated_content.append(tool_json_block)
                        yield f"data: {json.dumps({'token': tool_json_block})}\n\n"
                        
                    buffer_str = after
                    tool_content_str = ""

        if buffer_str and not is_capturing_tool:
            accumulated_content.append(buffer_str)
            yield f"data: {json.dumps({'token': buffer_str})}\n\n"
        elif is_capturing_tool:
            accumulated_content.append(tool_content_str)
            yield f"data: {json.dumps({'token': tool_content_str})}\n\n"

    except Exception as e:
        yield f"data: {json.dumps({'error': str(e)})}\n\n"

    finally:
        yield "data: [DONE]\n\n"

        # ── Save assistant message (RESTORED — was missing) ───────────────────
        full_response = "".join(accumulated_content)
        if full_response:
            generation_ms = int((time.time() - stream_start) * 1000)
            await save_message(
                db=db,
                conversation_id=conversation_id,
                role="assistant",
                content=full_response,
                generation_ms=generation_ms,
                model=target_model
            )

        # ── Queue extraction (non-blocking, throttled) ────────────
        should_extract = (
            settings.EXTRACTION_ENABLED
            and conversation.message_count % settings.EXTRACTION_EVERY_N_TURNS == 0
            and conversation.message_count >= settings.EXTRACTION_EVERY_N_TURNS
        )
        if should_extract:
            asyncio.create_task(run_extraction(conversation.id, user_id))