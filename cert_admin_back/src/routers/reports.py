import urllib.parse
from datetime import date

from fastapi import APIRouter, Response

from src.routers.dependencies import AuthUserDep, DBDep
from src.services.reports_service import ReportsService

router = APIRouter(prefix="/reports", tags=["Отчёты"])

DOCX_MEDIA_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"


@router.get("/departments/{department_id}")
async def download_department_report(
        db: DBDep,
        user: AuthUserDep,
        department_id: int,
        date_from: date,
        date_to: date,
):
    """Отчёт отдела в .docx: выполненные за период задачи каждого сотрудника."""
    content, filename = await ReportsService(db).department_report(
        actor_id=user.user_id,
        department_id=department_id,
        date_from=date_from,
        date_to=date_to,
    )
    return Response(
        content=content,
        media_type=DOCX_MEDIA_TYPE,
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{urllib.parse.quote(filename)}"},
    )
