import uuid
import logging
from pathlib import Path
from datetime import datetime, timezone
import tiktoken
from pypdf import PdfReader
import docx

from app.models.memory import Document, DocChunk
from app.services.embedding_service import embedding_service
from app.services.qdrant_service import qdrant_service
from app.services.chunking_service import semantic_chunk
logger = logging.getLogger(__name__)

# --- Parsers ---
def parse_pdf(file_path: str) -> list[dict]:
    reader = PdfReader(file_path)
    return [{"text": page.extract_text() or "", "page_number": i + 1} for i, page in enumerate(reader.pages)]

def parse_docx(file_path: str) -> list[dict]:
    doc = docx.Document(file_path)
    return [{"text": "\n".join([p.text for p in doc.paragraphs]), "page_number": 1}]

def parse_txt(file_path: str, strip_markdown: bool = False) -> list[dict]:
    with open(file_path, "r", encoding="utf-8") as f:
        return [{"text": f.read(), "page_number": 1}]

class ChunkResult:
    def __init__(self, content: str, token_count: int):
        self.content = content
        self.page_number = None
        self.section_heading = None
        self.token_count = token_count

def semantic_chunk(text: str, chunk_size: int = 400, overlap: int = 50) -> list[ChunkResult]:
    enc = tiktoken.get_encoding("cl100k_base")
    tokens = enc.encode(text)
    chunks = []
    for i in range(0, max(1, len(tokens)), max(1, chunk_size - overlap)):
        chunk_tokens = tokens[i:i + chunk_size]
        chunks.append(ChunkResult(content=enc.decode(chunk_tokens), token_count=len(chunk_tokens)))
    return chunks

# --- Service ---
class DocumentService:
    async def process_document(self, doc_id: uuid.UUID) -> None:
        """Background task. Creates its own DB session."""
        from app.core.database import AsyncSessionLocal
        
        async with AsyncSessionLocal() as db:
            doc = await db.get(Document, doc_id)
            if not doc:
                return
                
            try:
                # Determine file type and parse
                file_path = Path(doc.original_path)
                
                if doc.file_type == "pdf":
                    pages = parse_pdf(str(file_path))
                elif doc.file_type == "docx":
                    pages = parse_docx(str(file_path))
                else:
                    pages = parse_txt(str(file_path), strip_markdown=(doc.file_type == "md"))
                    
                full_text = "\n\n".join(p["text"] for p in pages)
                
                # Scanned PDF guard
                if len(full_text.strip()) < 50:
                    doc.status = "failed"
                    doc.error_message = "This PDF appears to be a scanned image and has no text layer. Only text-based PDFs are supported."
                    await db.commit()
                    return

                # Chunk
                chunks = semantic_chunk(full_text)
                
                # Embed batch
                texts = [c.content for c in chunks]
                vectors = await embedding_service.embed_batch(texts)
                
                if not vectors:
                    raise Exception("Embedding server offline or returned no vectors.")

                # Save to PostgreSQL + Qdrant
                for i, (chunk, vector) in enumerate(zip(chunks, vectors)):
                    chunk_id = uuid.uuid4()
                    db_chunk = DocChunk(
                        id=chunk_id, doc_id=doc_id, user_id=doc.user_id,
                        chunk_index=i, content=chunk.content,
                        page_number=chunk.page_number, section_heading=chunk.section_heading,
                        token_count=chunk.token_count, qdrant_synced=False
                    )
                    db.add(db_chunk)

                    success = await qdrant_service.upsert_chunk(chunk_id, vector, {
                        "user_id": str(doc.user_id),
                        "doc_id": str(doc_id),
                        "doc_filename": doc.filename,
                        "content": chunk.content,
                        "page_number": chunk.page_number,
                        "section_heading": chunk.section_heading,
                    })
                    if success:
                        db_chunk.qdrant_synced = True

                doc.status = "ready"
                doc.chunk_count = len(chunks)
                doc.processed_at = datetime.now(timezone.utc)
                await db.commit()
                logger.info(f"[DocumentService] Successfully processed document {doc_id}")
                
            except Exception as e:
                logger.error(f"[DocumentService] Failed processing doc {doc_id}: {e}")
                doc.status = "failed"
                doc.error_message = str(e)
                await db.commit()

document_service = DocumentService()