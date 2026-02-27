"""create_sessions

Revision ID: 002_create_sessions
Revises: 001_create_users
Create Date: 2026-02-26 14:01:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '002_create_sessions'
down_revision: Union[str, None] = '001_create_users'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.create_table(
        'pomodoro_sessions',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('session_type', sa.String(length=20), nullable=False),
        sa.Column('duration_minutes', sa.Integer(), nullable=False),
        sa.Column('completed', sa.Boolean(), server_default=sa.text('0'), nullable=False),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.CheckConstraint("session_type IN ('work', 'short_break', 'long_break')", name='chk_session_type'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_pomodoro_user_id'), 'pomodoro_sessions', ['user_id'], unique=False)
    op.create_index(op.f('ix_pomodoro_started_at'), 'pomodoro_sessions', ['started_at'], unique=False)

def downgrade() -> None:
    op.drop_index(op.f('ix_pomodoro_started_at'), table_name='pomodoro_sessions')
    op.drop_index(op.f('ix_pomodoro_user_id'), table_name='pomodoro_sessions')
    op.drop_table('pomodoro_sessions')