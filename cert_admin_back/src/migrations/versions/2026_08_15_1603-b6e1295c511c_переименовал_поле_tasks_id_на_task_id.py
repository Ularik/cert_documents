"""переименовал поле tasks_id на task_id

Revision ID: b6e1295c511c
Revises: a6d4504ef00e
Create Date: 2026-08-15 16:03:57.470717

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b6e1295c511c'
down_revision: Union[str, Sequence[str], None] = 'a6d4504ef00e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.alter_column('users_tasks', 'tasks_id', new_column_name='task_id')
    op.drop_constraint(op.f('users_tasks_tasks_id_fkey'), 'users_tasks', type_='foreignkey')
    op.create_foreign_key(None, 'users_tasks', 'tasks', ['task_id'], ['id'], ondelete='CASCADE')


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint(None, 'users_tasks', type_='foreignkey')
    op.alter_column('users_tasks', 'task_id', new_column_name='tasks_id')
    op.create_foreign_key(op.f('users_tasks_tasks_id_fkey'), 'users_tasks', 'tasks', ['tasks_id'], ['id'], ondelete='CASCADE')
