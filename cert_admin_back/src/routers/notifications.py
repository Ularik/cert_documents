from fastapi import APIRouter, Query

from src.routers.dependencies import AuthUserDep, DBDep
from src.schemas.notifications import NotificationOutSchema, NotificationsReadSchema
from src.services.notifications_service import NotificationsService


router = APIRouter(prefix="/notifications", tags=["Уведомления"])


@router.get("/")
async def get_notifications(
        db: DBDep,
        user: AuthUserDep,
        unread: bool = False,
        limit: int = Query(20, gt=0, le=100),
) -> list[NotificationOutSchema]:
    """Свои уведомления, новые сначала. unread=true — только непрочитанные."""
    return await NotificationsService(db).get_notifications(
        user_id=user.user_id, unread_only=unread, limit=limit,
    )


@router.post("/read")
async def mark_notifications_read(db: DBDep, user: AuthUserDep, data: NotificationsReadSchema):
    await NotificationsService(db).mark_read(user_id=user.user_id, ids=data.ids)
    return {"status": "ok"}
