import json
import time
from typing import AsyncGenerator

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.models.chat import ChatConversation, ChatMessage
from app.schemas.chat import CreateConversationRequest, SendMessageRequest
from app.utils.ai_client import ai_client


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
    )
    result = await db.execute(stmt)
    conversation = result.scalar_one_or_none()
    
    if not conversation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
        
    return conversation # The ORM relationship will automatically load messages based on schema config


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


async def verify_and_save_user_message(db: AsyncSession, user_id: str, conversation_id: str, data: SendMessageRequest) -> None:
    """Validates the conversation and saves the incoming user message."""
    stmt = select(ChatConversation).where(ChatConversation.id == conversation_id, ChatConversation.user_id == user_id)
    conversation = (await db.execute(stmt)).scalar_one_or_none()
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
        
    await save_message(db, conversation_id, role="user", content=data.content)
    
    # Auto-title on the very first user message
    if conversation.message_count == 1 and conversation.title == "New Conversation":
        # We fire and forget this or await it. Awaiting is safer for DB locks.
        await auto_title_conversation(db, conversation, data.content, data.model)


async def auto_title_conversation(db: AsyncSession, conversation: ChatConversation, first_user_message: str, model: str) -> None:
    """Asks the AI for a short title and updates the conversation."""
    target_model = model or conversation.model_used or "llama-3.1-8b-instruct-q4_k_m.gguf"
    prompt = f"Summarize this message in 5 words or less for a chat title. Output ONLY the title, no quotes or intro: {first_user_message}"
    
    messages = [{"role": "user", "content": prompt}]
    
    title_chunks = []
    # Using the stream endpoint but consuming it locally
    async for chunk in ai_client.chat_stream(messages, target_model, max_tokens=10):
        title_chunks.append(chunk)
        
    generated_title = "".join(title_chunks).strip().strip('"').strip("'")
    
    if generated_title:
        conversation.title = generated_title
        await db.commit()


async def stream_chat_response(db: AsyncSession, user_id: str, conversation_id: str, requested_model: str) -> AsyncGenerator[str, None]:
    """
    Streams the AI response back to the client via Server-Sent Events (SSE).
    Once finished, saves the complete AI response to the database.
    """
    # 1. Fetch full conversation history
    stmt = select(ChatConversation).where(ChatConversation.id == conversation_id, ChatConversation.user_id == user_id)
    conversation = (await db.execute(stmt)).scalar_one()
    
    target_model = requested_model or conversation.model_used or "llama-3.1-8b-instruct-q4_k_m.gguf"
    
    # Build payload for AI Server
    messages_payload = []
    if conversation.system_prompt:
        messages_payload.append({"role": "system", "content": conversation.system_prompt})
        
    for msg in conversation.messages:
        messages_payload.append({"role": msg.role, "content": msg.content})

    # 2. Stream from AI Server
    accumulated_content = []
    start_time = time.time()
    
    try:
        async for token in ai_client.chat_stream(messages_payload, target_model):
            accumulated_content.append(token)
            # Yield SSE formatted string
            yield f"data: {json.dumps({'token': token})}\n\n"
            
    except Exception as e:
        yield f"data: {json.dumps({'error': str(e)})}\n\n"
        
    finally:
        # Yield the required done signal
        yield "data: [DONE]\n\n"
        
        # 3. Save assistant message to DB after stream finishes
        full_response = "".join(accumulated_content)
        if full_response:
            generation_ms = int((time.time() - start_time) * 1000)
            
            # Note: We need a fresh session for the background save if the main transaction is locked, 
            # but since we're streaming, the DB connection is still active.
            await save_message(
                db=db,
                conversation_id=conversation_id,
                role="assistant",
                content=full_response,
                generation_ms=generation_ms,
                model=target_model
            )
    
async def get_available_models() -> list[dict]:
    #Fetches available models from the local AI inference server.
    try:
        return await ai_client.list_models()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, 
            detail=f"AI Server is unreachable: {str(e)}"
        )