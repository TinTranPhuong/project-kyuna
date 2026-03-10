import logging
from duckduckgo_search import DDGS
import asyncio
import httpx
from bs4 import BeautifulSoup

from app.services.qdrant_service import qdrant_service

logger = logging.getLogger(__name__)

async def memory_search(user_id: str, query: str, db=None) -> list:
    """Wraps qdrant_service.search_memories but handles embedding implicitly."""
    from app.services.embedding_service import embedding_service
    vector = await embedding_service.embed_query(query)
    if not vector:
        return []
    return await qdrant_service.search_memories(user_id, vector)

async def doc_search(user_id: str, query: str) -> list:
    """Wraps qdrant_service.search_documents."""
    from app.services.embedding_service import embedding_service
    vector = await embedding_service.embed_query(query)
    if not vector:
        return []
    return await qdrant_service.search_documents(user_id, vector)

async def web_search(query: str) -> list:
    """Search the web using DuckDuckGo."""
    try:
        def _search():
            return list(DDGS().text(query, max_results=5))
        results = await asyncio.to_thread(_search)
        return results if results else []
    except Exception as e:
        logger.error(f"Web search failed for query '{query}': {e}")
        return []

async def web_fetch(url: str) -> str:
    """Fetch URL and extract HTML to plain text."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, follow_redirects=True, timeout=10.0)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, "html.parser")
            # Remove scripts and styles
            for script in soup(["script", "style"]):
                script.decompose()
            text = soup.get_text(separator=" ", strip=True)
            return text[:5000] # Limit to 5k chars
    except Exception as e:
        logger.error(f"Web fetch failed for URL '{url}': {e}")
        return f"Error fetching {url}: {e}"

async def memory_write(user_id: str, content: str, db=None) -> str:
    """Create a new universal memory fact."""
    from app.services.memory_service import memory_service
    from app.schemas.memory import UniversalFactCreate
    import uuid
    try:
        if not db:
            return "Failed: No DB context provided"
        await memory_service.create_universal(db, uuid.UUID(user_id), UniversalFactCreate(content=content))
        return "Success"
    except Exception as e:
        return f"Failed: {e}"

async def memory_delete(user_id: str, fact_id: str, db=None) -> str:
    """Delete a memory fact by ID."""
    from app.services.memory_service import memory_service
    import uuid
    try:
        if not db:
            return "Failed: No DB context provided"
        await memory_service.delete_universal(db, uuid.UUID(fact_id), uuid.UUID(user_id))
        return "Success"
    except Exception as e:
        return f"Failed: {e}"

async def memory_promote(user_id: str, fact_id: str, db=None) -> str:
    """Promote an episodic memory to universal memory."""
    from app.services.memory_service import memory_service
    import uuid
    try:
        if not db:
            return "Failed: No DB context provided"
        await memory_service.promote_fact(db, uuid.UUID(fact_id), uuid.UUID(user_id))
        return "Success"
    except Exception as e:
        return f"Failed: {e}"

async def doc_upload(user_id: str, filename: str, content: str = "") -> str:
    """Mock document upload."""
    return f"Document {filename} uploaded (mock)."

async def doc_delete(user_id: str, doc_id: str) -> str:
    """Mock document delete."""
    return f"Document {doc_id} deleted (mock)."

async def doc_summarize(user_id: str, doc_id: str) -> str:
    """Mock document summarize."""
    return f"Summary for {doc_id} (mock)."

# Tool Registry map
TOOL_REGISTRY = {
    "memory_search": {
        "fn": memory_search,
        "description": "Search user's memory database.",
        "requires_hitl": False,
        "domain": "memory"
    },
    "doc_search": {
        "fn": doc_search,
        "description": "Search user's uploaded documents.",
        "requires_hitl": False,
        "domain": "docs"
    },
    "web_search": {
        "fn": web_search,
        "description": "Search the web with DuckDuckGo.",
        "requires_hitl": False,
        "domain": "web"
    },
    "web_fetch": {
        "fn": web_fetch,
        "description": "Fetch content of a URL.",
        "requires_hitl": False,
        "domain": "web"
    },
    # Phase 2 Tools Added Here:
    "memory_write": {
        "fn": memory_write,
        "description": "Create a new permanent universal memory fact.",
        "requires_hitl": True,
        "domain": "memory"
    },
    "memory_delete": {
        "fn": memory_delete,
        "description": "Delete a permanent memory fact by its UUID.",
        "requires_hitl": True,
        "domain": "memory"
    },
    "memory_promote": {
        "fn": memory_promote,
        "description": "Promote a temporary conversational memory to permanent memory by its UUID.",
        "requires_hitl": True,
        "domain": "memory"
    },
    "doc_upload": {
        "fn": doc_upload,
        "description": "Upload content as a new document.",
        "requires_hitl": True,
        "domain": "docs"
    },
    "doc_delete": {
        "fn": doc_delete,
        "description": "Delete a document by its ID.",
        "requires_hitl": True,
        "domain": "docs"
    },
    "doc_summarize": {
        "fn": doc_summarize,
        "description": "Summarize an existing document by its ID.",
        "requires_hitl": False,
        "domain": "docs"
    }
}
