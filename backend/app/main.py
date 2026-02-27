from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from slowapi import _rate_limit_exceeded_handler
from app.core.limiter import limiter

from app.core.config import settings
from app.core.database import engine, Base
from app.routers import auth, users, sessions, chat, translator

# Lifespan: runs startup/shutdown logic
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create all DB tables
    # Note: In production with Alembic, you might remove this and rely strictly on migrations.
    # For dev scaffolding, this is perfectly fine.
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    # Create upload directory if it doesn't exist
    Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
    
    yield
    
    # Shutdown: close DB connections
    await engine.dispose()


# Rate limiter instance
# limiter = Limiter(key_func=get_remote_address)

# FastAPI application factory
app = FastAPI(
    title="Personal AI Website API",
    version="1.0.0",
    docs_url="/docs" if settings.ENVIRONMENT == "development" else None,
    redoc_url=None,
    lifespan=lifespan,
)

# Rate limiting setup
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all routers with /api/v1 prefix
# Note: These will throw ModuleNotFound errors until we scaffold the router files
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/v1/users", tags=["users"])
app.include_router(sessions.router, prefix="/api/v1/sessions", tags=["sessions"])
app.include_router(chat.router, prefix="/api/v1/chat", tags=["chat"])
app.include_router(translator.router, prefix="/api/v1/translate", tags=["translator"])

@app.get("/health")
async def health_check():
    """Health check endpoint to verify the API is running."""
    return {"status": "ok", "version": "1.0.0"}