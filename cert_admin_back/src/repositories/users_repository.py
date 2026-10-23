from src.models import Departments
from src.repositories.base import BaseRepository
from src.models.users import Users
from src.models.users_tasks import UsersTasks
from src.schemas.users import UserHashedPswdSchema, UserOutSchema, UserWithDepartmentOut, UserUpdateSchema
from src.schemas.users_tasks import UsersConnectTaskSchema
from sqlalchemy import select, insert, update, or_
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
    ) -> list[UserWithDepartmentOut]:

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

        if department_id:
            query = query.where(self.model.department_id == department_id)
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

        result = await self.session.execute(query)
        return [UserWithDepartmentOut.model_validate(u) for u in result.mappings().all()]

    async def get_users_by_ids(self, user_ids: list[int]) -> list[UserOutSchema]:
        if not user_ids:
            return []
        query = select(self.model).where(self.model.id.in_(user_ids))
        result = await self.session.execute(query)
        return [UserOutSchema.model_validate(user) for user in result.scalars().all()]