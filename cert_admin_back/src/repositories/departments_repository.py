from sqlalchemy import select
from sqlalchemy.orm import joinedload

from src.repositories.base import BaseRepository
from src.models.departments import Departments
from src.models.users import Users, UserStatus
from src.schemas.departments import DepartmentsOutSchema, DepartmentsWithHeadsOutSchema


class DepartmentsRepository(BaseRepository):
    model = Departments
    schema = DepartmentsOutSchema

    async def get_management_ids(self, department_ids: list[int]) -> dict[int, int]:
        if not department_ids:
            return {}
        query = select(Departments.id, Departments.management_id).where(
            Departments.id.in_(department_ids)
        )
        result = await self.session.execute(query)
        return dict(result.all())

    async def get_departments(self, **kwargs) -> list[DepartmentsWithHeadsOutSchema]:
        query = (
            select(self.model)
            .options(
                joinedload(Departments.head),
                joinedload(Departments.deputy_head),
            )
            .filter_by(**kwargs)
        )
        result = await self.session.execute(query)
        return [
            DepartmentsWithHeadsOutSchema.model_validate(dep)
            for dep in result.unique().scalars().all()
        ]
