"""Уведомления сотрудников (назначение исполнителем задачи)

Revision ID: b8f2c6d5e749
Revises: a7e1b5c4d638
Create Date: 2026-11-16 13:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "b8f2c6d5e749"
down_revision: Union[str, Sequence[str], None] = "a7e1b5c4d638"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

notification_kind_enum = postgresql.ENUM("TASK_ASSIGNED", name="notificationkind", create_type=False)


def upgrade() -> None:
    notification_kind_enum.create(op.get_bind(), checkfirst=True)
    op.create_table(
        "notifications",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("task_id", sa.Integer(), sa.ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False),
        sa.Column(
            "author_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
            comment="Кто назначил",
        ),
        sa.Column("kind", notification_kind_enum, nullable=False),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("timezone('Asia/Bishkek', now())"),
            nullable=False,
        ),
    )
    op.create_index("ix_notifications_user_unread", "notifications", ["user_id", "read_at"])


def downgrade() -> None:
    op.drop_index("ix_notifications_user_unread", table_name="notifications")
    op.drop_table("notifications")
    notification_kind_enum.drop(op.get_bind(), checkfirst=True)
