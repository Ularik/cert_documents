from typing import Literal
from datetime import date
from pydantic import BaseModel, ConfigDict, Field
from fastapi import UploadFile
from datetime import datetime

from src.schemas.departments import DepartmentLiteOutSchema
from src.schemas.users import UserOutSchema


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


class TaskCreateUpdateSchema(BaseModel):
    author_id: int
    management_id: int
    title: str
    description: str | None = None
    deadlines: date | None = None
    note: str | None
    model_config = ConfigDict(from_attributes=True, extra="ignore")


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
    executors: list[int]
    attachments: list[DocumentLiteSchema]
    created_at: datetime
    updated_at: datetime


class TaskFullOutSchema(TaskCreateUpdateSchema):
    id: int
    status: str
    author: UserOutSchema
    departments: list[DepartmentLiteOutSchema]
    executors: list[UserOutSchema]
    attachments: list[DocumentLiteSchema]
    created_at: datetime
    updated_at: datetime

class TaskApiResponseSchema(BaseModel):
    total: int
    items: list[TaskFullOutSchema]
