from datetime import datetime, time, timedelta

from sqlalchemy import func, or_, select

from src.models.departments import Departments
from src.models.logs import Logs
from src.models.users import Users
from src.repositories.base import BaseRepository
from src.schemas.logs import LogOutSchema, LogsApiResponseSchema, LogsQuerySchema, LogUserSchema
from src.schemas.tasks import BISHKEK_TZ


class LogsRepository(BaseRepository):
    model = Logs
    schema = LogOutSchema

    async def get_logs(self, params: LogsQuerySchema, management_id: int | None = None) -> LogsApiResponseSchema:
        """Журнал с фильтрами. management_id — показать только действия сотрудников этого управления."""
        filters = []
        if params.logger:
            filters.append(Logs.logger == params.logger)
        if params.level:
            filters.append(Logs.level == params.level.upper())
        if params.user_id is not None:
            filters.append(Logs.user_id == params.user_id)
        if params.search:
            filters.append(Logs.message.ilike(f"%{params.search.strip()}%"))
        # даты фильтра — календарные дни по Бишкеку
        if params.from_date:
            filters.append(Logs.created_at >= datetime.combine(params.from_date, time.min, tzinfo=BISHKEK_TZ))
        if params.to_date:
            filters.append(
                Logs.created_at < datetime.combine(params.to_date + timedelta(days=1), time.min, tzinfo=BISHKEK_TZ)
            )
        if management_id is not None:
            filters.append(or_(
                Users.management_id == management_id,
                Departments.management_id == management_id,
            ))

        base = (
            select(Logs, Users)
            .outerjoin(Users, Users.id == Logs.user_id)
            .outerjoin(Departments, Departments.id == Users.department_id)
            .where(*filters)
        )

        total = await self.session.scalar(select(func.count()).select_from(base.subquery()))
        result = await self.session.execute(
            base.order_by(Logs.created_at.desc(), Logs.id.desc())
            .limit(params.limit)
            .offset(params.offset)
        )

        items = []
        for log, user in result.all():
            item = LogOutSchema.model_validate(log)
            if user is not None:
                item.user = LogUserSchema(
                    id=user.id,
                    username=user.username,
                    last_name=user.last_name,
                    status=user.status.value if hasattr(user.status, "value") else user.status,
                )
            items.append(item)
        return LogsApiResponseSchema(total=total or 0, items=items)

    async def get_loggers(self) -> list[str]:
        result = await self.session.execute(select(Logs.logger).distinct().order_by(Logs.logger))
        return list(result.scalars())
