from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from app.models.user import User
from app.models.session import UserSettings
from app.schemas.auth import RegisterRequest
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token


async def register_user(db: AsyncSession, data: RegisterRequest) -> dict:
    """Registers a new user, provisions settings, and issues tokens."""
    # Check if email or username already exists
    stmt = select(User).where(
        or_(User.email == data.email, User.username == data.username)
    )
    result = await db.execute(stmt)
    existing_user = result.scalar_one_or_none()
    
    if existing_user:
        if existing_user.email == data.email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="Email already registered"
            )
        if existing_user.username == data.username:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="Username taken"
            )

    # Hash password
    hashed_pw = hash_password(data.password)

    # Create User ORM object
    new_user = User(
        email=data.email,
        username=data.username,
        hashed_password=hashed_pw
    )
    db.add(new_user)
    await db.flush()    

    # Create UserSettings with defaults
    new_settings = UserSettings(user_id=new_user.id)
    db.add(new_settings)
    
    await db.commit()
    await db.refresh(new_user)

    # Create tokens
    access_token = create_access_token({"sub": str(new_user.id)})
    refresh_token = create_refresh_token({"sub": str(new_user.id)})

    # Return payload mapping to TokenResponse schema
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": new_user
    }


async def authenticate_user(db: AsyncSession, email: str, password: str) -> dict:
    """Authenticates a user and issues tokens."""
    # Query user by email
    stmt = select(User).where(User.email == email)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    # Verify existence and password
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Invalid credentials"
        )

    # Check active status
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Account disabled"
        )

    # Create and return tokens
    access_token = create_access_token({"sub": str(user.id)})
    refresh_token = create_refresh_token({"sub": str(user.id)})

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": user
    }