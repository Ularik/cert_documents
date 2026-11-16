"""Исправление сдвига +6 часов в created_at/updated_at

Дефолт timezone('Asia/Bishkek', now()) возвращал время Бишкека без часового
пояса, и при записи в timestamptz Postgres считал его временем сессии (UTC),
из-за чего все отметки уезжали на +6 часов. Теперь дефолт — now(), а уже
сохранённые значения пересчитываются: «настенное» время в поясе сессии
снова трактуется как время Бишкека. Если сервер БД работает в Asia/Bishkek,
пересчёт ничего не меняет.

Revision ID: d4b8e1f7a926
Revises: c9a3d7e6f85a
Create Date: 2026-11-16 15:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "d4b8e1f7a926"
down_revision: Union[str, Sequence[str], None] = "c9a3d7e6f85a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


COLUMNS: dict[str, tuple[str, ...]] = {
    "departments": ("created_at", "updated_at"),
    "departments_tasks": ("created_at", "updated_at"),
    "logs": ("created_at",),
    "managements": ("created_at", "updated_at"),
    "managements_tasks": ("created_at", "updated_at"),
    "notes": ("created_at", "updated_at"),
    "notifications": ("created_at",),
    "tasks": ("created_at", "updated_at"),
    "task_replies": ("created_at",),
    "users": ("created_at", "updated_at"),
    "users_tasks": ("created_at", "updated_at"),
}

OLD_DEFAULT = "timezone('Asia/Bishkek', now())"


def upgrade() -> None:
    for table, columns in COLUMNS.items():
        for column in columns:
            op.execute(f"ALTER TABLE {table} ALTER COLUMN {column} SET DEFAULT now()")
        assignments = ", ".join(
            f"{column} = timezone('Asia/Bishkek', timezone(current_setting('TimeZone'), {column}))"
            for column in columns
        )
        op.execute(f"UPDATE {table} SET {assignments}")


def downgrade() -> None:
    for table, columns in COLUMNS.items():
        for column in columns:
            op.execute(f"ALTER TABLE {table} ALTER COLUMN {column} SET DEFAULT {OLD_DEFAULT}")
        assignments = ", ".join(
            f"{column} = timezone(current_setting('TimeZone'), timezone('Asia/Bishkek', {column}))"
            for column in columns
        )
        op.execute(f"UPDATE {table} SET {assignments}")
