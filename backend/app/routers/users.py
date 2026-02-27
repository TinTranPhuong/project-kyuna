from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.user import (
    UpdateProfileRequest,
    ChangePasswordRequest,
    UserSettingsResponse,
    UpdateSettingsRequest,
)
from app.services import user_service

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
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Hard delete the user account and all associated data."""
    # We pass the user ID, and the service will handle CASCADE deletes and file cleanup
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