"""add_wallpaper_column

Revision ID: 1d32ba1b3385
Revises: e2b0b899aa7e
Create Date: 2026-03-04 21:46:34.399988

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1d32ba1b3385'
down_revision: Union[str, None] = 'e2b0b899aa7e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
