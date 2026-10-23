"""Add management roles to users

Revision ID: c8b1d4e6f209
Revises: 656d2cc537e8
Create Date: 2026-10-20 14:37:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "c8b1d4e6f209"
down_revision: Union[str, Sequence[str], None] = "656d2cc537e8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE userstatus ADD VALUE IF NOT EXISTS 'DIVISION_HEAD'")
        op.execute("ALTER TYPE userstatus ADD VALUE IF NOT EXISTS 'MANAGEMENT_HEAD'")


def downgrade() -> None:
    pass
