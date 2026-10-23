from asyncpg import ForeignKeyViolationError
from sqlalchemy import select, and_
from sqlalchemy.exc import IntegrityError

from src.models.users import Users
from src.exceptions.exceptions import ObjectNotFoundException
from src.models.departments_tasks import DepartmentsTasks
from src.schemas.departments_tasks import DepartmentsConnectTaskSchema
from src.repositories.base import BaseRepository
from sqlalchemy.dialects.postgresql import insert as pg_insert


class DepartmentsTasksRepository(BaseRepository):
    model = DepartmentsTasks
    schema = DepartmentsConnectTaskSchema

    async def connect_departments_to_task(self, task_id: int, departments_ids: list[int]) -> None:
        if not departments_ids:
            return

        tasks_departments_data_list = [
            self.schema(department_id=dep_id, task_id=task_id)
            for dep_id in departments_ids
        ]
        query = (
            pg_insert(self.model)
            .values([item.model_dump() for item in tasks_departments_data_list])
            .on_conflict_do_nothing(index_elements=["task_id", "department_id"])
        )
        print(query.compile(compile_kwargs={"literal_binds": True}))
        try:
            await self.session.execute(query)
        except IntegrityError as err:
            if isinstance(err.orig.__cause__, ForeignKeyViolationError):
                raise ObjectNotFoundException from err
            else:
                raise err
        filter_for_delete = and_(
            self.model.task_id == task_id,
            self.model.department_id.not_in(departments_ids)
        )
        await self.delete_bulk(filter_for_delete)


    async def same_department(self, user_id: int, task_id: int) -> bool:
        subq = (
            select(self.model.id)
            .join(Users, Users.department_id == self.model.department_id)
            .where(Users.id == user_id, self.model.task_id == task_id)
        )
        result = await self.session.execute(select(subq.exists()))
        return bool(result.scalar())


    async def get_tasks_departments_ids(self, task_id: int) -> list[int]:
        query = (
            select(DepartmentsTasks.department_id)
            .where(DepartmentsTasks.task_id == task_id)
        )
        result = await self.session.execute(query)
        department_ids: list[int] = list(result.scalars().all())
        return department_ids