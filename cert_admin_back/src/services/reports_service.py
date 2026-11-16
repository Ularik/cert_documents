import logging
from datetime import date, datetime, time, timedelta, timezone

from fastapi import HTTPException

from src.exceptions.exceptions import DepartmentNotFoundException
from src.schemas.reports import DepartmentReportData, ReportEmployee
from src.schemas.tasks import BISHKEK_TZ
from src.services.base import BaseService
from src.utils.department_report import build_department_report

reports_logger = logging.getLogger("app.reports")

MAX_PERIOD_DAYS = 366


class ReportsService(BaseService):
    async def department_report(
        self,
        actor_id: int,
        department_id: int,
        date_from: date,
        date_to: date,
    ) -> tuple[bytes, str]:
        """Отчёт отдела .docx за период [date_from, date_to] (даты включительно, по Бишкеку).
        Возвращает содержимое файла и его имя."""
        if date_from > date_to:
            raise HTTPException(status_code=422, detail="Дата начала периода позже даты окончания")
        if (date_to - date_from).days >= MAX_PERIOD_DAYS:
            raise HTTPException(status_code=422, detail="Период отчёта — не больше года")

        departments = await self.db.departments.get_departments(id=department_id)
        if not departments:
            raise DepartmentNotFoundException
        department = departments[0]

        actor = await self.db.users.get_actor(id=actor_id)
        if not await self._can_report(actor, department):
            raise HTTPException(status_code=403, detail="Нет доступа к отчёту этого отдела")

        start = datetime.combine(date_from, time.min, BISHKEK_TZ)
        end = datetime.combine(date_to + timedelta(days=1), time.min, BISHKEK_TZ)
        rows = await self.db.reports.get_department_done_tasks(department_id, start, end)

        members = await self.db.users.get_user_full_data(department_id=department_id)
        employees = {
            m.id: ReportEmployee(
                id=m.id,
                full_name=" ".join(filter(None, [m.last_name, m.username])),
                status=m.status,
            )
            for m in members
        }
        for row in rows:
            if row.user_id in employees:
                employees[row.user_id].tasks.append(row)

        managements = await self.db.managements.get_managements(id=department.management_id)
        data = DepartmentReportData(
            department_title=department.title,
            management_title=managements[0].title if managements else None,
            date_from=date_from,
            date_to=date_to,
            generated_at=datetime.now(timezone.utc),
            generated_by=" ".join(filter(None, [actor.last_name, actor.username])),
            employees=list(employees.values()),
        )
        content = build_department_report(data)
        reports_logger.info("Сформирован отчёт отдела", extra={"user_id": actor_id, "data": {
            "department_id": department_id,
            "date_from": date_from.isoformat(),
            "date_to": date_to.isoformat(),
        }})
        filename = f"Отчёт {department.title} {date_from:%d.%m.%Y}-{date_to:%d.%m.%Y}.docx"
        return content, filename

    async def _can_report(self, actor, department) -> bool:
        """ADMIN/DIVISION_HEAD — любой отдел, начальник управления — отделы своего управления,
        начальник отдела и заместитель — свой отдел."""
        if actor.status in {"ADMIN", "DIVISION_HEAD"}:
            return True
        if actor.status == "MANAGEMENT_HEAD":
            return await self.get_user_management_id(actor) == department.management_id
        if actor.status in {"HEAD", "DEPUTY"}:
            return actor.department_id == department.id
        return False
