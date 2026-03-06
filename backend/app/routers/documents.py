import uuid
import shutil
from pathlib import Path
from typing import List

from fastapi import APIRouter, Depends, UploadFile, File, BackgroundTasks, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func

from app.core.database import get_db
from app.core.config import settings
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.models.memory import Document, DocChunk
from app.schemas.document import DocumentResponse, ChunkPaginatedResponse
from app.services.document_service import document_service
from app.services.qdrant_service import qdrant_service

router = APIRouter()

ALLOWED_EXTENSIONS = {".pdf": "pdf", ".docx": "docx", ".txt": "txt", ".md": "md"}

@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_202_ACCEPTED)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported file type. Allowed: {list(ALLOWED_EXTENSIONS.keys())}")
    
    doc_id = uuid.uuid4()
    upload_dir = Path(settings.DOCS_UPLOAD_DIR) / str(current_user.id) / str(doc_id) / "original"
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    file_path = upload_dir / file.filename
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not save file: {e}")
        
    file_size = file_path.stat().st_size
    max_size = settings.MAX_DOC_SIZE_MB * 1024 * 1024
    if file_size > max_size:
        shutil.rmtree(upload_dir.parent, ignore_errors=True)
        raise HTTPException(status_code=400, detail=f"File exceeds {settings.MAX_DOC_SIZE_MB}MB limit")

    doc = Document(
        id=doc_id,
        user_id=current_user.id,
        filename=file.filename,
        original_path=str(file_path),
        file_size_bytes=file_size,
        file_type=ALLOWED_EXTENSIONS[ext],
        status="processing"
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    background_tasks.add_task(document_service.process_document, doc_id)
    return doc

@router.get("/", response_model=List[DocumentResponse])
async def list_documents(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    docs = await db.scalars(select(Document).where(Document.user_id == current_user.id).order_by(Document.created_at.desc()))
    return list(docs)

@router.get("/{doc_id}/chunks", response_model=ChunkPaginatedResponse)
async def list_chunks(
    doc_id: uuid.UUID,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    doc = await db.scalar(select(Document).where(Document.id == doc_id, Document.user_id == current_user.id))
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    query = select(DocChunk).where(DocChunk.doc_id == doc_id)
    total = await db.scalar(select(func.count()).select_from(query.subquery()))
    chunks = await db.scalars(query.order_by(DocChunk.chunk_index).offset(offset).limit(limit))
    
    return {"items": list(chunks), "total": total or 0}

@router.delete("/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(doc_id: uuid.UUID, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    doc = await db.scalar(select(Document).where(Document.id == doc_id, Document.user_id == current_user.id))
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # 1. PostgreSQL cascade delete
    await db.delete(doc)
    await db.commit()

    # 2. Qdrant delete
    await qdrant_service.delete_by_doc(doc_id)

    # 3. File deletion using pathlib
    doc_dir = Path(doc.original_path).parent.parent
    if doc_dir.exists() and doc_dir.is_dir():
        shutil.rmtree(doc_dir, ignore_errors=True)

@router.post("/{doc_id}/reprocess", response_model=DocumentResponse, status_code=status.HTTP_202_ACCEPTED)
async def reprocess_document(
    doc_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    doc = await db.scalar(select(Document).where(Document.id == doc_id, Document.user_id == current_user.id))
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Reset DB state
    doc.status = "processing"
    doc.chunk_count = 0
    doc.error_message = None
    await db.execute(delete(DocChunk).where(DocChunk.doc_id == doc_id))
    await db.commit()
    await db.refresh(doc)

    # Clear old vectors
    await qdrant_service.delete_by_doc(doc_id)

    # Re-queue
    background_tasks.add_task(document_service.process_document, doc_id)
    return doc