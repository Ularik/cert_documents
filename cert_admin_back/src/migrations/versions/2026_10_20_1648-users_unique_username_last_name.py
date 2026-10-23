"""Make user names unique together with last names

Revision ID: d4f8b7c9a621
Revises: f6b21d8a940c
Create Date: 2026-10-20 16:48:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "d4f8b7c9a621"
down_revision: Union[str, Sequence[str], None] = "f6b21d8a940c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint("users_username_key", "users", type_="unique")
    op.create_unique_constraint(
        "uq_users_username_last_name",
        "users",
        ["username", "last_name"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_users_username_last_name",
        "users",
        type_="unique",
    )
    op.create_unique_constraint("users_username_key", "users", ["username"])
