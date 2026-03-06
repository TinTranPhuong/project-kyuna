import logging
from uuid import UUID

from qdrant_client import AsyncQdrantClient
from qdrant_client.models import (
    Distance, VectorParams, PointStruct,
    Filter, FieldCondition, MatchValue
)

from app.core.config import settings

logger = logging.getLogger(__name__)


class QdrantService:
    COLLECTIONS = ["conversation_memories", "documents", "universal_facts"]

    def __init__(self):
        self._client: AsyncQdrantClient | None = None

    @property
    def client(self) -> AsyncQdrantClient:
        if not self._client:
            self._client = AsyncQdrantClient(
                url=settings.QDRANT_URL,
                api_key=settings.QDRANT_API_KEY or None,
            )
        return self._client

    async def ensure_collections(self) -> None:
        """Called from lifespan() in main.py. Creates collections if they don't exist."""
        existing = {c.name for c in (await self.client.get_collections()).collections}
        for name in self.COLLECTIONS:
            if name not in existing:
                await self.client.create_collection(
                    collection_name=name,
                    vectors_config=VectorParams(
                        size=settings.EMBEDDING_DIMENSIONS,
                        distance=Distance.COSINE
                    )
                )
                logger.info(f"[Qdrant] Created collection: {name}")

    def _user_filter(self, user_id: UUID) -> Filter:
        return Filter(must=[FieldCondition(key="user_id", match=MatchValue(value=str(user_id)))])

    async def upsert_memory(self, fact_id: UUID, vector: list[float], payload: dict) -> bool:
        try:
            await self.client.upsert(
                collection_name="conversation_memories",
                points=[PointStruct(id=str(fact_id), vector=vector, payload=payload)]
            )
            return True
        except Exception as e:
            logger.error(f"[Qdrant] upsert_memory failed for {fact_id}: {e}")
            return False

    async def upsert_chunk(self, chunk_id: UUID, vector: list[float], payload: dict) -> bool:
        try:
            await self.client.upsert(
                collection_name="documents",
                points=[PointStruct(id=str(chunk_id), vector=vector, payload=payload)]
            )
            return True
        except Exception as e:
            logger.error(f"[Qdrant] upsert_chunk failed for {chunk_id}: {e}")
            return False

    async def upsert_universal(self, fact_id: UUID, vector: list[float], payload: dict) -> bool:
        try:
            await self.client.upsert(
                collection_name="universal_facts",
                points=[PointStruct(id=str(fact_id), vector=vector, payload=payload)]
            )
            return True
        except Exception as e:
            logger.error(f"[Qdrant] upsert_universal failed for {fact_id}: {e}")
            return False

    async def search_memories(self, user_id: UUID, vector: list[float], top_k: int = 5, threshold: float = 0.72) -> list[dict]:
        try:
            results = await self.client.search(
                collection_name="conversation_memories",
                query_vector=vector,
                query_filter=self._user_filter(user_id),
                limit=top_k,
                score_threshold=threshold
            )
            return [{"id": r.id, "score": r.score, "payload": r.payload} for r in results]
        except Exception as e:
            logger.warning(f"[Qdrant] search_memories failed: {e}")
            return []

    async def search_documents(self, user_id: UUID, vector: list[float], top_k: int = 3, threshold: float = 0.72) -> list[dict]:
        try:
            results = await self.client.search(
                collection_name="documents",
                query_vector=vector,
                query_filter=self._user_filter(user_id),
                limit=top_k,
                score_threshold=threshold
            )
            return [{"id": r.id, "score": r.score, "payload": r.payload} for r in results]
        except Exception as e:
            logger.warning(f"[Qdrant] search_documents failed: {e}")
            return []

    async def search_universal(self, user_id: UUID, vector: list[float], top_k: int = 10) -> list[dict]:
        try:
            results = await self.client.search(
                collection_name="universal_facts",
                query_vector=vector,
                query_filter=self._user_filter(user_id),
                limit=top_k
            )
            return [{"id": r.id, "score": r.score, "payload": r.payload} for r in results]
        except Exception as e:
            logger.warning(f"[Qdrant] search_universal failed: {e}")
            return []

    async def search_all(self, user_id: UUID, vector: list[float]) -> dict:
        """Parallel search across all 3 collections. Used by Memory Search tab."""
        import asyncio
        m, d, u = await asyncio.gather(
            self.search_memories(user_id, vector, top_k=10),
            self.search_documents(user_id, vector, top_k=10),
            self.search_universal(user_id, vector, top_k=10),
        )
        return {"memories": m, "documents": d, "universals": u}

    async def delete_point(self, collection: str, point_id: UUID) -> bool:
        try:
            await self.client.delete(collection_name=collection, points_selector=[str(point_id)])
            return True
        except Exception as e:
            logger.error(f"[Qdrant] delete_point failed {collection}/{point_id}: {e}")
            return False

    async def delete_by_user(self, collection: str, user_id: UUID) -> bool:
        try:
            await self.client.delete(
                collection_name=collection,
                points_selector=Filter(must=[FieldCondition(key="user_id", match=MatchValue(value=str(user_id)))])
            )
            return True
        except Exception as e:
            logger.error(f"[Qdrant] delete_by_user failed {collection}/{user_id}: {e}")
            return False

    async def delete_by_doc(self, doc_id: UUID) -> bool:
        """Delete all chunk vectors for a document. Called when deleting a document."""
        try:
            await self.client.delete(
                collection_name="documents",
                points_selector=Filter(must=[FieldCondition(key="doc_id", match=MatchValue(value=str(doc_id)))])
            )
            return True
        except Exception as e:
            logger.error(f"[Qdrant] delete_by_doc failed {doc_id}: {e}")
            return False


qdrant_service = QdrantService()