"""Время первого входа за сутки у пользователей

Revision ID: f6d0a4b3c527
Revises: e5c9f3a2b416
Create Date: 2026-11-10 13:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "f6d0a4b3c527"
down_revision: Union[str, Sequence[str], None] = "e5c9f3a2b416"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "first_login_at",
            sa.DateTime(timezone=True),
            nullable=True,
            comment="Время первого входа за текущие сутки (по Бишкеку)",
        ),
    )


def downgrade() -> None:
    op.drop_column("users", "first_login_at")
