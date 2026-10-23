from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from src.schemas.departments import DepartmentLiteOutSchema
from src.schemas.users import UserOutSchema


class ManagementRequestSchema(BaseModel):
    title: str = Field(description="Название управления")
    description: str | None = Field(default=None, description="Описание управления")
    head_id: int | None = Field(default=None, description="ID начальника управления")


class ManagementCreateUpdateSchema(BaseModel):
    title: str
    description: str | None = None


class ManagementOutSchema(BaseModel):
    id: int
    title: str
    description: str | None = None
    created_at: datetime
    updated_at: datetime
    head: UserOutSchema | None = None
    departments: list[DepartmentLiteOutSchema] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)
