from sqlalchemy import func, insert, select, update

from src.models.notifications import Notifications
from src.models.tasks import Tasks
from src.models.users import Users
from src.repositories.base import BaseRepository
from src.schemas.notifications import NotificationCreateSchema, NotificationOutSchema


class NotificationsRepository(BaseRepository):
    model = Notifications
    schema = NotificationOutSchema

    async def add_task_assigned(self, task_id: int, user_ids: list[int], author_id: int | None) -> None:
        """Уведомить назначенных исполнителей; автор сам себе уведомление не получает."""
        rows = [
            NotificationCreateSchema(user_id=user_id, task_id=task_id, author_id=author_id).model_dump()
            for user_id in dict.fromkeys(user_ids)
            if user_id != author_id
        ]
        if rows:
            await self.session.execute(insert(Notifications), rows)

    async def get_user_notifications(
        self,
        user_id: int,
        unread_only: bool,
        limit: int,
    ) -> list[NotificationOutSchema]:
        author_name = func.concat_ws(" ", Users.last_name, Users.username)
        query = (
            select(
                Notifications.id,
                Notifications.kind,
                Notifications.task_id,
                Tasks.title.label("task_title"),
                Tasks.deadlines.label("task_deadlines"),
                Notifications.author_id,
                author_name.label("author_name"),
                Notifications.read_at,
                Notifications.created_at,
            )
            .join(Tasks, Tasks.id == Notifications.task_id)
            .outerjoin(Users, Users.id == Notifications.author_id)
            .where(Notifications.user_id == user_id)
            .order_by(Notifications.created_at.desc(), Notifications.id.desc())
            .limit(limit)
        )
        if unread_only:
            query = query.where(Notifications.read_at.is_(None))
        result = await self.session.execute(query)
        return [
            NotificationOutSchema.model_validate({**row, "kind": row["kind"].value})
            for row in result.mappings().all()
        ]

    async def mark_read(self, user_id: int, ids: list[int] | None = None) -> None:
        query = (
            update(Notifications)
            .where(Notifications.user_id == user_id, Notifications.read_at.is_(None))
            .values(read_at=func.now())
            .execution_options(synchronize_session=False)
        )
        if ids is not None:
            query = query.where(Notifications.id.in_(ids))
        await self.session.execute(query)
