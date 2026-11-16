"""Флаг: начальник отдела может работать как заместитель начальника управления

Revision ID: a7e1b5c4d638
Revises: f6d0a4b3c527
Create Date: 2026-11-16 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "a7e1b5c4d638"
down_revision: Union[str, Sequence[str], None] = "f6d0a4b3c527"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "can_act_as_management_head",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
            comment="Начальник отдела может переключаться в режим заместителя начальника управления",
        ),
    )


def downgrade() -> None:
    op.drop_column("users", "can_act_as_management_head")
