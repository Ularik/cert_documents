from typing import Literal
from datetime import datetime, timedelta, timezone
from pydantic import BaseModel, ConfigDict, Field, field_validator
from fastapi import UploadFile

from src.models.tasks import TaskTargetType
from src.schemas.departments import DepartmentLiteOutSchema
from src.schemas.managements import ManagementLiteOutSchema
from src.schemas.users import UserOutSchema


# Asia/Bishkek: UTC+6 без перехода на летнее время
BISHKEK_TZ = timezone(timedelta(hours=6), "Asia/Bishkek")


class TaskDocumentAddSchema(BaseModel):
    file: UploadFile
    task_id: int


class DocumentLiteSchema(BaseModel):
    id: int
    filename: str
    model_config = ConfigDict(from_attributes=True, extra="ignore")


class DocumentOutSchema(DocumentLiteSchema):
    mime_type: str
    file_data: bytes


class TaskUpdateSchema(BaseModel):
    """Поля, которые меняются при правке задачи. Автор не входит: его меняет только создание."""
    title: str
    description: str | None = None
    deadlines: datetime | None = None
    note: str | None
    target_type: TaskTargetType
    model_config = ConfigDict(from_attributes=True, extra="ignore")

    @field_validator("deadlines")
    @classmethod
    def deadline_with_timezone(cls, value: datetime | None) -> datetime | None:
        # срок без часового пояса считаем временем Бишкека
        if value is not None and value.tzinfo is None:
            return value.replace(tzinfo=BISHKEK_TZ)
        return value


class TaskCreateUpdateSchema(TaskUpdateSchema):
    author_id: int | None


class TaskPatchStatusSchema(BaseModel):
    status: Literal["NEW", "PROGRESS", "DONE"] = Field(default="PROGRESS")


class TaskLiteOutSchema(TaskCreateUpdateSchema):
    id: int
    status: str
    created_at: datetime
    updated_at: datetime

class TaskOutSchema(TaskCreateUpdateSchema):
    id: int
    status: str
    management_ids: list[int]
    executors: list[int]
    attachments: list[DocumentLiteSchema]
    created_at: datetime
    updated_at: datetime


class TaskFullOutSchema(TaskCreateUpdateSchema):
    id: int
    status: str
    author: UserOutSchema | None = None
    managements: list[ManagementLiteOutSchema]
    departments: list[DepartmentLiteOutSchema]
    executors: list[UserOutSchema]
    attachments: list[DocumentLiteSchema]
    created_at: datetime
    updated_at: datetime
    # заполняется сервисом для текущего пользователя
    can_edit: bool = False
    can_change_status: bool = False

class TaskApiResponseSchema(BaseModel):
    total: int
    items: list[TaskFullOutSchema]


class _IdOnlySchema(BaseModel):
    id: int
    model_config = ConfigDict(from_attributes=True)


class TaskCalendarItemSchema(BaseModel):
    """Краткая задача для календаря на главной панели."""
    id: int
    title: str
    status: str
    deadlines: datetime
    is_expired: bool | None = None
    # заполняется сервисом для текущего пользователя
    can_change_status: bool = False
    # нужны только для проверки прав, в ответ не попадают
    managements: list[_IdOnlySchema] = Field(default_factory=list, exclude=True)
    departments: list[_IdOnlySchema] = Field(default_factory=list, exclude=True)
    executors: list[_IdOnlySchema] = Field(default_factory=list, exclude=True)
    model_config = ConfigDict(from_attributes=True, extra="ignore")
