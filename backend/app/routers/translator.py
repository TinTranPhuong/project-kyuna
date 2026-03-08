import asyncio
import aiofiles
import json
from pathlib import Path
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, BackgroundTasks, Request
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from app.core.config import settings
from app.core.database import get_db, AsyncSessionLocal
from app.core.limiter import limiter
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.models.translator import TranslationJob, TranslationPage
from app.schemas.translator import JobResponse, JobDetailResponse
from app.services import translator_service

router = APIRouter()

# Magic bytes definitions for strict file validation
MAGIC_BYTES = {
    "jpg": b"\xff\xd8\xff",
    "png": b"\x89\x50\x4e\x47",
    "zip_pk": b"\x50\x4b", 
}

# --- NEW MODEL FOR RENAME ---
class RenameRequest(BaseModel):
    name: str

@router.post("/upload", response_model=JobResponse, status_code=status.HTTP_202_ACCEPTED)
@limiter.limit("5/minute")
async def upload_file(
    request: Request,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    source_language: Optional[str] = Form(None), 
    target_language: Optional[str] = Form(None), 
    engine: Optional[str] = Form(None),          
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    source_language = source_language or "auto"
    target_language = target_language or "en"
    
    valid_engines = {"pipeline", "vision", "ocr_llm"}
    if not engine or engine not in valid_engines:
        engine = "pipeline"

    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if file.size and file.size > max_bytes:
        raise HTTPException(status_code=413, detail=f"File too large.")

    header = await file.read(4)
    await file.seek(0)
    
    is_valid_type = (
        header.startswith(MAGIC_BYTES["jpg"]) or 
        header.startswith(MAGIC_BYTES["png"]) or 
        header.startswith(MAGIC_BYTES["zip_pk"])
    )
    
    if not is_valid_type:
        raise HTTPException(status_code=415, detail="Invalid file type.")

    job = await translator_service.create_translation_job(
        db=db, 
        user_id=current_user.id, 
        filename=file.filename,
        file_size=file.size,
        source_lang=source_language,
        target_lang=target_language
    )

    original_dir = Path(settings.UPLOAD_DIR) / str(current_user.id) / str(job.id) / "original"
    original_dir.mkdir(parents=True, exist_ok=True)
    file_path = original_dir / file.filename

    async with aiofiles.open(file_path, "wb") as out_file:
        while content := await file.read(1024 * 1024):
            await out_file.write(content)

    job = await translator_service.update_job_file_path(db, job.id, str(file_path))
    # Set engine and persist in a single commit
    job.engine = engine
    await db.commit()

    # All background tasks create their own DB sessions internally.
    # Never pass a request-scoped `db` to a background task — it will be
    # closed/disposed by FastAPI before the task runs.
    if engine == "vision":
        background_tasks.add_task(translator_service.process_job_vision, job.id)
    else:
        # Both "pipeline" and legacy "ocr_llm" use the same pipeline.
        background_tasks.add_task(translator_service.process_job_pipeline, job.id)

    return job

@router.get("/jobs", response_model=List[JobResponse])
async def list_jobs(
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await translator_service.get_user_jobs(db, current_user.id, skip, limit)

@router.get("/jobs/{job_id}", response_model=JobDetailResponse)
async def get_job_detail(
    job_id: UUID,  
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await translator_service.get_job_detail(db, current_user.id, job_id)

# --- NEW RENAME ENDPOINT ---
@router.patch("/jobs/{job_id}/rename", response_model=JobResponse)
async def rename_job(
    job_id: UUID,
    request: RenameRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    job = await db.get(TranslationJob, job_id)
    if not job or job.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job.original_filename = request.name
    await db.commit()
    await db.refresh(job)
    return job

@router.get("/jobs/{job_id}/pages/{page_number}/pipeline-progress")
async def pipeline_progress(
    job_id: UUID,
    page_number: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Verify job ownership once
    job = await db.get(TranslationJob, job_id)
    if not job or job.user_id != current_user.id:
        raise HTTPException(404, "Job not found")

    PHASE_NAMES = {
        "detecting":   (1, "Detecting text regions"),
        "cropping":    (2, "Cropping bubbles"),
        "ocr":         (3, "Reading Japanese text"),
        "translating": (5, "Translating with Qwen 35B"),
        "done":        (6, "Complete"),
        "failed":      (0, "Failed"),
    }

    async def event_generator():
        last_phase_status = None
        while True:
            await asyncio.sleep(2.0)
            
            try:
                async with AsyncSessionLocal() as stream_db:
                    result = await stream_db.execute(
                        select(TranslationPage).where(
                            TranslationPage.job_id == job_id,
                            TranslationPage.page_number == page_number,
                        )
                    )
                    page = result.scalar_one_or_none()

                if page is None:
                    yield f"data: {json.dumps({'waiting': True})}\n\n"
                    continue

                status = page.phase_status

                if status != last_phase_status or last_phase_status is None:
                    stage_num, stage_name = PHASE_NAMES.get(status, (0, status))
                    
                    if status == "done" and page.regions_json:
                        regions = json.loads(page.regions_json)
                        yield f"data: {json.dumps({'stage':4,'name':'Hangoff Protocol','status':'done'})}\n\n"
                        yield f"data: {json.dumps({'stage':5,'name':'Translating','status':'done'})}\n\n"
                        yield f"data: {json.dumps({'stage':6,'name':'Complete','status':'done','regions':regions})}\n\n"
                        return
                    elif status == "failed":
                        yield f"data: {json.dumps({'stage':0,'name':'Failed','status':'failed','error':page.error_message})}\n\n"
                        return
                    else:
                        yield f"data: {json.dumps({'stage':stage_num,'name':stage_name,'status':'running'})}\n\n"
                        
                    last_phase_status = status
            except Exception as e:
                print(f"Stream error: {e}")
                yield f"data: {json.dumps({'waiting': True})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )

@router.get("/jobs/{job_id}/pages/{page_number}/stream")
async def stream_page_regions(
    job_id: UUID,
    page_number: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    job = await db.get(TranslationJob, job_id)
    if not job or job.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Job not found")

    async def event_generator():
        last_region_count = 0
        while True:
            await asyncio.sleep(2.0) 
            
            async with AsyncSessionLocal() as stream_db:
                current_job = await stream_db.get(TranslationJob, job_id)
                if current_job and current_job.status == "failed":
                    error_msg = current_job.error_message or "Job processing failed catastrophically."
                    yield f"data: {json.dumps({'error': error_msg, 'done': True})}\n\n"
                    return

                result = await stream_db.execute(
                    select(TranslationPage).where(
                        TranslationPage.job_id == job_id,
                        TranslationPage.page_number == page_number,
                    )
                )
                page = result.scalar_one_or_none()

            if page is None:
                yield f"data: {json.dumps({'waiting': True})}\n\n"
                continue

            if page.processing_status == "failed":
                error_msg = page.error_message or "AI processing failed."
                yield f"data: {json.dumps({'error': error_msg, 'done': True})}\n\n"
                return

            if page.regions_json is None:
                yield f"data: {json.dumps({'waiting': True})}\n\n"
                continue

            regions = json.loads(page.regions_json)
            for region in regions[last_region_count:]:
                yield f"data: {json.dumps(region, ensure_ascii=False)}\n\n"
            
            last_region_count = len(regions)

            if page.processing_status in ("completed", "no_text"):
                total = len(regions)
                yield f"data: {json.dumps({'done': True, 'total_regions': total, 'page_number': page_number})}\n\n"
                return

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )

@router.get("/jobs/{job_id}/pages/{page_number}/regions")
async def get_page_regions(
    job_id: UUID,
    page_number: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    job = await db.get(TranslationJob, job_id)
    if not job or job.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Job not found")

    stmt = select(TranslationPage).where(
        TranslationPage.job_id == job_id,
        TranslationPage.page_number == page_number
    )
    result = await db.execute(stmt)
    page = result.scalar_one_or_none()

    if not page:
        raise HTTPException(status_code=404, detail="Page not found")

    regions = []
    if page.regions_json:
        try:
            regions = json.loads(page.regions_json)
        except json.JSONDecodeError:
            pass

    return {
        "regions": regions,
        "page_number": page.page_number,
        "has_text": page.has_text
    }

@router.post("/jobs/{job_id}/retranslate", response_model=JobResponse, status_code=status.HTTP_202_ACCEPTED)
async def retranslate_job(
    job_id: UUID,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    job = await translator_service.reset_job_for_retranslation(db, current_user.id, job_id)
    
    if job.engine == "vision":
        background_tasks.add_task(translator_service.process_job_vision, job.id)
    else:
        # Both "pipeline" and legacy "ocr_llm" use the same pipeline.
        background_tasks.add_task(translator_service.process_job_pipeline, job.id)
        
    return job

@router.delete("/jobs/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_job(
    job_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    await translator_service.delete_translation_job(db, current_user.id, job_id)
    return None

@router.get("/jobs/{job_id}/pages/{page_num}/original")
async def get_original_page(
    job_id: UUID,
    page_num: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    max_retries = 5
    for attempt in range(max_retries):
        try:
            file_path = await translator_service.get_page_file_path(
                db=db, user_id=current_user.id, job_id=job_id, page_num=page_num, image_type="original"
            )
            return FileResponse(file_path)
        except HTTPException as e:
            if e.status_code == 404 and attempt < max_retries - 1:
                await asyncio.sleep(1)
                continue
            raise e

@router.get("/jobs/{job_id}/pages/{page_num}/translated")
async def get_translated_page(
    job_id: UUID,
    page_num: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    max_retries = 5
    for attempt in range(max_retries):
        try:
            file_path = await translator_service.get_page_file_path(
                db=db, user_id=current_user.id, job_id=job_id, page_num=page_num, image_type="translated"
            )
            return FileResponse(file_path)
        except HTTPException as e:
            if e.status_code == 404:
                try:
                    orig_path = await translator_service.get_page_file_path(
                        db=db, user_id=current_user.id, job_id=job_id, page_num=page_num, image_type="original"
                    )
                    return FileResponse(orig_path)
                except:
                    pass
                if attempt < max_retries - 1:
                    await asyncio.sleep(1)
                    continue
            raise e

@router.get("/jobs/{job_id}/download")
async def download_translated_job(
    job_id: UUID, 
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Verify ownership before streaming
    job = await db.get(TranslationJob, job_id)
    if not job or job.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Job not found")

    zip_stream = translator_service.create_zip_stream(job_id, db)
    return StreamingResponse(
        zip_stream,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="translated_{job_id}.zip"'}
    )