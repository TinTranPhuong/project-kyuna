from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import verify_password
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.user import (
    UpdateProfileRequest,
    ChangePasswordRequest,
    UserSettingsResponse,
    UpdateSettingsRequest,
)
from app.services import user_service
from pydantic import BaseModel


class DeleteAccountRequest(BaseModel):
    password: str

router = APIRouter()


@router.patch("/me", response_model=dict, status_code=status.HTTP_200_OK)
async def update_profile(
    data: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update the current user's profile (e.g., username)."""
    return await user_service.update_user_profile(db, current_user, data)


@router.patch("/me/password", status_code=status.HTTP_200_OK)
async def change_password(
    data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Change user password after verifying the current one."""
    await user_service.change_user_password(db, current_user, data)
    return {"message": "Password updated successfully"}


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(
    data: DeleteAccountRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Hard delete the user account and all associated data. Requires password confirmation."""
    if not verify_password(data.password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect password",
        )
    await user_service.delete_user_account(db, current_user.id)
    return None


@router.get("/me/settings", response_model=UserSettingsResponse)
async def get_settings(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve the user's current settings."""
    return await user_service.get_user_settings(db, current_user.id)


@router.patch("/me/settings", response_model=UserSettingsResponse)
async def update_settings(
    data: UpdateSettingsRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Partially update user settings."""
    return await user_service.update_user_settings(db, current_user.id, data)


# ── Wallpaper File Upload ─────────────────────────────────────────────────────

from fastapi import UploadFile, File
from fastapi.responses import FileResponse
from pathlib import Path
import shutil

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif", "image/bmp"}
MAX_WALLPAPER_SIZE = 20 * 1024 * 1024  # 20MB


@router.post("/me/wallpaper", status_code=status.HTTP_200_OK)
async def upload_wallpaper(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload a wallpaper image. Saves to disk, stores URL path in user settings."""
    from app.core.config import settings as app_settings

    # Validate content type
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(400, f"Invalid image type. Allowed: {', '.join(ALLOWED_IMAGE_TYPES)}")

    # Read and validate size
    content = await file.read()
    if len(content) > MAX_WALLPAPER_SIZE:
        raise HTTPException(400, f"Image exceeds {MAX_WALLPAPER_SIZE // (1024*1024)}MB limit")

    # Determine extension from content type
    ext_map = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
               "image/gif": "gif", "image/bmp": "bmp"}
    ext = ext_map.get(file.content_type, "jpg")

    # Save to disk: uploads/wallpapers/{user_id}.{ext}
    wallpaper_dir = Path(app_settings.WALLPAPER_DIR)
    wallpaper_dir.mkdir(parents=True, exist_ok=True)

    # Remove any existing wallpaper with different extension
    for old in wallpaper_dir.glob(f"{current_user.id}.*"):
        old.unlink(missing_ok=True)

    file_path = wallpaper_dir / f"{current_user.id}.{ext}"
    with open(file_path, "wb") as f:
        f.write(content)

    # Store the URL path in user settings (NOT the base64 data)
    # Use the public path (no auth required — CSS background-image can't send JWT)
    wallpaper_url = f"/api/v1/users/wallpapers/{current_user.id}?v={int(__import__('time').time())}"
    settings_obj = await user_service.get_user_settings(db, current_user.id)
    settings_obj.custom_wallpaper = wallpaper_url
    await db.commit()

    return {"url": wallpaper_url}


@router.get("/wallpapers/{user_id}")
async def get_wallpaper(
    user_id: str,
):
    """Serve a user's wallpaper. No auth required — CSS background-image can't send JWT."""
    from app.core.config import settings as app_settings

    wallpaper_dir = Path(app_settings.WALLPAPER_DIR)
    # Find the user's wallpaper file (could be any extension)
    for ext in ["webp", "jpg", "png", "gif", "bmp"]:
        file_path = wallpaper_dir / f"{user_id}.{ext}"
        if file_path.exists():
            media_types = {"webp": "image/webp", "jpg": "image/jpeg", "png": "image/png",
                           "gif": "image/gif", "bmp": "image/bmp"}
            return FileResponse(
                file_path,
                media_type=media_types.get(ext, "image/jpeg"),
                headers={"Cache-Control": "public, max-age=31536000, immutable"}
            )

    raise HTTPException(404, "No wallpaper set")


@router.delete("/me/wallpaper", status_code=status.HTTP_204_NO_CONTENT)
async def delete_wallpaper(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove the user's wallpaper from disk and clear the DB reference."""
    from app.core.config import settings as app_settings

    wallpaper_dir = Path(app_settings.WALLPAPER_DIR)
    for old in wallpaper_dir.glob(f"{current_user.id}.*"):
        old.unlink(missing_ok=True)

    settings_obj = await user_service.get_user_settings(db, current_user.id)
    settings_obj.custom_wallpaper = None
    await db.commit()