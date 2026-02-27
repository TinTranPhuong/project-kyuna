from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.chat import (
    CreateConversationRequest,
    ConversationResponse,
    ConversationDetailResponse,
    SendMessageRequest,
    ModelInfoResponse,
)
from app.services import chat_service

router = APIRouter()


@router.post("/conversations", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    data: CreateConversationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Initialize a new chat conversation."""
    return await chat_service.create_conversation(db, current_user.id, data)


@router.get("/conversations", response_model=List[ConversationResponse])
async def list_conversations(
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all active (non-archived) conversations for the user."""
    return await chat_service.get_conversations(db, current_user.id, skip, limit)


@router.get("/conversations/{conversation_id}", response_model=ConversationDetailResponse)
async def get_conversation(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific conversation along with its full message history."""
    return await chat_service.get_conversation_detail(db, current_user.id, conversation_id)


@router.patch("/conversations/{conversation_id}", response_model=ConversationResponse)
async def update_conversation(
    conversation_id: str,
    data: CreateConversationRequest, # Reusing schema for title/prompt updates
    is_archived: bool = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update conversation metadata (title, system prompt, or archive status)."""
    return await chat_service.update_conversation(db, current_user.id, conversation_id, data, is_archived)


@router.delete("/conversations/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(
    conversation_id: str,
    hard_delete: bool = False,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Soft delete (archive) or hard delete a conversation."""
    await chat_service.delete_conversation(db, current_user.id, conversation_id, hard_delete)
    return None


@router.post("/conversations/{conversation_id}/messages")
async def send_message(
    conversation_id: str,
    data: SendMessageRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Send a message and stream the AI's response via Server-Sent Events (SSE).
    """
    # 1 & 2: Verify access and save user's message
    await chat_service.verify_and_save_user_message(db, current_user.id, conversation_id, data)

    # 3, 4, 5, 6, 7 & 8: The generator function handles building history, 
    # proxying the AI server stream, yielding SSE, and saving the final result.
    return StreamingResponse(
        chat_service.stream_chat_response(db, current_user.id, conversation_id, data.model),
        media_type="text/event-stream"
    )


@router.get("/models", response_model=List[ModelInfoResponse])
async def list_models(current_user: User = Depends(get_current_user)):
    """Proxy to the AI server to get available models."""
    return await chat_service.get_available_models()