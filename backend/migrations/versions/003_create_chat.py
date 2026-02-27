"""create_chat

Revision ID: 003_create_chat
Revises: 002_create_sessions
Create Date: 2026-02-26 14:02:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '003_create_chat'
down_revision: Union[str, None] = '002_create_sessions'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # 1. Chat Conversations
    op.create_table(
        'chat_conversations',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('title', sa.String(length=255), server_default='New Conversation', nullable=True),
        sa.Column('model_used', sa.String(length=255), nullable=True),
        sa.Column('system_prompt', sa.Text(), nullable=True),
        sa.Column('message_count', sa.Integer(), server_default='0', nullable=True),
        sa.Column('is_archived', sa.Boolean(), server_default=sa.text('0'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_conversations_user_id'), 'chat_conversations', ['user_id'], unique=False)
    op.create_index('ix_conversations_updated', 'chat_conversations', [sa.text('updated_at DESC')], unique=False)

    # 2. Chat Messages
    op.create_table(
        'chat_messages',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('conversation_id', sa.Uuid(), nullable=False),
        sa.Column('role', sa.String(length=20), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('tokens_used', sa.Integer(), nullable=True),
        sa.Column('generation_ms', sa.Integer(), nullable=True),
        sa.Column('model_used', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.CheckConstraint("role IN ('user', 'assistant', 'system')", name='chk_message_role'),
        sa.ForeignKeyConstraint(['conversation_id'], ['chat_conversations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_messages_conversation_id'), 'chat_messages', ['conversation_id'], unique=False)
    op.create_index(op.f('ix_messages_created_at'), 'chat_messages', ['created_at'], unique=False)

def downgrade() -> None:
    op.drop_index(op.f('ix_messages_created_at'), table_name='chat_messages')
    op.drop_index(op.f('ix_messages_conversation_id'), table_name='chat_messages')
    op.drop_table('chat_messages')
    op.drop_index('ix_conversations_updated', table_name='chat_conversations')
    op.drop_index(op.f('ix_conversations_user_id'), table_name='chat_conversations')
    op.drop_table('chat_conversations')