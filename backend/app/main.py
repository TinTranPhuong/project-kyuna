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
from app.routers import auth, users, sessions, chat, translator, note, dashboard, memory, documents, agent
from app.services.qdrant_service import qdrant_service

import app.models.user        # noqa: F401
import app.models.session     # noqa: F401  ← UserSettings + PomodoroSession
import app.models.note        # noqa: F401  ← Note
import app.models.chat        # noqa: F401  ← ChatConversation + ChatMessage
import app.models.translator  # noqa: F401  ← TranslationJob + TranslationPage
import app.models.memory      # noqa: F401  ← MemoryFact, UniversalFact, Document, DocChunk, ExtractionJob
import app.models.agent       # noqa: F401  ← Agent models

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Runs once on startup before any request is handled.

    Steps:
      1. Create ALL missing tables from SQLAlchemy models (idempotent).
      2. Add any columns that exist in the model but NOT in the live DB.
      3. Ensure the upload directory exists.
      4. Initialize Qdrant collections (MUST be before yield — was after yield which
         meant it ran on shutdown, never on startup).
    """
    async with engine.begin() as conn:
        # Create any tables that don't exist yet (safe, idempotent).
        await conn.run_sync(Base.metadata.create_all)

        # Add missing columns to user_settings.
        await conn.execute(text(
            "ALTER TABLE user_settings "
            "ADD COLUMN IF NOT EXISTS custom_wallpaper TEXT DEFAULT NULL"
        ))
        await conn.execute(text(
            "ALTER TABLE user_settings "
            "ADD COLUMN IF NOT EXISTS music_groups TEXT DEFAULT NULL"
        ))

    # Ensure the file-upload directory exists.
    Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)

    # Initialize Qdrant collections on startup.
    try:
        await qdrant_service.ensure_collections()
    except Exception as e:
        # Log but don't crash the server — Qdrant offline means memory is disabled.
        print(f"[Startup] Warning: Qdrant unavailable — memory features disabled. {e}")

    yield  

    # Shutdown: dispose the DB connection pool cleanly.
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
app.include_router(agent.router,      prefix="/api/v1/agent",     tags=["agent"])

@app.get("/health")
async def health_check():
    return {"status": "ok", "version": "1.0.0"}