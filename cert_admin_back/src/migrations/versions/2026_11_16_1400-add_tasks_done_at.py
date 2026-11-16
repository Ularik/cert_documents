"""Когда и кем задача выполнена (для отчётов отделов)

Revision ID: c9a3d7e6f85a
Revises: b8f2c6d5e749
Create Date: 2026-11-16 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c9a3d7e6f85a"
down_revision: Union[str, Sequence[str], None] = "b8f2c6d5e749"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "tasks",
        sa.Column("done_at", sa.DateTime(timezone=True), nullable=True, comment="Когда задачу перевели в DONE"),
    )
    op.add_column(
        "tasks",
        sa.Column(
            "done_by_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="SET NULL", name="fk_tasks_done_by_id_users"),
            nullable=True,
            comment="Кто перевёл задачу в DONE",
        ),
    )
    op.create_index("ix_tasks_done_at", "tasks", ["done_at"])

    # Уже выполненные задачи: берём последнюю смену статуса на DONE из журнала,
    # а если записи нет (задача старше журнала) — время последнего изменения задачи.
    op.execute("""
        UPDATE tasks AS t
        SET done_at = l.created_at,
            done_by_id = CASE WHEN EXISTS (SELECT 1 FROM users u WHERE u.id = l.user_id) THEN l.user_id END
        FROM (
            SELECT DISTINCT ON ((data->>'task_id')::int)
                   (data->>'task_id')::int AS task_id, created_at, user_id
            FROM logs
            WHERE logger = 'app.tasks'
              AND data->'status'->>'new' = 'DONE'
              AND data->>'task_id' ~ '^[0-9]+$'
            ORDER BY (data->>'task_id')::int, created_at DESC
        ) AS l
        WHERE t.id = l.task_id AND t.status = 'DONE'
    """)
    op.execute("UPDATE tasks SET done_at = updated_at WHERE status = 'DONE' AND done_at IS NULL")


def downgrade() -> None:
    op.drop_index("ix_tasks_done_at", table_name="tasks")
    op.drop_constraint("fk_tasks_done_by_id_users", "tasks", type_="foreignkey")
    op.drop_column("tasks", "done_by_id")
    op.drop_column("tasks", "done_at")
