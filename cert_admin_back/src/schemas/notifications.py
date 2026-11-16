from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class NotificationCreateSchema(BaseModel):
    user_id: int
    task_id: int
    author_id: int | None = None


class NotificationOutSchema(BaseModel):
    id: int
    kind: str
    task_id: int
    task_title: str
    task_deadlines: datetime | None = None
    author_id: int | None = None
    author_name: str | None = None
    read_at: datetime | None = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class NotificationsReadSchema(BaseModel):
    """ids — отметить прочитанными эти уведомления; не передан — все свои."""
    ids: list[int] | None = Field(default=None, max_length=500)
