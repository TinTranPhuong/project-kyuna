from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.models.note import Note
from app.schemas.note import NoteCreate, NoteUpdate


async def get_user_notes(db: AsyncSession, user_id: UUID) -> list[Note]:
    stmt = select(Note).where(Note.user_id == user_id).order_by(desc(Note.updated_at))
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def create_note(db: AsyncSession, user_id: UUID, data: NoteCreate) -> Note:
    note = Note(user_id=user_id, title=data.title, text=data.text)
    db.add(note)
    await db.commit()
    await db.refresh(note)
    return note


async def update_note(db: AsyncSession, user_id: UUID, note_id: UUID, data: NoteUpdate) -> Note:
    note = await db.get(Note, note_id)
    if not note or note.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(note, key, value)

    await db.commit()
    await db.refresh(note)
    return note


async def delete_note(db: AsyncSession, user_id: UUID, note_id: UUID) -> None:
    note = await db.get(Note, note_id)
    if not note or note.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")
    await db.delete(note)
    await db.commit()