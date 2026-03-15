import logging
import asyncio
import httpx
from bs4 import BeautifulSoup
from duckduckgo_search import DDGS

from app.services.qdrant_service import qdrant_service
from app.services.file_generator import (
    generate_docx, generate_xlsx, generate_pptx, build_save_path
)
from app.core.config import settings

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


# ── File Creation Tool Functions ──────────────────────────────────────────────

def _get_backend_base_url() -> str:
    """Resolve the backend base URL for building absolute download links."""
    return getattr(settings, "PUBLIC_BACKEND_URL", None) or "http://localhost:8000"


async def create_docx(user_id: str, title: str, content: str) -> str:
    """
    Generate a Word document (.docx) from markdown content.
    Returns a human-readable string with a markdown download link.
    """
    try:
        save_path = build_save_path(settings.UPLOAD_DIR, user_id, title, ".docx")
        generate_docx(title, content, save_path)
        base = _get_backend_base_url()
        download_url = f"{base}/api/v1/files/download/{user_id}/{save_path.name}"
        return f"File created successfully: **{save_path.name}**\nDownload link: [📄 Download {save_path.name}]({download_url})"
    except Exception as e:
        logger.error(f"create_docx failed: {e}")
        return f"Error creating document: {e}"


async def create_xlsx(user_id: str, title: str, rows: list) -> str:
    """
    Generate an Excel spreadsheet (.xlsx) from a list of rows.
    First row is treated as the header. Returns a string with a markdown download link.
    """
    try:
        save_path = build_save_path(settings.UPLOAD_DIR, user_id, title, ".xlsx")
        generate_xlsx(title, rows, save_path)
        base = _get_backend_base_url()
        download_url = f"{base}/api/v1/files/download/{user_id}/{save_path.name}"
        return f"File created successfully: **{save_path.name}**\nDownload link: [📊 Download {save_path.name}]({download_url})"
    except Exception as e:
        logger.error(f"create_xlsx failed: {e}")
        return f"Error creating spreadsheet: {e}"


async def create_pptx(user_id: str, title: str, slides: list) -> str:
    """
    Generate a PowerPoint presentation (.pptx) from slides data.
    `slides` = [{"title": str, "bullets": list[str]}]
    Returns a string with a markdown download link.
    """
    try:
        save_path = build_save_path(settings.UPLOAD_DIR, user_id, title, ".pptx")
        generate_pptx(title, slides, save_path)
        base = _get_backend_base_url()
        download_url = f"{base}/api/v1/files/download/{user_id}/{save_path.name}"
        return f"File created successfully: **{save_path.name}**\nDownload link: [📊 Download {save_path.name}]({download_url})"
    except Exception as e:
        logger.error(f"create_pptx failed: {e}")
        return f"Error creating presentation: {e}"


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
    },
    # ── File Creation Tools ───────────────────────────────────────────────
    "create_docx": {
        "fn": create_docx,
        "description": "Create a .docx Word document from the given title and markdown content. Returns a download URL.",
        "requires_hitl": False,
        "domain": "files"
    },
    "create_xlsx": {
        "fn": create_xlsx,
        "description": "Create a .xlsx Excel spreadsheet with the given title and rows (list of lists, first row = headers). Returns a download URL.",
        "requires_hitl": False,
        "domain": "files"
    },
    "create_pptx": {
        "fn": create_pptx,
        "description": "Create a .pptx PowerPoint presentation with the given title and slides (list of {title, bullets} dicts). Returns a download URL.",
        "requires_hitl": False,
        "domain": "files"
    },
}
