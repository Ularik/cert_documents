"""Add managements and assign departments to them

Revision ID: d7a4e9b13c62
Revises: c8b1d4e6f209
Create Date: 2026-10-20 14:53:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "d7a4e9b13c62"
down_revision: Union[str, Sequence[str], None] = "c8b1d4e6f209"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "managements",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("title", sa.String(length=100), nullable=False, unique=True),
        sa.Column("description", sa.String(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.add_column(
        "departments",
        sa.Column("management_id", sa.Integer(), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("management_id", sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        "fk_departments_management_id_managements",
        "departments",
        "managements",
        ["management_id"],
        ["id"],
        ondelete="RESTRICT",
    )
    op.create_foreign_key(
        "fk_users_management_id_managements",
        "users",
        "managements",
        ["management_id"],
        ["id"],
        ondelete="SET NULL",
    )

    op.execute(
        """
        INSERT INTO managements (title, description)
        SELECT 'Не распределено', 'Управление для ранее созданных отделов'
        WHERE EXISTS (SELECT 1 FROM departments)
        """
    )
    op.execute(
        """
        UPDATE departments
        SET management_id = (
            SELECT id FROM managements WHERE title = 'Не распределено'
        )
        WHERE management_id IS NULL
        """
    )
    op.alter_column("departments", "management_id", nullable=False)
    op.create_index(
        "ix_departments_management_id",
        "departments",
        ["management_id"],
    )
    op.create_index(
        "ix_users_management_id",
        "users",
        ["management_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_users_management_id", table_name="users")
    op.drop_index("ix_departments_management_id", table_name="departments")
    op.drop_constraint(
        "fk_users_management_id_managements",
        "users",
        type_="foreignkey",
    )
    op.drop_constraint(
        "fk_departments_management_id_managements",
        "departments",
        type_="foreignkey",
    )
    op.drop_column("users", "management_id")
    op.drop_column("departments", "management_id")
    op.drop_table("managements")
