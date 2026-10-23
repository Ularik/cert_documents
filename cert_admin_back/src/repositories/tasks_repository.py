import datetime
from datetime import date, timedelta

from src.models.departments_tasks import DepartmentsTasks
from src.models.departments import Departments
from src.models.tasks import Tasks
from src.repositories.base import BaseRepository
from src.schemas.tasks import TaskLiteOutSchema, TaskFullOutSchema, TaskApiResponseSchema
from sqlalchemy import select, func, and_, or_, update
from sqlalchemy.orm import selectinload, joinedload


class TasksRepository(BaseRepository):
    model = Tasks
    schema = TaskLiteOutSchema

    async def get_filtered_tasks(self,
                                 *args,
                                 department_id: int | None = None,
                                 management_id: int | None = None,
                                 from_date: date | None = None,
                                 to_date: date | None = None,
                                 rush: bool | None = None,
                                 extra_rush: bool | None = None,
                                 is_expired: bool | None = None,
                                 status: list[str] = [],
                                 limit: int = 10,
                                 offset: int = 0,
                                 **kwargs) -> TaskApiResponseSchema:
        args = [*args]
        if department_id is not None:
            args.append(self.model.departments.any(Departments.id == department_id))
        if management_id is not None:
            args.append(self.model.management_id == management_id)

        if from_date is not None:
            args.append(self.model.created_at >= from_date)

        if to_date is not None:
            args.append(self.model.created_at < to_date + timedelta(days=1))

        if status:
            args.append(self.model.status.in_(status))

        if rush is not None:
            today = date.today()
            three_days = today + timedelta(days=3)

            args.append(
                or_(
                    and_(
                        self.model.deadlines > today,
                        self.model.deadlines <= three_days
                    ),
                    and_(
                        self.model.deadlines <= today,
                        self.model.status != "DONE"
                    )
                )
            )

        if extra_rush is not None:
            today = date.today()
            tomorrow = today + timedelta(days=1)

            args.append(
                or_(
                    and_(
                        self.model.deadlines > today,
                        self.model.deadlines <= tomorrow
                    ),
                    and_(
                        self.model.deadlines <= today,
                        self.model.status != "DONE"
                    )
                )
            )

        if is_expired is not None:
            today = date.today()

            args.append(
                or_(
                    and_(
                        self.model.status != "DONE",
                        self.model.deadlines < today,
                    ),
                    self.model.is_expired
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

    async def set_expired_status(self):
        today = datetime.date.today()
        query = (
            update(self.model)
            .values(is_expired=True)
            .where(self.model.status != "DONE", self.model.deadlines < today)
        )
        await self.session.execute(query)


