from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class ReportTaskRow(BaseModel):
    """Выполненная задача, засчитанная сотруднику."""
    user_id: int
    task_id: int
    title: str
    created_at: datetime
    deadlines: datetime | None = None
    done_at: datetime
    author_name: str | None = None
    model_config = ConfigDict(from_attributes=True)


class ReportEmployee(BaseModel):
    id: int
    full_name: str
    status: str
    tasks: list[ReportTaskRow] = []


class DepartmentReportData(BaseModel):
    department_title: str
    management_title: str | None
    date_from: date
    date_to: date
    generated_at: datetime
    generated_by: str
    employees: list[ReportEmployee]
