"""create_translator

Revision ID: 004_create_translator
Revises: 003_create_chat
Create Date: 2026-02-26 14:03:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '004_create_translator'
down_revision: Union[str, None] = '003_create_chat'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # 1. Translation Jobs
    op.create_table(
        'translation_jobs',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('original_filename', sa.String(length=500), nullable=False),
        sa.Column('file_path', sa.String(length=1000), nullable=False),
        sa.Column('file_size_bytes', sa.BigInteger(), nullable=True),
        sa.Column('status', sa.String(length=20), server_default='pending', nullable=False),
        sa.Column('source_language', sa.String(length=10), server_default='auto', nullable=True),
        sa.Column('target_language', sa.String(length=10), server_default='en', nullable=True),
        sa.Column('model_used', sa.String(length=255), nullable=True),
        sa.Column('page_count', sa.Integer(), server_default='0', nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("status IN ('pending', 'processing', 'completed', 'failed')", name='chk_job_status'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_jobs_user_id'), 'translation_jobs', ['user_id'], unique=False)
    op.create_index(op.f('ix_jobs_status'), 'translation_jobs', ['status'], unique=False)

    # 2. Translation Pages
    op.create_table(
        'translation_pages',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('job_id', sa.Uuid(), nullable=False),
        sa.Column('page_number', sa.Integer(), nullable=False),
        sa.Column('original_path', sa.String(length=1000), nullable=False),
        sa.Column('translated_path', sa.String(length=1000), nullable=True),
        sa.Column('ocr_raw_text', sa.Text(), nullable=True),
        sa.Column('translated_text', sa.Text(), nullable=True),
        sa.Column('has_text', sa.Boolean(), server_default=sa.text('0'), nullable=True),
        sa.Column('processing_status', sa.String(length=20), server_default='pending', nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('processing_ms', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.CheckConstraint("processing_status IN ('pending', 'processing', 'done', 'no_text', 'failed')", name='chk_page_status'),
        sa.ForeignKeyConstraint(['job_id'], ['translation_jobs.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('job_id', 'page_number', name='uq_translation_pages_job_id_page_number')
    )
    op.create_index(op.f('ix_pages_job_id'), 'translation_pages', ['job_id'], unique=False)
    op.create_index('ix_pages_job_page', 'translation_pages', ['job_id', 'page_number'], unique=False)

def downgrade() -> None:
    op.drop_index('ix_pages_job_page', table_name='translation_pages')
    op.drop_index(op.f('ix_pages_job_id'), table_name='translation_pages')
    op.drop_table('translation_pages')
    op.drop_index(op.f('ix_jobs_status'), table_name='translation_jobs')
    op.drop_index(op.f('ix_jobs_user_id'), table_name='translation_jobs')
    op.drop_table('translation_jobs')