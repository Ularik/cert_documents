from src.schemas.notifications import NotificationOutSchema
from src.services.base import BaseService


class NotificationsService(BaseService):
    async def get_notifications(
        self,
        user_id: int,
        unread_only: bool = False,
        limit: int = 20,
    ) -> list[NotificationOutSchema]:
        return await self.db.notifications.get_user_notifications(
            user_id=user_id, unread_only=unread_only, limit=limit,
        )

    async def mark_read(self, user_id: int, ids: list[int] | None = None) -> None:
        # отмечаются только свои уведомления: чужие id просто не совпадут по user_id
        await self.db.notifications.mark_read(user_id=user_id, ids=ids)
        await self.db.save()
