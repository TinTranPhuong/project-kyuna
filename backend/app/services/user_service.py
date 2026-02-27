import shutil
from pathlib import Path

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.models.user import User
from app.models.session import UserSettings
from app.schemas.user import UpdateProfileRequest, ChangePasswordRequest, UpdateSettingsRequest
from app.core.security import hash_password, verify_password
from app.core.config import settings


async def update_user_profile(db: AsyncSession, current_user: User, data: UpdateProfileRequest) -> User:
    """Updates the user's profile details."""
    if data.username is not None:
        current_user.username = data.username
        
    try:
        await db.commit()
        await db.refresh(current_user)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Username is already taken"
        )
        
    return current_user


async def change_user_password(db: AsyncSession, current_user: User, data: ChangePasswordRequest) -> None:
    """Validates the current password and sets a new one."""
    if not verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Incorrect current password"
        )
        
    current_user.hashed_password = hash_password(data.new_password)
    await db.commit()


async def delete_user_account(db: AsyncSession, user_id: str) -> None:
    """Hard deletes a user, their database cascades, and their physical files."""
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="User not found"
        )

    # Delete physical translation upload files
    user_dir = Path(settings.UPLOAD_DIR) / str(user_id)
    if user_dir.exists() and user_dir.is_dir():
        shutil.rmtree(user_dir, ignore_errors=True)

    # Delete DB record (relies on SQLAlchemy/Alembic ON DELETE CASCADE for related rows)
    await db.delete(user)
    await db.commit()


async def get_user_settings(db: AsyncSession, user_id: str) -> UserSettings:
    """Fetches user settings, creating defaults if missing."""
    stmt = select(UserSettings).where(UserSettings.user_id == user_id)
    result = await db.execute(stmt)
    settings_obj = result.scalar_one_or_none()
    
    # Fallback in case settings were somehow missed during registration
    if not settings_obj:
        settings_obj = UserSettings(user_id=user_id)
        db.add(settings_obj)
        await db.commit()
        await db.refresh(settings_obj)
        
    return settings_obj


async def update_user_settings(db: AsyncSession, user_id: str, data: UpdateSettingsRequest) -> UserSettings:
    """Applies a partial update to user settings."""
    settings_obj = await get_user_settings(db, user_id)
    
    # Exclude unset fields so we only update what the client actually sent
    update_data = data.model_dump(exclude_unset=True)
    
    for key, value in update_data.items():
        setattr(settings_obj, key, value)
        
    await db.commit()
    await db.refresh(settings_obj)
    
    return settings_obj