"""add_performance_indexes

Revision ID: e2b0b899aa7e
Revises: 5514f3c903f4
Create Date: 2026-03-04 19:00:45.171210

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'e2b0b899aa7e'
down_revision: Union[str, None] = '5514f3c903f4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # 1. Conversations: Optimize filtering by archived status and user
    op.create_index("ix_chat_conversations_user_archived", 
                    "chat_conversations", ["user_id", "is_archived"])

    # 2. Messages: Optimize loading history in chronological order
    op.create_index("ix_chat_messages_conversation_created", 
                    "chat_messages", ["conversation_id", "created_at"])

    # 3. Jobs: Optimize status checks for the background processing queue
    op.create_index("ix_translation_jobs_status", 
                    "translation_jobs", ["status"])

    # 4. Jobs: Optimize dashboard queries for user-specific job status
    op.create_index("ix_translation_jobs_user_status", 
                    "translation_jobs", ["user_id", "status"])

    # 5. Pages: Optimize pipeline resumption by job ID and phase
    op.create_index("ix_translation_pages_phase_status", 
                    "translation_pages", ["job_id", "phase_status"])

    # 6. Sessions: Optimize analytics queries for date ranges
    op.create_index("ix_pomodoro_sessions_user_started", 
                    "pomodoro_sessions", ["user_id", "started_at"])


def downgrade() -> None:
    # Clean removal of all performance indexes
    op.drop_index("ix_chat_conversations_user_archived")
    op.drop_index("ix_chat_messages_conversation_created")
    op.drop_index("ix_translation_jobs_status")
    op.drop_index("ix_translation_jobs_user_status")
    op.drop_index("ix_translation_pages_phase_status")
    op.drop_index("ix_pomodoro_sessions_user_started")