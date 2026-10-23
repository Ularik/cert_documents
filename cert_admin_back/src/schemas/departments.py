from datetime import datetime
from pydantic import BaseModel, Field, model_validator, ConfigDict

from src.schemas.users import UserOutSchema


class DepartmentRequestCreateUpdateSchema(BaseModel):
    title: str = Field(description="Название отдела")
    description: str | None = Field(description="Описание отдела", default=None)
    management_id: int = Field(description="ID управления")
    head_id: int | None = Field(default=None, description="ID руководителя")
    deputy_head_id: int | None = Field(default=None, description="ID заместителя")

    @model_validator(mode="after")
    def validate_head_and_deputy_different(self) -> "DepartmentRequestCreateUpdateSchema":
        if (
            self.head_id is not None
            and self.deputy_head_id is not None
            and self.head_id == self.deputy_head_id
        ):
            raise ValueError(
                "Начальник и заместитель начальника не могут быть одним и тем же человеком."
            )
        return self

class DepartmentCreateUpdateSchema(BaseModel):
    title: str = Field(description="Название отдела")
    description: str | None = Field(description="Описание отдела", default=None)
    management_id: int


class DepartmentLiteOutSchema(BaseModel):
    id: int
    title: str
    management_id: int
    model_config = ConfigDict(from_attributes=True, extra="ignore")

class DepartmentsOutSchema(BaseModel):
    id: int
    title: str = Field(description="Название отдела")
    description: str | None = Field(description="Описание отдела", default=None)
    management_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class DepartmentsWithHeadsOutSchema(DepartmentsOutSchema):
    head: UserOutSchema | None = None
    deputy_head: UserOutSchema | None = None