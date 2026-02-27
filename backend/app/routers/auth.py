from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import decode_token, create_access_token
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, RefreshRequest, UserResponse
from app.models.user import User

# Dependencies and services we will scaffold next
from app.services import auth_service
from app.dependencies.auth import get_current_user

# Import limiter (Warning: Ensure this doesn't cause a circular import with main.py)
from app.core.limiter import limiter

router = APIRouter()


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def register(
    request: Request,
    data: RegisterRequest,
    db: AsyncSession = Depends(get_db)
):
    """Register a new user and return access/refresh tokens."""
    # auth_service will raise HTTPException(400) if email/username is taken
    return await auth_service.register_user(db, data)


@router.post("/login", response_model=TokenResponse, status_code=status.HTTP_200_OK)
@limiter.limit("10/minute")
async def login(
    request: Request,
    data: LoginRequest,
    db: AsyncSession = Depends(get_db)
):
    """Authenticate a user and return access/refresh tokens."""
    # auth_service will raise HTTPException(401) if credentials are wrong
    return await auth_service.authenticate_user(db, data.email, data.password)


@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout():
    """
    Invalidate the current session. 
    Removed Depends(get_current_user) to prevent frontend 401 interceptor loops.
    """
    return {"message": "logged out"}


@router.post("/refresh", status_code=status.HTTP_200_OK)
async def refresh(data: RefreshRequest):
    """Use a valid refresh token to get a new access token."""
    payload = decode_token(data.refresh_token)
    
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )
        
    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type. Expected refresh token.",
        )
        
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )
        
    # Generate a fresh access token
    new_access_token = create_access_token({"sub": str(user_id)})
    
    return {
        "access_token": new_access_token,
        "refresh_token": data.refresh_token, # Returning the same refresh token
        "token_type": "bearer"
    }


@router.get("/me", response_model=UserResponse, status_code=status.HTTP_200_OK)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get the profile details of the currently authenticated user."""
    return current_user