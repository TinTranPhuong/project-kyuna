import asyncio
from app.services.embedding_service import embedding_service

async def test():
    # Test 1: Query embedding
    q = await embedding_service.embed_query("hello")
    print(f"Query vector length: {len(q) if q else 'None'}")
    
    # Test 2: Batch embedding
    b = await embedding_service.embed_batch(["a", "b", "c"])
    print(f"Batch returned {len(b)} vectors")

asyncio.run(test())