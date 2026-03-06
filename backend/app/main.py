from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler
from sqlalchemy import text

from app.core.limiter import limiter
from app.core.config import settings
from app.core.database import engine, Base
from app.routers import auth, users, sessions, chat, translator, note, dashboard, memory, documents
from app.services.qdrant_service import qdrant_service

# ── CRITICAL: Import every model so Base.metadata knows about ALL tables.
# Without these imports, Base.metadata.create_all() will silently skip them.
import app.models.user        # noqa: F401
import app.models.session     # noqa: F401  ← UserSettings + PomodoroSession
import app.models.note        # noqa: F401  ← Note
import app.models.chat        # noqa: F401  ← ChatConversation + ChatMessage
import app.models.translator  # noqa: F401  ← TranslationJob + TranslationPage
import app.models.memory      # noqa: F401  <- MemoryFact, UniversalFact, Document, DocChunk, ExtractionJob

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Runs once on startup before any request is handled.

    Steps:
      1. Create ALL missing tables from SQLAlchemy models (idempotent).
      2. Add any columns that exist in the model but NOT in the live DB.
         (create_all only creates tables — it never alters existing ones.)
      3. Ensure the upload directory exists.
    """
    async with engine.begin() as conn:
        # Step 1: Create any tables that don't exist yet (safe, idempotent).
        await conn.run_sync(Base.metadata.create_all)

        # Step 2: Add missing columns to user_settings.
        # These were defined in the SQLAlchemy model AFTER the table was first
        # created, so create_all skipped them. We add them manually here.
        # "ADD COLUMN IF NOT EXISTS" is safe to run every time — it no-ops if
        # the column already exists.
        await conn.execute(text(
            "ALTER TABLE user_settings "
            "ADD COLUMN IF NOT EXISTS custom_wallpaper TEXT DEFAULT NULL"
        ))
        await conn.execute(text(
            "ALTER TABLE user_settings "
            "ADD COLUMN IF NOT EXISTS music_groups TEXT DEFAULT NULL"
        ))

    # Step 3: Ensure the file-upload directory exists.
    Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)

    yield  
    # Add Qdrant initialization 
    await qdrant_service.ensure_collections()
    
    await engine.dispose()

app = FastAPI(
    title="Kyuna API",
    version="1.0.0",
    docs_url="/docs" if settings.ENVIRONMENT == "development" else None,
    redoc_url=None,
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,       prefix="/api/v1/auth",      tags=["auth"])
app.include_router(users.router,      prefix="/api/v1/users",     tags=["users"])
app.include_router(sessions.router,   prefix="/api/v1/sessions",  tags=["sessions"])
app.include_router(chat.router,       prefix="/api/v1/chat",      tags=["chat"])
app.include_router(translator.router, prefix="/api/v1/translate", tags=["translator"])
app.include_router(note.router,       prefix="/api/v1/notes",     tags=["notes"])
app.include_router(dashboard.router,  prefix="/api/v1/dashboard", tags=["dashboard"])
app.include_router(memory.router,     prefix="/api/v1/memory",    tags=["memory"])
app.include_router(documents.router,  prefix="/api/v1/docs",      tags=["documents"])

@app.get("/health")
async def health_check():
    return {"status": "ok", "version": "1.0.0"}