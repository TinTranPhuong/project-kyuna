from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.security import decode_token
from app.core.database import get_db
from app.models.user import User

import uuid
from fastapi import Depends, HTTPException, status

# This tells FastAPI where the client should go to get a token
# (Used for the built-in Swagger UI authorization button)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    Dependency to get the current authenticated user from a JWT access token.
    Used to protect routes and inject the user object.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # 1. Decode token
    payload = decode_token(token)
    
    # 2. Check if token is valid
    if payload is None:
        raise credentials_exception
        
    # 3. Verify token type is strictly an access token
    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type. Expected access token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    # 4. Extract user ID
    user_id_str: str = payload.get("sub")
    if user_id_str is None:
        raise credentials_exception
        
    try:
        # Convert the string from the token back into a proper UUID object
        user_id = uuid.UUID(user_id_str)
    except ValueError:
        # If the token has a malformed UUID, reject it
        raise credentials_exception
        
    # 5. Query user from DB (now using the UUID object)
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    
    # 6. Check if user exists and is active
    if user is None or not user.is_active:
        raise credentials_exception
        
    # 7. Return user object
    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Extra check for active status — use this in highly sensitive endpoints.
    Note: get_current_user already filters out inactive users, but having this 
    explicit check provides an extra layer of defense and a specific 403 error.
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Account is disabled"
        )
    return current_user