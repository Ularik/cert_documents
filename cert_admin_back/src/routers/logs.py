from datetime import date

from fastapi import APIRouter, Query

from src.routers.dependencies import AuditUserDep, DBDep
from src.schemas.logs import LogsApiResponseSchema, LogsQuerySchema
from src.services.logs_service import LogsService

router = APIRouter(prefix="/logs", tags=["Аудит"])


@router.get("/", response_model=LogsApiResponseSchema)
async def get_logs(
    db: DBDep,
    user: AuditUserDep,
    logger: str | None = None,
    level: str | None = None,
    user_id: int | None = None,
    search: str | None = None,
    from_date: date | None = None,
    to_date: date | None = None,
    limit: int = Query(20, gt=0, le=100),
    offset: int = Query(0, ge=0),
):
    params = LogsQuerySchema(
        logger=logger,
        level=level,
        user_id=user_id,
        search=search,
        from_date=from_date,
        to_date=to_date,
        limit=limit,
        offset=offset,
    )
    return await LogsService(db).get_logs(actor_id=user.user_id, params=params)


@router.get("/types", response_model=list[str])
async def get_log_types(db: DBDep, user: AuditUserDep):
    """Типы логов (имена логгеров), которые есть в журнале — для фильтра."""
    return await LogsService(db).get_loggers()
