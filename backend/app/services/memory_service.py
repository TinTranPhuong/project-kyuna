import logging
from typing import List, Optional, Tuple, Dict, Any
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func
from app.models.memory import MemoryFact, UniversalFact
from app.schemas.memory import MemoryFactUpdate, UniversalFactCreate, UniversalFactUpdate
from app.services.qdrant_service import qdrant_service
from app.services.embedding_service import embedding_service

logger = logging.getLogger(__name__)

class MemoryService:
    async def list_facts(self, db: AsyncSession, user_id: UUID, limit: int, offset: int, min_confidence: float, conversation_id: Optional[UUID] = None) -> Tuple[List[MemoryFact], int]:
        query = select(MemoryFact).where(MemoryFact.user_id == user_id, MemoryFact.confidence >= min_confidence)
        if conversation_id:
            query = query.where(MemoryFact.conversation_id == conversation_id)
        
        total = await db.scalar(select(func.count()).select_from(query.subquery()))
        items = await db.scalars(query.order_by(MemoryFact.created_at.desc()).offset(offset).limit(limit))
        return list(items), total or 0

    async def update_fact(self, db: AsyncSession, fact_id: UUID, user_id: UUID, data: MemoryFactUpdate) -> Optional[MemoryFact]:
        fact = await db.scalar(select(MemoryFact).where(MemoryFact.id == fact_id, MemoryFact.user_id == user_id))
        if not fact:
            return None
            
        update_data = data.model_dump(exclude_unset=True)
        for k, v in update_data.items():
            setattr(fact, k, v)
            
        await db.commit()
        await db.refresh(fact)
        return fact

    async def delete_fact(self, db: AsyncSession, fact_id: UUID, user_id: UUID) -> bool:
        fact = await db.scalar(select(MemoryFact).where(MemoryFact.id == fact_id, MemoryFact.user_id == user_id))
        if not fact:
            return False
            
        # 1. PostgreSQL First
        await db.delete(fact)
        await db.commit()
        
        # 2. Qdrant Second (fails gracefully)
        await qdrant_service.delete_point("conversation_memories", fact_id)
        return True

    async def bulk_delete_facts(self, db: AsyncSession, fact_ids: List[UUID], user_id: UUID) -> int:
        result = await db.execute(
            delete(MemoryFact)
            .where(MemoryFact.id.in_(fact_ids), MemoryFact.user_id == user_id)
            .returning(MemoryFact.id)
        )
        deleted_ids = result.scalars().all()
        await db.commit()
        
        for fid in deleted_ids:
            await qdrant_service.delete_point("conversation_memories", fid)
            
        return len(deleted_ids)

    async def promote_fact(self, db: AsyncSession, fact_id: UUID, user_id: UUID) -> Optional[UniversalFact]:
        fact = await db.scalar(select(MemoryFact).where(MemoryFact.id == fact_id, MemoryFact.user_id == user_id))
        if not fact:
            return None
            
        content = f"{fact.subject} {fact.predicate} {fact.object}"
        univ = UniversalFact(
            user_id=user_id,
            content=content,
            source="promoted",
            origin_id=fact.id
        )
        db.add(univ)
        fact.is_universal = True
        await db.commit()
        await db.refresh(univ)
        
        vector = await embedding_service.embed_document(content)
        if vector:
            await qdrant_service.upsert_universal(univ.id, vector, {"user_id": str(user_id), "content": content})
            univ.qdrant_synced = True
            await db.commit()
            
        return univ

    async def get_universal_facts(self, db: AsyncSession, user_id: UUID) -> List[UniversalFact]:
        """Direct DB fetch used by the Context Assembler to bypass Qdrant."""
        items = await db.scalars(select(UniversalFact).where(UniversalFact.user_id == user_id, UniversalFact.is_active == True))
        return list(items)

    async def list_universal(self, db: AsyncSession, user_id: UUID) -> List[UniversalFact]:
        items = await db.scalars(select(UniversalFact).where(UniversalFact.user_id == user_id).order_by(UniversalFact.created_at.desc()))
        return list(items)

    async def create_universal(self, db: AsyncSession, user_id: UUID, data: UniversalFactCreate) -> UniversalFact:
        univ = UniversalFact(user_id=user_id, content=data.content, source="manual")
        db.add(univ)
        await db.commit()
        await db.refresh(univ)
        
        vector = await embedding_service.embed_document(data.content)
        if vector:
            await qdrant_service.upsert_universal(univ.id, vector, {"user_id": str(user_id), "content": data.content})
            univ.qdrant_synced = True
            await db.commit()
            
        return univ

    async def update_universal(self, db: AsyncSession, fact_id: UUID, user_id: UUID, data: UniversalFactUpdate) -> Optional[UniversalFact]:
        univ = await db.scalar(select(UniversalFact).where(UniversalFact.id == fact_id, UniversalFact.user_id == user_id))
        if not univ:
            return None
            
        update_data = data.model_dump(exclude_unset=True)
        for k, v in update_data.items():
            setattr(univ, k, v)
            
        await db.commit()
        await db.refresh(univ)
        
        if "content" in update_data:
            vector = await embedding_service.embed_document(univ.content)
            if vector:
                await qdrant_service.upsert_universal(univ.id, vector, {"user_id": str(user_id), "content": univ.content})
                
        return univ

    async def delete_universal(self, db: AsyncSession, fact_id: UUID, user_id: UUID) -> bool:
        univ = await db.scalar(select(UniversalFact).where(UniversalFact.id == fact_id, UniversalFact.user_id == user_id))
        if not univ:
            return False
            
        await db.delete(univ)
        await db.commit()
        await qdrant_service.delete_point("universal_facts", fact_id)
        return True

    async def search_memory(self, user_id: UUID, query: str, limit: int) -> Dict[str, Any]:
        vector = await embedding_service.embed_query(query)
        if not vector:
            return {"memories": [], "documents": [], "universals": []}
        return await qdrant_service.search_all(user_id, vector)

memory_service = MemoryService()