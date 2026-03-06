import logging
from app.utils.ai_client import ai_client

logger = logging.getLogger(__name__)

class EmbeddingService:
    async def embed_query(self, text: str) -> list[float] | None:
        """Embed a search query with 'search_query: ' prefix for nomic-embed-text."""
        if not text or not text.strip():
            return None
        return await self._call([f"search_query: {text}"])

    async def embed_document(self, text: str) -> list[float] | None:
        """Embed document text with 'search_document: ' prefix."""
        if not text or not text.strip():
            return None
        return await self._call([f"search_document: {text}"])

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        """
        Batch embed multiple texts. Applies 'search_document: ' prefix to each.
        Returns [] if AI server unreachable.
        """
        if not texts:
            return []
        
        prefixed = [f"search_document: {t}" for t in texts]
        
        try:
            response = await ai_client.client.post(
                "/v1/embeddings",
                json={"input": prefixed},
                timeout=120.0
            )
            response.raise_for_status()
            return response.json()["embeddings"]
        except Exception as e:
            logger.error(f"[EmbeddingService] embed_batch failed: {e}")
            return []

    async def _call(self, inputs: list[str]) -> list[float] | None:
        try:
            response = await ai_client.client.post(
                "/v1/embeddings",
                json={"input": inputs},
                timeout=30.0
            )
            response.raise_for_status()
            return response.json()["embeddings"][0]
        except Exception as e:
            logger.warning(f"[EmbeddingService] embed call failed (AI server offline?): {e}")
            return None


embedding_service = EmbeddingService()