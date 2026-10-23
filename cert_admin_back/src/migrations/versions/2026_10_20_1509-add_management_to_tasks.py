"""Add management scope to tasks

Revision ID: a3e81c7d5f42
Revises: d7a4e9b13c62
Create Date: 2026-10-20 15:09:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "a3e81c7d5f42"
down_revision: Union[str, Sequence[str], None] = "d7a4e9b13c62"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("tasks", sa.Column("management_id", sa.Integer(), nullable=True))

    op.execute(
        """
        UPDATE tasks
        SET management_id = (
            SELECT MIN(departments.management_id)
            FROM departments_tasks
            JOIN departments ON departments.id = departments_tasks.department_id
            WHERE departments_tasks.task_id = tasks.id
        )
        WHERE management_id IS NULL
        """
    )
    op.execute(
        """
        INSERT INTO managements (title, description)
        SELECT 'Не распределено', 'Управление для ранее созданных задач'
        WHERE EXISTS (SELECT 1 FROM tasks WHERE management_id IS NULL)
          AND NOT EXISTS (SELECT 1 FROM managements WHERE title = 'Не распределено')
        """
    )
    op.execute(
        """
        UPDATE tasks
        SET management_id = (
            SELECT id FROM managements WHERE title = 'Не распределено'
        )
        WHERE management_id IS NULL
        """
    )
    op.alter_column("tasks", "management_id", nullable=False)
    op.create_foreign_key(
        "fk_tasks_management_id_managements",
        "tasks",
        "managements",
        ["management_id"],
        ["id"],
        ondelete="RESTRICT",
    )
    op.create_index("ix_tasks_management_id", "tasks", ["management_id"])


def downgrade() -> None:
    op.drop_index("ix_tasks_management_id", table_name="tasks")
    op.drop_constraint(
        "fk_tasks_management_id_managements",
        "tasks",
        type_="foreignkey",
    )
    op.drop_column("tasks", "management_id")
