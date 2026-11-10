"""Таблица логов

Revision ID: e5c9f3a2b416
Revises: d4b8e2f1a305
Create Date: 2026-11-10 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "e5c9f3a2b416"
down_revision: Union[str, Sequence[str], None] = "d4b8e2f1a305"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "logs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("timezone('Asia/Bishkek', now())"),
            nullable=False,
        ),
        sa.Column("level", sa.String(length=16), nullable=False),
        sa.Column("logger", sa.String(length=100), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("ip_address", sa.String(length=64), nullable=True),
        sa.Column("user_agent", sa.String(length=512), nullable=True),
        sa.Column("data", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_logs_created_at"), "logs", ["created_at"], unique=False)
    op.create_index(op.f("ix_logs_level"), "logs", ["level"], unique=False)
    op.create_index(op.f("ix_logs_logger"), "logs", ["logger"], unique=False)
    op.create_index(op.f("ix_logs_user_id"), "logs", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_logs_user_id"), table_name="logs")
    op.drop_index(op.f("ix_logs_logger"), table_name="logs")
    op.drop_index(op.f("ix_logs_level"), table_name="logs")
    op.drop_index(op.f("ix_logs_created_at"), table_name="logs")
    op.drop_table("logs")
