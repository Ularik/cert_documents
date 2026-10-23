"""добавил enum DEPUTY

Revision ID: 1a8efc60eabc
Revises: 6b8edc74fd77
Create Date: 2026-08-21 12:36:28.081501

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1a8efc60eabc'
down_revision: Union[str, Sequence[str], None] = '6b8edc74fd77'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE userstatus ADD VALUE IF NOT EXISTS 'DEPUTY'")


def downgrade() -> None:
    """Downgrade schema."""
    pass
