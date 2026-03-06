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
        ChatConversation.is_archived == False
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


async def save_message(db: AsyncSession, conversation_id: str, role: str, content: str, tokens_used: int = None, generation_ms: int = None, model: str = None) -> ChatMessage:
    """Saves a single message and updates the conversation's message count and updated_at timestamp."""
    message = ChatMessage(
        conversation_id=conversation_id,
        role=role,
        content=content,
        tokens_used=tokens_used,
        generation_ms=generation_ms,
        model_used=model
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
        
    await save_message(db, conversation_id, role="user", content=data.content)
    
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
    messages = [
        {"role": "system", "content": system_instruction},
        {"role": "user",   "content": first_user_message},
    ]
    
    title_chunks = []
    try:
        async for chunk in ai_client.chat_stream(messages, target_model, max_tokens=10):
            title_chunks.append(chunk)
            
        generated_title = "".join(title_chunks).strip().strip('"').strip("'")
        
        if generated_title:
            conversation.title = generated_title
            await db.commit()
    except Exception as e:
        print(f"Failed to auto-title conversation: {e}")
        
        
async def stream_chat_response(self, conversation, user_id, target_model: str, db: AsyncSession):
        start_time = time.time()
        
        # Get last user message for embedding and extraction checks
        last_user_msg = next((m.content for m in reversed(conversation.messages) if m.role == "user"), "")
        
        # ── NEW STEP 1: parallel retrieval ───────────────────────────────────
        query_vector = await embedding_service.embed_query(last_user_msg)
        
        memories, doc_chunks, universals = [], [], []
        
        if query_vector:
            memories, doc_chunks, universals = await asyncio.gather(
                qdrant_service.search_memories(user_id, query_vector),
                qdrant_service.search_documents(user_id, query_vector),
                memory_service.get_universal_facts(db, user_id),
            )
        else:
            # AI Server offline fallback: skip Qdrant, but still get PostgreSQL universals
            universals = await memory_service.get_universal_facts(db, user_id)
            
        retrieval_time = (time.time() - start_time) * 1000
        logger.info(f"[Memory Injection] Retrieval took {retrieval_time:.2f}ms")

        # ── NEW STEP 2: build enriched system prompt ─────────────────────────
        context_block = context_assembler.build(universals, memories, doc_chunks)
        system_content = (conversation.system_prompt or "") + "\n\n" + context_block
        combined_system = system_content.strip()

        messages_payload = []
        if combined_system:
            messages_payload.append({"role": "system", "content": combined_system})
            
        for msg in conversation.messages:
            messages_payload.append({"role": msg.role, "content": msg.content})

        # ── NEW STEP 3: emit memory metadata SSE event before tokens ─────────
        yield f"data: {json.dumps({'memory_context': {'memories': len(memories), 'chunks': len(doc_chunks), 'universals': len(universals)}})}\n\n"

        try:
            # Existing stream (unchanged)
            async for token in ai_client.chat_stream(messages_payload, target_model):
                yield f"data: {json.dumps({'token': token})}\n\n"
        finally:
            # [YOUR EXISTING save_message() LOGIC STAYS HERE]
            # await self.save_message(...) 
            
            # ── NEW STEP 4: queue extraction (non-blocking) ──────────────────────
            should_extract = (
                settings.EXTRACTION_ENABLED
                and conversation.message_count % settings.EXTRACTION_EVERY_N_TURNS == 0
                and conversation.message_count >= settings.EXTRACTION_EVERY_N_TURNS
                and len(last_user_msg.split()) >= settings.EXTRACTION_MIN_WORDS
            )
            
            if should_extract:
                asyncio.create_task(run_extraction(conversation.id, user_id))