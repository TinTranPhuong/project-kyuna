from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler
from app.core.limiter import limiter

from app.core.config import settings
from app.core.database import engine
from app.routers import auth, users, sessions, chat, translator, notes, dashboard


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ───────────────────────────────────────────────────────────────
    # Schema is fully managed by Alembic migrations.
    # NEVER call Base.metadata.create_all here in production.
    # Before starting: run  →  alembic upgrade head
    Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)

    yield

    # ── Shutdown ──────────────────────────────────────────────────────────────
    await engine.dispose()


app = FastAPI(
    title="Kyuna API",
    version="1.0.0",
    docs_url="/docs" if settings.ENVIRONMENT == "development" else None,
    redoc_url=None,
    lifespan=lifespan,
)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router,       prefix="/api/v1/auth",      tags=["auth"])
app.include_router(users.router,      prefix="/api/v1/users",     tags=["users"])
app.include_router(sessions.router,   prefix="/api/v1/sessions",  tags=["sessions"])
app.include_router(chat.router,       prefix="/api/v1/chat",      tags=["chat"])
app.include_router(translator.router,  prefix="/api/v1/translate",  tags=["translator"])
app.include_router(notes.router,       prefix="/api/v1/notes",      tags=["notes"])
app.include_router(dashboard.router,   prefix="/api/v1/dashboard",  tags=["dashboard"])


@app.get("/health")
async def health_check():
    return {"status": "ok", "version": "1.0.0"}