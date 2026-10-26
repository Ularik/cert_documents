from asyncpg import ForeignKeyViolationError
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.dialects.postgresql import insert as pg_insert

from src.exceptions.exceptions import ObjectNotFoundException
from src.models.managements_tasks import ManagementsTasks
from src.repositories.base import BaseRepository
from src.schemas.managements_tasks import ManagementsConnectTaskSchema


class ManagementsTasksRepository(BaseRepository):
    model = ManagementsTasks
    schema = ManagementsConnectTaskSchema

    async def set_managements_to_task(self, task_id: int, management_ids: list[int]) -> None:
        """Приводит список управлений задачи к переданному: недостающие добавляет, лишние удаляет."""
        await self.delete_bulk(
            self.model.management_id.not_in(management_ids),
            task_id=task_id,
        )
        if not management_ids:
            return

        query = (
            pg_insert(self.model)
            .values([
                self.schema(management_id=management_id, task_id=task_id).model_dump()
                for management_id in management_ids
            ])
            .on_conflict_do_nothing(index_elements=["task_id", "management_id"])
        )
        try:
            await self.session.execute(query)
        except IntegrityError as err:
            if isinstance(err.orig.__cause__, ForeignKeyViolationError):
                raise ObjectNotFoundException from err
            raise

    async def get_management_ids(self, task_id: int) -> list[int]:
        query = select(self.model.management_id).where(self.model.task_id == task_id)
        result = await self.session.execute(query)
        return list(result.scalars().all())
