import json
from datetime import datetime
from typing import Any, List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class UpdateProfileRequest(BaseModel):
    username: Optional[str] = Field(None, min_length=3, max_length=20, pattern=r"^[a-zA-Z0-9_]+$")


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)

    @field_validator("new_password")
    @classmethod
    def validate_password_complexity(cls, v: str) -> str:
        if not any(char.isdigit() for char in v):
            raise ValueError("Password must contain at least one digit")
        if not any(char.isalpha() for char in v):
            raise ValueError("Password must contain at least one letter")
        return v


class UserSettingsResponse(BaseModel):
    id: UUID
    user_id: UUID

    # Appearance
    theme: str
    font_size: int
    custom_wallpaper: Optional[str] = None

    # Music
    music_url: str
    # Stored as JSON text in DB — deserialized to list here
    music_groups: Optional[List[Any]] = None

    # AI models
    preferred_chat_model: Optional[str] = None
    preferred_vision_model: Optional[str] = None

    # Pomodoro
    pomodoro_work_minutes: int
    pomodoro_short_break: int
    pomodoro_long_break: int
    auto_start_breaks: bool
    notification_sound: bool

    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @field_validator("music_groups", mode="before")
    @classmethod
    def parse_music_groups(cls, v: Any) -> Optional[List]:
        """Deserialize JSON text from DB into a Python list."""
        if v is None:
            return None
        if isinstance(v, str):
            try:
                return json.loads(v)
            except (json.JSONDecodeError, ValueError):
                return None
        return v


class UpdateSettingsRequest(BaseModel):
    theme: Optional[str] = None
    font_size: Optional[int] = None
    custom_wallpaper: Optional[str] = None   # base64 data URL or hosted URL
    music_url: Optional[str] = None
    music_groups: Optional[List[Any]] = None  # serialized to JSON text in service
    preferred_chat_model: Optional[str] = None
    preferred_vision_model: Optional[str] = None
    pomodoro_work_minutes: Optional[int] = None
    pomodoro_short_break: Optional[int] = None
    pomodoro_long_break: Optional[int] = None
    auto_start_breaks: Optional[bool] = None
    notification_sound: Optional[bool] = None