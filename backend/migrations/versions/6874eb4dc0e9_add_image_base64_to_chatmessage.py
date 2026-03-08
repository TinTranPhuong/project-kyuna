"""Add image_base64 to ChatMessage

Revision ID: 6874eb4dc0e9
Revises: 9d2fe0ef5566
Create Date: 2026-03-07 17:31:21.370600

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6874eb4dc0e9'
down_revision: Union[str, None] = '9d2fe0ef5566'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('chat_messages', sa.Column('image_base64', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('chat_messages', 'image_base64')
