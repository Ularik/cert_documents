from src.models import Departments
from src.repositories.base import BaseRepository
from src.models.users import Users
from src.models.users_tasks import UsersTasks
from src.models.tasks import Tasks
from src.schemas.users import (
    UserHashedPswdSchema,
    UserOutSchema,
    UserWithDepartmentOut,
    UserUpdateSchema,
    UserTasksStatsOut,
)
from src.schemas.users_tasks import UsersConnectTaskSchema
from datetime import date
from sqlalchemy import select, insert, update, or_, and_, func
from sqlalchemy.orm import aliased
from typing import Literal


class UsersRepository(BaseRepository):
    model = Users
    schema = UserOutSchema

    async def get_user_with_hashed_pswd(self, username: str, last_name: str) -> UserHashedPswdSchema:
        query = select(self.model).filter_by(username=username, last_name=last_name)
        result = await self.session.execute(query)
        user = result.scalars().first()
        if user:
            return UserHashedPswdSchema.model_validate(user)

    async def relate_users_tasks(self, data: UsersConnectTaskSchema):
        await self.session.execute(
            insert(UsersTasks)
            .values(**data.model_dump())
        )

    async def update_user(self, data: UserUpdateSchema, user_id: int) -> UserOutSchema:
        res: UserOutSchema = await self.edit(data, id=user_id)
        return res

    async def update_status(
        self,
        users_ids: list[int],
        status: Literal[
            "ADMIN",
            "DIVISION_HEAD",
            "MANAGEMENT_HEAD",
            "HEAD",
            "DEPUTY",
            "USER",
        ],
    ):
        query = (
            update(self.model)
            .filter(self.model.id.in_(users_ids))
            .values(status=status)
            .returning(self.model)
        )
        await self.session.execute(query)

    async def get_user_full_data(
        self,
        department_id: int | None = None,
        management_id: int | None = None,
        superiors_management_id: int | None = None,
        include_division_heads: bool = False,
    ) -> list[UserWithDepartmentOut]:
        """superiors_management_id — дополнительно вернуть начальника этого управления,
        include_division_heads — дополнительно вернуть начальников подразделений."""

        query = (
            select(
                self.model.id,
                self.model.username,
                self.model.last_name,
                self.model.status,
                self.model.department_id,
                self.model.management_id,
                Departments.title.label("department_title"),
            )
            .outerjoin(Departments, self.model.department_id == Departments.id)
        )

        conditions = []
        if department_id:
            conditions.append(self.model.department_id == department_id)
        if management_id is not None:
            department_ids = select(Departments.id).where(
                Departments.management_id == management_id
            )
            conditions.append(
                or_(
                    self.model.management_id == management_id,
                    self.model.department_id.in_(department_ids),
                )
            )
        if conditions:
            scope = and_(*conditions)
            if superiors_management_id is not None:
                scope = or_(
                    scope,
                    and_(
                        self.model.status == "MANAGEMENT_HEAD",
                        self.model.management_id == superiors_management_id,
                    ),
                )
            if include_division_heads:
                scope = or_(scope, self.model.status == "DIVISION_HEAD")
            query = query.where(scope)

        result = await self.session.execute(query)
        return [UserWithDepartmentOut.model_validate(u) for u in result.mappings().all()]

    async def get_users_tasks_stats(
        self,
        management_id: int | None = None,
        department_id: int | None = None,
        user_id: int | None = None,
    ) -> list[UserTasksStatsOut]:
        """Счётчики задач по статусам для каждого сотрудника (задачи, где он исполнитель)."""
        is_overdue = and_(
            Tasks.status != "DONE",
            or_(Tasks.deadlines < date.today(), Tasks.is_expired),
        )
        stats = (
            select(
                UsersTasks.user_id.label("user_id"),
                func.count().label("total"),
                func.count().filter(Tasks.status == "NEW").label("new"),
                func.count().filter(Tasks.status == "PROGRESS").label("progress"),
                func.count().filter(Tasks.status == "DONE").label("done"),
                func.count().filter(is_overdue).label("expired"),
            )
            .join(Tasks, Tasks.id == UsersTasks.task_id)
            .group_by(UsersTasks.user_id)
            .subquery()
        )
        query = (
            select(
                self.model.id,
                self.model.username,
                self.model.last_name,
                self.model.status,
                self.model.department_id,
                self.model.management_id,
                Departments.title.label("department_title"),
                func.coalesce(stats.c.total, 0).label("total"),
                func.coalesce(stats.c.new, 0).label("new"),
                func.coalesce(stats.c.progress, 0).label("progress"),
                func.coalesce(stats.c.done, 0).label("done"),
                func.coalesce(stats.c.expired, 0).label("expired"),
            )
            .outerjoin(Departments, self.model.department_id == Departments.id)
            .outerjoin(stats, stats.c.user_id == self.model.id)
            .order_by(self.model.last_name, self.model.username)
        )
        if management_id is not None:
            department_ids = select(Departments.id).where(
                Departments.management_id == management_id
            )
            query = query.where(
                or_(
                    self.model.management_id == management_id,
                    self.model.department_id.in_(department_ids),
                )
            )

        if department_id is not None:
            query = query.where(self.model.department_id == department_id)
        if user_id is not None:
            query = query.where(self.model.id == user_id)

        result = await self.session.execute(query)
        return [UserTasksStatsOut.model_validate(u) for u in result.mappings().all()]

    async def get_users_by_ids(self, user_ids: list[int]) -> list[UserOutSchema]:
        if not user_ids:
            return []
        query = select(self.model).where(self.model.id.in_(user_ids))
        result = await self.session.execute(query)
        return [UserOutSchema.model_validate(user) for user in result.scalars().all()]