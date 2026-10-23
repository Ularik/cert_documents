"""Make department titles unique within their management

Revision ID: f6b21d8a940c
Revises: a3e81c7d5f42
Create Date: 2026-10-20 16:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "f6b21d8a940c"
down_revision: Union[str, Sequence[str], None] = "a3e81c7d5f42"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint("departments_title_key", "departments", type_="unique")
    op.create_unique_constraint(
        "uq_departments_management_id_title",
        "departments",
        ["management_id", "title"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_departments_management_id_title",
        "departments",
        type_="unique",
    )
    op.create_unique_constraint("departments_title_key", "departments", ["title"])
