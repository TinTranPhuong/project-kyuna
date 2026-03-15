"""
files.py — Router for serving AI-generated files.
Endpoint: GET /api/v1/files/download/{user_id}/{filename}
"""

import logging
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse

from app.core.config import settings
from app.dependencies.auth import get_current_user
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/download/{user_id}/{filename}")
async def download_generated_file(
    user_id: str,
    filename: str,
):
    """
    Stream a generated file to the client.
    - Public endpoint using Capability URL security model.
    - The filename contains a cryptographically secure 128-bit UUID.
    - Returns the file as a downloadable attachment.
    """
    file_path = Path(settings.UPLOAD_DIR) / "generated" / user_id / filename

    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="File not found.")

    # Infer media type from extension
    suffix = file_path.suffix.lower()
    media_types = {
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    }
    media_type = media_types.get(suffix, "application/octet-stream")

    logger.info(f"[files] Serving generated file: {file_path} for user {user_id}")
    return FileResponse(
        path=str(file_path),
        media_type=media_type,
        filename=filename,
    )
