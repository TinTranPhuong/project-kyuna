import aiofiles
from pathlib import Path
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, BackgroundTasks
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.translator import JobResponse, JobDetailResponse
from app.services import translator_service

router = APIRouter()

# Magic bytes definitions for strict file validation
MAGIC_BYTES = {
    "jpg": b"\xff\xd8\xff",
    "png": b"\x89\x50\x4e\x47",
    "zip": b"\x50\x4b\x03\x04",  # Also covers .cbz files
}

@router.post("/upload", response_model=JobResponse, status_code=status.HTTP_202_ACCEPTED)
async def upload_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    source_language: str = Form("auto"),
    target_language: str = Form("en"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Upload an image or CBZ/ZIP archive for translation.
    Processing happens asynchronously in the background.
    """
    # 1. Validate file size (FastAPI UploadFile.size is in bytes)
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if file.size and file.size > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_MB}MB."
        )

    # 2. Validate file type via magic bytes
    header = await file.read(4)
    await file.seek(0)  # Reset cursor for actual saving
    
    is_valid_type = (
        header.startswith(MAGIC_BYTES["jpg"]) or 
        header.startswith(MAGIC_BYTES["png"]) or 
        header.startswith(MAGIC_BYTES["zip"])
    )
    
    if not is_valid_type:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Invalid file format. Only JPG, PNG, and ZIP/CBZ are allowed."
        )

    # 3. Create TranslationJob in DB to get the job ID
    job = await translator_service.create_translation_job(
        db=db, 
        user_id=current_user.id, 
        filename=file.filename,
        file_size=file.size,
        source_lang=source_language,
        target_lang=target_language
    )

    # 4. Save file to disk
    original_dir = Path(settings.UPLOAD_DIR) / str(current_user.id) / str(job.id) / "original"
    original_dir.mkdir(parents=True, exist_ok=True)
    file_path = original_dir / file.filename

    async with aiofiles.open(file_path, "wb") as out_file:
        while content := await file.read(1024 * 1024):  # 1MB chunks to prevent memory spikes
            await out_file.write(content)

    # 5. Update job with the actual saved file path
    job = await translator_service.update_job_file_path(db, job.id, str(file_path))

    # 6. Dispatch background processing task
    background_tasks.add_task(translator_service.process_job, job_id=job.id)

    return job


@router.get("/jobs", response_model=List[JobResponse])
async def list_jobs(
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List current user's translation jobs (newest first)."""
    return await translator_service.get_user_jobs(db, current_user.id, skip, limit)


@router.get("/jobs/{job_id}", response_model=JobDetailResponse)
async def get_job_detail(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get specific job details including all its pages."""
    return await translator_service.get_job_detail(db, current_user.id, job_id)


@router.post("/jobs/{job_id}/retranslate", status_code=status.HTTP_202_ACCEPTED)
async def retranslate_job(
    job_id: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Reset a job's status and enqueue it for re-translation."""
    job = await translator_service.reset_job_for_retranslation(db, current_user.id, job_id)
    background_tasks.add_task(translator_service.process_job, job_id=job.id)
    return {"message": "Job queued for re-translation"}


@router.delete("/jobs/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_job(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a job, its database records, and all related files on disk."""
    await translator_service.delete_translation_job(db, current_user.id, job_id)
    return None


@router.get("/jobs/{job_id}/pages/{page_num}/original")
async def get_original_page(
    job_id: str,
    page_num: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Serve the original un-translated image page."""
    file_path = await translator_service.get_page_file_path(db, current_user.id, job_id, page_num, image_type="original")
    return FileResponse(file_path)


@router.get("/jobs/{job_id}/pages/{page_num}/translated")
async def get_translated_page(
    job_id: str,
    page_num: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Serve the fully translated and overlayed image page."""
    file_path = await translator_service.get_page_file_path(db, current_user.id, job_id, page_num, image_type="translated")
    return FileResponse(file_path)


@router.get("/jobs/{job_id}/download")
async def download_translated_job(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Stream an in-memory ZIP archive of all translated pages."""
    zip_stream = await translator_service.create_zip_stream(db, current_user.id, job_id)
    
    return StreamingResponse(
        zip_stream,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="translated_{job_id}.zip"'}
    )