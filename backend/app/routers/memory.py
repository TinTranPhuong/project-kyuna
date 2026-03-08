from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Query, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.memory import (
    MemoryFactResponse, MemoryFactUpdate, MemoryFactListResponse,
    UniversalFactResponse, UniversalFactCreate, UniversalFactUpdate,
    MemorySearchResponse, BulkDeleteRequest, BulkDeleteResponse
)
from app.services.memory_service import memory_service

router = APIRouter()

# --- Memory Facts --------------------------------------------------------------

@router.get("/facts", response_model=MemoryFactListResponse)
async def list_facts(
    conversation_id: Optional[UUID] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    min_confidence: float = Query(0.0, ge=0.0, le=1.0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    items, total = await memory_service.list_facts(db, current_user.id, limit, offset, min_confidence, conversation_id)
    return {"items": items, "total": total}

@router.patch("/facts/{fact_id}", response_model=MemoryFactResponse)
async def update_fact(fact_id: UUID, data: MemoryFactUpdate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    fact = await memory_service.update_fact(db, fact_id, current_user.id, data)
    if not fact:
        raise HTTPException(status_code=404, detail="Fact not found")
    return fact

@router.delete("/facts/{fact_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_fact(fact_id: UUID, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    success = await memory_service.delete_fact(db, fact_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Fact not found")

@router.delete("/facts/bulk", response_model=BulkDeleteResponse)
async def bulk_delete_facts(data: BulkDeleteRequest, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    deleted_count = await memory_service.bulk_delete_facts(db, data.fact_ids, current_user.id)
    return {"deleted_count": deleted_count}

@router.post("/facts/{fact_id}/promote", response_model=UniversalFactResponse, status_code=status.HTTP_201_CREATED)
async def promote_fact(fact_id: UUID, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    univ = await memory_service.promote_fact(db, fact_id, current_user.id)
    if not univ:
        raise HTTPException(status_code=404, detail="Fact not found")
    return univ

# --- Universal Facts -----------------------------------------------------------

@router.get("/universal", response_model=List[UniversalFactResponse])
async def list_universal(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await memory_service.list_universal(db, current_user.id)

@router.post("/universal", response_model=UniversalFactResponse, status_code=status.HTTP_201_CREATED)
async def create_universal(data: UniversalFactCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await memory_service.create_universal(db, current_user.id, data)

@router.patch("/universal/{fact_id}", response_model=UniversalFactResponse)
async def update_universal(fact_id: UUID, data: UniversalFactUpdate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    univ = await memory_service.update_universal(db, fact_id, current_user.id, data)
    if not univ:
        raise HTTPException(status_code=404, detail="Fact not found")
    return univ

@router.delete("/universal/{fact_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_universal(fact_id: UUID, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    success = await memory_service.delete_universal(db, fact_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Fact not found")

# --- Memory Search -------------------------------------------------------------

@router.get("/search", response_model=MemorySearchResponse)
async def search_memory(q: str = Query(..., min_length=1), limit: int = Query(10, ge=1, le=50), current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await memory_service.search_memory(current_user.id, q, limit)