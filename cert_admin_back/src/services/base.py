from src.db_manager.db_manager import DbManager
from src.exceptions.exceptions import TaskNotFoundException
from src.models.users import MANAGEMENT_SCOPED_STATUSES
from src.schemas.users import UserOutSchema

class BaseService:
    def __init__(self, db: DbManager):
        self.db = db

    async def get_user_management_id(self, user: UserOutSchema) -> int | None:
        if user.management_id is not None:
            return user.management_id
        if user.department_id is None:
            return None

        departments = await self.db.departments.get_departments(id=user.department_id)
        return departments[0].management_id if departments else None

    async def check_task_management_scope(self, task_id: int, actor_id: int) -> None:
        """Сотрудники и начальники управлений видят только задачи своего управления."""
        actor = await self.db.users.get_one(id=actor_id)
        if actor.status not in MANAGEMENT_SCOPED_STATUSES:
            return

        management_id = await self.get_user_management_id(actor)
        task_management_ids = await self.db.task_managements.get_management_ids(task_id)
        if management_id not in task_management_ids:
            raise TaskNotFoundException
