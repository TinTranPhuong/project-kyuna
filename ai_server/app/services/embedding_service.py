import logging
from sentence_transformers import SentenceTransformer
from app.core.config import settings

logger = logging.getLogger(__name__)

class EmbeddingService:
    def __init__(self):
        self._model: SentenceTransformer | None = None

    def _load(self) -> None:
        if self._model is None:
            logger.info(f"[Embedding] Loading {settings.EMBEDDING_MODEL}...")
            # Added trust_remote_code=True required for nomic-ai custom architecture
            self._model = SentenceTransformer(settings.EMBEDDING_MODEL, trust_remote_code=True)
            dims = self._model.get_sentence_embedding_dimension()
            logger.info(f"[Embedding] Loaded. Dimensions={dims}")

    def encode(self, texts: list[str]) -> list[list[float]]:
        """
        Encode a batch of texts. Texts should arrive pre-prefixed
        ("search_query: ..." or "search_document: ...") — the caller applies prefixes.
        """
        self._load()
        return self._model.encode(
            texts,
            batch_size=settings.EMBEDDING_BATCH_SIZE,
            show_progress_bar=False,
            normalize_embeddings=True,    # nomic-embed-text requires this
        ).tolist()

embedding_service = EmbeddingService()