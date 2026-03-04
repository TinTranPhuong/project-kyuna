"""
Alembic async migration environment for Kyuna backend.

Commands:
  alembic upgrade head                          — apply all pending migrations
  alembic revision --autogenerate -m "name"     — generate a new migration
  alembic downgrade -1                          — roll back one step
  alembic current                               — show current DB version
"""

import asyncio
import os
from logging.config import fileConfig
from pathlib import Path

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context

# ── Load .env ─────────────────────────────────────────────────────────────────
# env.py lives at: backend/migrations/env.py
# .env lives at:   backend/.env
from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

# ── Import ALL models (required for autogenerate to detect tables) ─────────────
from app.core.database import Base                                    # noqa: E402
from app.models.user import User                                      # noqa: E402, F401
from app.models.chat import ChatConversation, ChatMessage             # noqa: E402, F401
from app.models.session import PomodoroSession, UserSettings          # noqa: E402, F401
from app.models.translator import TranslationJob, TranslationPage     # noqa: E402, F401

# ── Alembic config ─────────────────────────────────────────────────────────────
config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Inject DATABASE_URL from .env — overrides the placeholder in alembic.ini
config.set_main_option("sqlalchemy.url", os.environ["DATABASE_URL"])

target_metadata = Base.metadata


# ── Offline mode (generate SQL without connecting) ────────────────────────────
def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


# ── Online mode (connect and apply) ──────────────────────────────────────────
def do_run_migrations(connection: Connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()