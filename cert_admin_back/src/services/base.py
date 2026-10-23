from src.db_manager.db_manager import DbManager
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
