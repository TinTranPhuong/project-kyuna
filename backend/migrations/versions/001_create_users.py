"""create_users

Revision ID: 001_create_users
Revises: 
Create Date: 2026-02-26 14:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '001_create_users'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # 1. Users Table
    op.create_table(
        'users',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('username', sa.String(length=100), nullable=False),
        sa.Column('hashed_password', sa.String(length=255), nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default=sa.text('1'), nullable=False),
        sa.Column('is_verified', sa.Boolean(), server_default=sa.text('0'), nullable=False),
        sa.Column('avatar_url', sa.String(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_username'), 'users', ['username'], unique=True)

    # 2. User Settings Table
    op.create_table(
        'user_settings',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('theme', sa.String(length=50), server_default='night-garden', nullable=True),
        sa.Column('font_size', sa.Integer(), server_default='14', nullable=True),
        sa.Column('music_url', sa.Text(), server_default='https://www.youtube.com/watch?v=jfKfPfyJRdk', nullable=True),
        sa.Column('preferred_chat_model', sa.String(length=255), nullable=True),
        sa.Column('preferred_vision_model', sa.String(length=255), nullable=True),
        sa.Column('pomodoro_work_minutes', sa.Integer(), server_default='25', nullable=True),
        sa.Column('pomodoro_short_break', sa.Integer(), server_default='5', nullable=True),
        sa.Column('pomodoro_long_break', sa.Integer(), server_default='15', nullable=True),
        sa.Column('auto_start_breaks', sa.Boolean(), server_default=sa.text('0'), nullable=True),
        sa.Column('notification_sound', sa.Boolean(), server_default=sa.text('1'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', name='uq_user_settings_user_id')
    )

def downgrade() -> None:
    op.drop_table('user_settings')
    op.drop_index(op.f('ix_users_username'), table_name='users')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('users')