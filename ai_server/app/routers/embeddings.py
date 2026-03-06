from fastapi import APIRouter
from pydantic import BaseModel
from app.services.embedding_service import embedding_service
from app.core.config import settings

router = APIRouter()

class EmbeddingRequest(BaseModel):
    input: str | list[str]

class EmbeddingResponse(BaseModel):
    embeddings: list[list[float]]
    model: str
    dimensions: int

@router.post("/embeddings", response_model=EmbeddingResponse)
async def create_embeddings(request: EmbeddingRequest):
    inputs = [request.input] if isinstance(request.input, str) else request.input
    vectors = embedding_service.encode(inputs)
    return EmbeddingResponse(
        embeddings=vectors,
        model=settings.EMBEDDING_MODEL,
        dimensions=len(vectors[0]) if vectors else 0
    )