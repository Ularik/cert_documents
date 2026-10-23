from typing import Annotated, Literal

from pygments.lexer import default

from src.database import AsyncSessionMaker
from src.schemas.users import UserInCookiesSchema
from src.db_manager.db_manager import DbManager
from fastapi import Depends, Request, HTTPException, status, Query
from src.services.auth import AuthService
from pydantic import BaseModel, Field
from datetime import datetime, date


async def get_db():
    async with DbManager(session_factory=AsyncSessionMaker) as db:
        yield db


DBDep = Annotated[DbManager, Depends(get_db)]

StatusType = Literal["NEW", "PROGRESS", "DONE"]

class QueryParamsSchema(BaseModel):
    department_id: int | None = None
    management_id: int | None = None
    created_at: datetime | None = None
    from_date: date | None = None
    to_date: date | None = None
    status: list[StatusType] = Field(default_factory=[])
    rush: bool | None = None
    extra_rush: bool | None = None
    is_expired: bool | None = None
    limit: int = Field(10, gt=0, le=50)
    offset: int = Field(0, ge=0)

def get_query_params(
        department_id: int | None = None,
        management_id: int | None = None,
        created_at: datetime | None = None,
        from_date: date | None = None,
        to_date: date | None = None,
        status: list[StatusType] = Query(default=[]),  # <--- Важно: Query()
        rush: bool | None = None,
        extra_rush: bool | None = None,
        is_expired: bool | None = None,
        limit: int = Query(10, gt=0, le=50),
        offset: int = Query(0, ge=0),
) -> QueryParamsSchema:
    return QueryParamsSchema(
        department_id=department_id,
        management_id=management_id,
        created_at=created_at,
        from_date=from_date,
        to_date=to_date,
        status=status,
        rush=rush,
        extra_rush=extra_rush,
        is_expired=is_expired,
        limit=limit,
        offset=offset,
    )


QueryParamsDep = Annotated[QueryParamsSchema, Depends(get_query_params)]

def get_token(request: Request) -> str:
    token = request.cookies.get("access_token", None)
    if not token:
        raise HTTPException(status_code=401, detail="Вы не передали токен аутентификации")
    return token


async def get_current_user(token: str = Depends(get_token)) -> UserInCookiesSchema:
    user_data = await AuthService.decode_token(token)
    return user_data


AuthUserDep = Annotated[UserInCookiesSchema, Depends(get_current_user)]


async def get_admin_user(user_data: UserInCookiesSchema = Depends(get_current_user)) -> UserInCookiesSchema:
    if user_data.status not in {"ADMIN", "DIVISION_HEAD"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав для выполнения операции"
        )
    return user_data

async def get_head_user(user_data: UserInCookiesSchema = Depends(get_current_user)) -> UserInCookiesSchema:
    if user_data.status not in {
        "ADMIN",
        "DIVISION_HEAD",
        "HEAD",
        "DEPUTY",
    }:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав для выполнения операции"
        )
    return user_data


async def get_management_head_user(
    user_data: UserInCookiesSchema = Depends(get_current_user),
) -> UserInCookiesSchema:
    if user_data.status != "MANAGEMENT_HEAD":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав для выполнения операции"
        )
    return user_data


async def get_general_task_user(
    user_data: UserInCookiesSchema = Depends(get_current_user),
) -> UserInCookiesSchema:
    if user_data.status == "MANAGEMENT_HEAD":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Используйте отдельный маршрут начальника управления"
        )
    return user_data
