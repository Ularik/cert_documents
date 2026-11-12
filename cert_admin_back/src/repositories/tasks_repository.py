from datetime import date, datetime, timedelta, timezone

from src.models.departments_tasks import DepartmentsTasks
from src.models.departments import Departments
from src.models.managements import Managements
from src.models.tasks import Tasks
from src.models.users import Users
from src.repositories.base import BaseRepository
from src.schemas.tasks import TaskLiteOutSchema, TaskFullOutSchema, TaskApiResponseSchema, TaskCalendarItemSchema
from sqlalchemy import select, func, and_, or_, update
from sqlalchemy.orm import selectinload, joinedload


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _start_of_today():
    """Начало текущих суток (00:00) по Asia/Bishkek, вычисляется в Postgres."""
    return func.timezone(
        "Asia/Bishkek",
        func.date_trunc("day", func.timezone("Asia/Bishkek", func.now())),
    )


class TasksRepository(BaseRepository):
    model = Tasks
    schema = TaskLiteOutSchema

    def _scope_filters(self,
                       department_id: int | None = None,
                       management_id: int | None = None,
                       executor_id: int | None = None) -> list:
        args = []
        if department_id is not None:
            # задача касается отдела, если он указан явно, либо она поручена
            # управлению отдела целиком (без выбора отделов)
            department_management_id = (
                select(Departments.management_id)
                .where(Departments.id == department_id)
                .scalar_subquery()
            )
            args.append(
                or_(
                    self.model.departments.any(Departments.id == department_id),
                    and_(
                        ~self.model.departments.any(),
                        self.model.managements.any(Managements.id == department_management_id),
                    ),
                )
            )
        if management_id is not None:
            args.append(self.model.managements.any(Managements.id == management_id))

        if executor_id is not None:
            args.append(self.model.executors.any(Users.id == executor_id))
        return args

    async def get_filtered_tasks(self,
                                 *args,
                                 department_id: int | None = None,
                                 management_id: int | None = None,
                                 executor_id: int | None = None,
                                 from_date: date | None = None,
                                 to_date: date | None = None,
                                 rush: bool | None = None,
                                 extra_rush: bool | None = None,
                                 is_expired: bool | None = None,
                                 status: list[str] = [],
                                 limit: int = 10,
                                 offset: int = 0,
                                 **kwargs) -> TaskApiResponseSchema:
        args = [*args, *self._scope_filters(department_id, management_id, executor_id)]

        if from_date is not None:
            args.append(self.model.created_at >= from_date)

        if to_date is not None:
            args.append(self.model.created_at < to_date + timedelta(days=1))

        if status:
            args.append(self.model.status.in_(status))

        if rush is not None:
            # Срок в ближайшее окно или уже прошёл; выполненные задачи не считаются срочными
            args.append(
                and_(
                    self.model.status != "DONE",
                    self.model.deadlines <= _now() + timedelta(days=3),
                )
            )

        if extra_rush is not None:
            # Срок в ближайшее окно или уже прошёл; выполненные задачи не считаются срочными
            args.append(
                and_(
                    self.model.status != "DONE",
                    self.model.deadlines <= _now() + timedelta(days=1),
                )
            )

        if is_expired is not None:
            # Просрочена: флаг выставлен в полночь (сохраняется и после завершения),
            # либо срок уже наступил, а задача ещё не выполнена
            args.append(
                or_(
                    self.model.is_expired.is_(True),
                    and_(
                        self.model.status != "DONE",
                        self.model.deadlines < _now(),
                    ),
                )
            )

        base_query = select(self.model).filter(*args).filter_by(**kwargs)

        # 1. Подсчет количества через subquery
        count_query = select(func.count()).select_from(base_query.order_by(None).subquery())
        total_count = (await self.session.execute(count_query)).scalar_one()
        print(base_query.compile(compile_kwargs={"literal_binds": True}))
        # 2. Добавление связей и пагинации
        data_query = (
            base_query
            .options(
                joinedload(self.model.author),
                selectinload(self.model.attachments),
                selectinload(self.model.managements),
                selectinload(self.model.departments),
                selectinload(self.model.executors)
            )
            .order_by(self.model.created_at.desc())
            .limit(limit)
            .offset(offset)
        )

        result = await self.session.execute(data_query)
        items = [TaskFullOutSchema.model_validate(row) for row in result.scalars()]

        return TaskApiResponseSchema(total=total_count, items=items)

    async def get_task_department_ids(self, task_id: int) -> list[int]:
        query = select(DepartmentsTasks.department_id).where(
            DepartmentsTasks.task_id == task_id
        )
        res = await self.session.execute(query)
        return list(res.scalars().all())

    async def get_calendar_tasks(self,
                                 deadline_from: datetime,
                                 deadline_to: datetime,
                                 department_id: int | None = None,
                                 management_id: int | None = None,
                                 executor_id: int | None = None) -> list[TaskCalendarItemSchema]:
        """Задачи со сроком в полуинтервале [deadline_from, deadline_to) для календаря."""
        query = (
            select(self.model)
            .filter(
                *self._scope_filters(department_id, management_id, executor_id),
                self.model.deadlines >= deadline_from,
                self.model.deadlines < deadline_to,
            )
            .options(
                selectinload(self.model.managements),
                selectinload(self.model.departments),
                selectinload(self.model.executors),
            )
            .order_by(self.model.deadlines.asc(), self.model.id.asc())
        )
        result = await self.session.execute(query)
        return [TaskCalendarItemSchema.model_validate(row) for row in result.scalars()]

    async def set_expired_status(self):
        """Отмечает просрочку у невыполненных задач, срок которых истёк до наступившей полуночи.

        Флаг фиксирует факт просрочки: после 00:00 он остаётся, даже если задачу потом завершат.
        Задача, завершённая до полуночи (пусть и после срока), флаг не получает.
        """
        query = (
            update(self.model)
            .values(is_expired=True)
            .where(
                self.model.status != "DONE",
                self.model.deadlines < _start_of_today(),
                self.model.is_expired.is_not(True),
            )
        )
        await self.session.execute(query)

    async def reset_expired_status(self, task_id: int):
        """Снимает отметку просрочки, если срок задачи перенесли в будущее или убрали."""
        query = (
            update(self.model)
            .values(is_expired=False)
            .where(
                self.model.id == task_id,
                self.model.is_expired.is_(True),
                or_(self.model.deadlines.is_(None), self.model.deadlines >= _now()),
            )
        )
        await self.session.execute(query)


