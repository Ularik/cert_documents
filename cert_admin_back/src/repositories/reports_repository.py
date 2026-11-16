from datetime import datetime

from sqlalchemy import exists, func, select, union_all
from sqlalchemy.orm import aliased

from src.models.tasks import Tasks
from src.models.users import Users
from src.models.users_tasks import UsersTasks
from src.schemas.reports import ReportTaskRow


class ReportsRepository:
    def __init__(self, session):
        self.session = session

    async def get_department_done_tasks(
        self,
        department_id: int,
        start: datetime,
        end: datetime,
    ) -> list[ReportTaskRow]:
        """Задачи, выполненные в [start, end), по сотрудникам отдела.

        Задача засчитывается её исполнителям из этого отдела; задача без исполнителей
        (поручена отделу/управлению целиком) — тому, кто перевёл её в «Выполнено».
        """
        author = aliased(Users)
        member = aliased(Users)
        author_name = func.nullif(func.concat_ws(" ", author.last_name, author.username), "")
        done_in_period = (
            Tasks.status == "DONE",
            Tasks.done_at >= start,
            Tasks.done_at < end,
        )
        columns = (
            Tasks.id.label("task_id"),
            Tasks.title,
            Tasks.created_at,
            Tasks.deadlines,
            Tasks.done_at,
            author_name.label("author_name"),
        )

        by_executor = (
            select(UsersTasks.user_id.label("user_id"), *columns)
            .join(Tasks, Tasks.id == UsersTasks.task_id)
            .join(member, member.id == UsersTasks.user_id)
            .outerjoin(author, author.id == Tasks.author_id)
            .where(member.department_id == department_id, *done_in_period)
        )
        by_finisher = (
            select(Tasks.done_by_id.label("user_id"), *columns)
            .join(member, member.id == Tasks.done_by_id)
            .outerjoin(author, author.id == Tasks.author_id)
            .where(
                member.department_id == department_id,
                ~exists().where(UsersTasks.task_id == Tasks.id),
                *done_in_period,
            )
        )
        query = union_all(by_executor, by_finisher).subquery()
        result = await self.session.execute(
            select(query).order_by(query.c.user_id, query.c.done_at, query.c.task_id)
        )
        return [ReportTaskRow.model_validate(row) for row in result.mappings().all()]
