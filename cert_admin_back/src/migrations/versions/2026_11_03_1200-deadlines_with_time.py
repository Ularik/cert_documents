"""Срок задачи с временем: deadlines DATE -> TIMESTAMPTZ

Revision ID: c3a7d1e9f204
Revises: b9c2e5a71d34
Create Date: 2026-11-03 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c3a7d1e9f204"
down_revision: Union[str, Sequence[str], None] = "b9c2e5a71d34"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Раньше срок означал «до конца дня», поэтому старые даты переносим на 23:59 по Бишкеку
    op.alter_column(
        "tasks",
        "deadlines",
        type_=sa.DateTime(timezone=True),
        existing_type=sa.Date(),
        existing_nullable=True,
        postgresql_using="(deadlines + time '23:59') AT TIME ZONE 'Asia/Bishkek'",
    )


def downgrade() -> None:
    op.alter_column(
        "tasks",
        "deadlines",
        type_=sa.Date(),
        existing_type=sa.DateTime(timezone=True),
        existing_nullable=True,
        postgresql_using="(deadlines AT TIME ZONE 'Asia/Bishkek')::date",
    )
