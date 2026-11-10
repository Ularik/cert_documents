from src.models.users import UserStatus
from src.schemas.logs import LogsApiResponseSchema, LogsQuerySchema
from src.services.base import BaseService


class LogsService(BaseService):
    async def get_logs(self, actor_id: int, params: LogsQuerySchema) -> LogsApiResponseSchema:
        """ADMIN и DIVISION_HEAD видят весь журнал, начальник управления — только своё управление."""
        actor = await self.db.users.get_one(id=actor_id)
        if actor.status != UserStatus.MANAGEMENT_HEAD.value:
            return await self.db.logs.get_logs(params)

        management_id = await self.get_user_management_id(actor)
        if management_id is None:
            return LogsApiResponseSchema(total=0, items=[])
        return await self.db.logs.get_logs(params, management_id=management_id)

    async def get_loggers(self) -> list[str]:
        return await self.db.logs.get_loggers()
