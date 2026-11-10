from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class LogsQuerySchema(BaseModel):
    """Фильтры журнала аудита."""
    logger: str | None = None
    level: str | None = None
    user_id: int | None = None
    search: str | None = None
    from_date: date | None = None
    to_date: date | None = None
    limit: int = Field(20, gt=0, le=100)
    offset: int = Field(0, ge=0)


class LogUserSchema(BaseModel):
    id: int
    username: str
    last_name: str | None = None
    status: str
    model_config = ConfigDict(from_attributes=True)


class LogOutSchema(BaseModel):
    id: int
    created_at: datetime
    level: str
    logger: str
    message: str
    user_id: int | None = None
    user: LogUserSchema | None = None
    ip_address: str | None = None
    user_agent: str | None = None
    data: dict[str, Any] | None = None
    model_config = ConfigDict(from_attributes=True)


class LogsApiResponseSchema(BaseModel):
    total: int
    items: list[LogOutSchema]
