from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from src.schemas.tasks import BISHKEK_TZ


def _with_bishkek_tz(value: datetime | None) -> datetime | None:
    # срок без часового пояса считаем временем Бишкека, как у задач
    if value is not None and value.tzinfo is None:
        return value.replace(tzinfo=BISHKEK_TZ)
    return value


class NoteRequestSchema(BaseModel):
    """Тело запроса на создание/правку заметки."""
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    deadlines: datetime

    @field_validator("title")
    @classmethod
    def strip_title(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Название заметки не может быть пустым")
        return value

    @field_validator("description")
    @classmethod
    def empty_description_is_none(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return value.strip() or None

    @field_validator("deadlines")
    @classmethod
    def deadline_with_timezone(cls, value: datetime) -> datetime:
        return _with_bishkek_tz(value)


class NoteAddSchema(NoteRequestSchema):
    user_id: int


class NoteOutSchema(BaseModel):
    id: int
    user_id: int
    title: str
    description: str | None = None
    deadlines: datetime
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True, extra="ignore")
