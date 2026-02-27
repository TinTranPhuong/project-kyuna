import base64
import json
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import AsyncGenerator
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.translator import TranslationJob, TranslationPage
from app.utils.ai_client import ai_client
from app.utils.image_utils import overlay_translations_on_image, resize_image_for_ocr
from app.utils.zip_utils import create_zip_stream as generate_zip_stream
from app.services import file_service


async def process_job(job_id: UUID, db: AsyncSession) -> None:
    """
    Background task — runs after upload. Orchestrates file extraction, 
    AI translation, and image manipulation page-by-page.
    """
    # 1. Fetch job and set processing state
    stmt = select(TranslationJob).where(TranslationJob.id == job_id)
    job = (await db.execute(stmt)).scalar_one_or_none()
    
    if not job:
        return

    job.status = "processing"
    job.started_at = datetime.now(timezone.utc)
    await db.commit()

    try:
        # 2. Extract files based on type
        file_path = Path(job.file_path)
        job_dir = file_service.get_upload_dir(job.user_id, job.id)
        original_dir = job_dir / "original"
        translated_dir = job_dir / "translated"
        translated_dir.mkdir(parents=True, exist_ok=True)
        
        image_paths = []
        if file_path.suffix.lower() in [".cbz", ".zip"]:
            image_paths = file_service.extract_cbz(str(file_path), str(original_dir))
        else:
            image_paths = [str(file_path)]

        # 3. Update job page count
        job.page_count = len(image_paths)
        await db.commit()

        # 4. Process each page sequentially
        for i, img_path in enumerate(image_paths, start=1):
            # a. Create page record
            page = TranslationPage(
                job_id=job.id,
                page_number=i,
                original_path=img_path,
                processing_status="processing"
            )
            db.add(page)
            await db.commit()
            await db.refresh(page)

            try:
                # Resize if necessary to avoid blowing up AI server VRAM
                optimal_img_path = resize_image_for_ocr(img_path)
                
                # Encode to Base64 for the API
                with open(optimal_img_path, "rb") as image_file:
                    b64_image = base64.b64encode(image_file.read()).decode('utf-8')

                # b. Call AI Translation
                ai_response = await ai_client.translate_image(
                    image_base64=b64_image,
                    source_language=job.source_language,
                    target_language=job.target_language
                )

                text_regions = ai_response.get("bounding_boxes", [])
                
                translated_file_path = translated_dir / f"page_{i:03d}.jpg"

                # c. Check if text was found and overlay
                if text_regions:
                    overlay_translations_on_image(
                        image_path=optimal_img_path,
                        text_regions=text_regions,
                        output_path=str(translated_file_path)
                    )
                    page.has_text = True
                    page.translated_text = json.dumps(text_regions)
                    page.translated_path = str(translated_file_path)
                    page.processing_status = "done"
                else:
                    # No text found, just copy the original over
                    shutil.copy(img_path, translated_file_path)
                    page.has_text = False
                    page.translated_path = str(translated_file_path)
                    page.processing_status = "no_text"

                # Cleanup temp resized image if one was created
                if optimal_img_path != img_path and Path(optimal_img_path).exists():
                    Path(optimal_img_path).unlink()

            except Exception as page_e:
                page.processing_status = "failed"
                page.error_message = str(page_e)
            
            # d. Commit page status so frontend polling sees progress
            await db.commit()

        # 5. Mark job as complete
        job.status = "completed"
        job.completed_at = datetime.now(timezone.utc)
        await db.commit()

    except Exception as e:
        # 6. Catch unhandled exceptions at the job level
        job.status = "failed"
        job.error_message = str(e)
        await db.commit()


async def create_zip_stream(job_id: UUID, db: AsyncSession) -> AsyncGenerator[bytes, None]:
    """
    Stream a ZIP of all translated pages without loading all into memory.
    """
    stmt = select(TranslationPage).where(TranslationPage.job_id == job_id).order_by(TranslationPage.page_number)
    result = await db.execute(stmt)
    pages = result.scalars().all()

    file_paths = []
    for page in pages:
        # Use translated path if available, fallback to original
        source_path = page.translated_path or page.original_path
        if source_path and Path(source_path).exists():
            name_in_zip = f"page_{page.page_number:03d}{Path(source_path).suffix}"
            file_paths.append((source_path, name_in_zip))

    # Yield the async generator directly from zip_utils
    async for chunk in generate_zip_stream(file_paths):
        yield chunk

# ... You can include the other CRUD helper methods (get_user_jobs, get_job_detail, etc.) here
# that the router expects, following the standard SQLAlchemy select patterns established earlier.