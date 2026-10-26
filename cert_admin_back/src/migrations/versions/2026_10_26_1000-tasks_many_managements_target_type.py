"""Tasks: many managements and explicit target type

Revision ID: b9c2e5a71d34
Revises: d4f8b7c9a621
Create Date: 2026-10-26 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "b9c2e5a71d34"
down_revision: Union[str, Sequence[str], None] = "d4f8b7c9a621"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

target_type_enum = postgresql.ENUM(
    "MANAGEMENTS", "DEPARTMENTS", "EXECUTORS", name="tasktargettype", create_type=False
)


def upgrade() -> None:
    op.create_table(
        "managements_tasks",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("management_id", sa.Integer(), nullable=False),
        sa.Column("task_id", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("timezone('Asia/Bishkek', now())"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("timezone('Asia/Bishkek', now())"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["management_id"], ["managements.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["task_id"], ["tasks.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("management_id", "task_id", name="uq_managements_tasks_management_id_task_id"),
    )
    op.create_index("ix_managements_tasks_task_id", "managements_tasks", ["task_id"])

    op.execute(
        """
        INSERT INTO managements_tasks (management_id, task_id)
        SELECT management_id, id FROM tasks
        """
    )
    op.execute(
        """
        INSERT INTO managements_tasks (management_id, task_id)
        SELECT DISTINCT departments.management_id, departments_tasks.task_id
        FROM departments_tasks
        JOIN departments ON departments.id = departments_tasks.department_id
        ON CONFLICT DO NOTHING
        """
    )

    target_type_enum.create(op.get_bind(), checkfirst=True)
    op.add_column(
        "tasks",
        sa.Column("target_type", target_type_enum, server_default="EXECUTORS", nullable=False),
    )
    op.execute(
        """
        UPDATE tasks
        SET target_type = CASE
            WHEN EXISTS (SELECT 1 FROM users_tasks WHERE users_tasks.task_id = tasks.id)
                THEN 'EXECUTORS'::tasktargettype
            WHEN EXISTS (SELECT 1 FROM departments_tasks WHERE departments_tasks.task_id = tasks.id)
                THEN 'DEPARTMENTS'::tasktargettype
            ELSE 'MANAGEMENTS'::tasktargettype
        END
        """
    )

    op.drop_index("ix_tasks_management_id", table_name="tasks")
    op.drop_constraint("fk_tasks_management_id_managements", "tasks", type_="foreignkey")
    op.drop_column("tasks", "management_id")


def downgrade() -> None:
    op.add_column("tasks", sa.Column("management_id", sa.Integer(), nullable=True))
    op.execute(
        """
        UPDATE tasks
        SET management_id = (
            SELECT MIN(management_id) FROM managements_tasks WHERE managements_tasks.task_id = tasks.id
        )
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

    op.drop_column("tasks", "target_type")
    target_type_enum.drop(op.get_bind(), checkfirst=True)
    op.drop_index("ix_managements_tasks_task_id", table_name="managements_tasks")
    op.drop_table("managements_tasks")
