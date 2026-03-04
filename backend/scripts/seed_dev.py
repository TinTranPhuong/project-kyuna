"""
seed_dev.py — Populate the database with development test data.

Run from the backend/ directory:
    python scripts/seed_dev.py

Idempotent: safe to run multiple times — deletes dev user first then re-creates.
WARNING: Development only. Never run against production.

Credentials created:
    Email:    dev@kyuna.local
    Password: devpassword123
"""

import asyncio
import uuid
import os
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from app.models.user import User
from app.models.session import UserSettings, PomodoroSession
from app.models.chat import ChatConversation, ChatMessage
from app.models.translator import TranslationJob, TranslationPage
from app.core.security import hash_password

DATABASE_URL = os.environ["DATABASE_URL"]
engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)


async def seed() -> None:
    async with AsyncSessionLocal() as db:

        # ── 1. Wipe previous dev seed (idempotent) ────────────────────────────
        await db.execute(text("DELETE FROM users WHERE email = 'dev@kyuna.local'"))
        await db.commit()

        # ── 2. User ───────────────────────────────────────────────────────────
        user = User(
            id=uuid.uuid4(),
            email="dev@kyuna.local",
            username="kyuna_dev",
            hashed_password=hash_password("devpassword123"),
            is_active=True,
            is_verified=True,
        )
        db.add(user)
        await db.flush()

        # ── 3. Settings ───────────────────────────────────────────────────────
        db.add(UserSettings(
            user_id=user.id,
            theme="night-garden",
            font_size=14,
            pomodoro_work_minutes=25,
            pomodoro_short_break=5,
            pomodoro_long_break=15,
        ))

        # ── 4. Pomodoro sessions ──────────────────────────────────────────────
        now = datetime.now(timezone.utc)
        for i in range(3):
            db.add(PomodoroSession(
                user_id=user.id,
                session_type="work",
                duration_minutes=25,
                completed=True,
                started_at=now,
                completed_at=now,
                notes=f"Dev seed session {i + 1}",
            ))

        # ── 5. Chat conversation + messages ───────────────────────────────────
        convo = ChatConversation(
            user_id=user.id,
            title="Dev Test Conversation",
            model_used="Qwen3.5-35B-A3B-UD-IQ3_S.gguf",
            message_count=2,
        )
        db.add(convo)
        await db.flush()

        db.add(ChatMessage(
            conversation_id=convo.id,
            role="user",
            content="Hello Kyuna, this is a dev seed message.",
        ))
        db.add(ChatMessage(
            conversation_id=convo.id,
            role="assistant",
            content="Hello! I am Kyuna. Dev seed loaded successfully.",
            model_used="Qwen3.5-35B-A3B-UD-IQ3_S.gguf",
        ))

        # ── 6. Translation job + pages ────────────────────────────────────────
        job = TranslationJob(
            user_id=user.id,
            original_filename="sample_manga.cbz",
            file_path="./uploads/sample_manga.cbz",
            file_size_bytes=1_024_000,
            status="completed",
            engine="pipeline",
            source_language="ja",
            target_language="en",
            page_count=2,
        )
        db.add(job)
        await db.flush()

        for page_num in range(1, 3):
            db.add(TranslationPage(
                job_id=job.id,
                page_number=page_num,
                original_path=f"./uploads/{job.id}/original/page_{page_num:03d}.jpg",
                processing_status="done",
                phase_status="done",
                has_text=True,
                regions_json='[{"index":0,"bbox":[10,10,100,50],"japanese":"こんにちは","english":"Hello"}]',
            ))

        await db.commit()

    print("\n Seed complete.")
    print(f"    User:     dev@kyuna.local")
    print(f"    Password: devpassword123")


if __name__ == "__main__":
    asyncio.run(seed())