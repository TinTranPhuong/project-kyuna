from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.note import NoteCreate, NoteUpdate, NoteResponse
from app.services import note_service

router = APIRouter()


@router.get("", response_model=List[NoteResponse])
async def list_notes(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return all notes for the current user, newest first."""
    return await note_service.get_user_notes(db, current_user.id)


@router.post("", response_model=NoteResponse, status_code=status.HTTP_201_CREATED)
async def create_note(
    data: NoteCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await note_service.create_note(db, current_user.id, data)


@router.patch("/{note_id}", response_model=NoteResponse)
async def update_note(
    note_id: UUID,
    data: NoteUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await note_service.update_note(db, current_user.id, note_id, data)


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_note(
    note_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await note_service.delete_note(db, current_user.id, note_id)
    return None