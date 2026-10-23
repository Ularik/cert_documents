from src.exceptions.exceptions import UniqueObjIsExistException, UserAlreadyExistException
from src.schemas.users import UserLoginSchema, UserInCookiesSchema, UsersAuthSchema, UserOutSchema, UserAddSchema, \
    UserUpdateSchema
from src.models.users import MANAGEMENT_SCOPED_STATUSES
from src.services.base import BaseService
from src.services.auth import AuthService
from fastapi import HTTPException


class UserService(BaseService):

    async def login_user(self, data: UserLoginSchema) -> str:
        user = await self.db.users.get_user_with_hashed_pswd(username=data.username, last_name=data.last_name)
        if not user:
            raise HTTPException(status_code=401, detail="Пользователь не найден")
        if not await AuthService().verify_password(data.password, user.hashed_password):
            raise HTTPException(status_code=401, detail="Неверный пароль!")

        payload = UserInCookiesSchema(**{"user_id": user.id, "status": user.status})
        access_token = await AuthService().create_access_token(payload)
        return access_token

    async def set_department(self, user_id: int, department_id: int) -> UserOutSchema:
        data = UserUpdateSchema(department_id=department_id)
        user = await self.db.users.edit(data, exclude_unset=True, id=user_id)
        await self.db.save()
        return user

    async def create_user(self, data: UsersAuthSchema) -> UserOutSchema:
        hashed_password = await AuthService().hash_pswd(data.password)

        new_data = UserAddSchema(
            username=data.username,
            last_name=data.last_name,
            status=data.status,
            department_id=data.department_id,
            management_id=data.management_id,
            hashed_password=hashed_password,
        )

        try:
            new_user = await self.db.users.add_obj(new_data)
            await self.db.save()
            return new_user
        except UniqueObjIsExistException as err:
            raise HTTPException(status_code=409, detail=err.detail)

    async def create_managed_user(
        self,
        data: UsersAuthSchema,
        actor_id: int,
    ) -> UserOutSchema:
        actor = await self.db.users.get_one(id=actor_id)
        allowed_roles = (
            {"DIVISION_HEAD", "MANAGEMENT_HEAD", "HEAD", "DEPUTY", "USER"}
            if actor.status in {"ADMIN", "DIVISION_HEAD"}
            else {"HEAD", "DEPUTY", "USER"}
            if actor.status == "MANAGEMENT_HEAD"
            else {"DEPUTY", "USER"}
            if actor.status == "HEAD"
            else {"USER"}
            if actor.status == "DEPUTY"
            else set()
        )
        if data.status not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail="Недостаточно прав для назначения этой роли",
            )

        management_id = data.management_id
        if data.status == "MANAGEMENT_HEAD":
            if management_id is None:
                raise HTTPException(
                    status_code=422,
                    detail="Для начальника управления необходимо выбрать управление",
                )
            if not await self.db.managements.get_managements(id=management_id):
                raise HTTPException(status_code=404, detail="Управление не найдено")
        else:
            if management_id is not None:
                raise HTTPException(
                    status_code=422,
                    detail="Управление можно указать только для начальника управления",
                )
            if data.status in {"HEAD", "DEPUTY"} and data.department_id is None:
                raise HTTPException(
                    status_code=422,
                    detail="Для начальника отдела и заместителя необходимо выбрать отдел",
                )
            if data.department_id is not None:
                department = await self.db.departments.get_one(id=data.department_id)
                management_id = department.management_id

        if actor.status in {"HEAD", "DEPUTY"}:
            if data.department_id != actor.department_id:
                raise HTTPException(
                    status_code=403,
                    detail="Можно добавлять сотрудников только в свой отдел",
                )
            if data.department_id is None:
                raise HTTPException(
                    status_code=422,
                    detail="Для сотрудника необходимо выбрать отдел",
                )
            department = await self.db.departments.get_one(id=data.department_id)
            management_id = department.management_id
        elif actor.status == "MANAGEMENT_HEAD":
            if data.department_id is None:
                raise HTTPException(
                    status_code=422,
                    detail="Выберите отдел своего управления",
                )
            department = await self.db.departments.get_one(id=data.department_id)
            if department.management_id != actor.management_id:
                raise HTTPException(
                    status_code=403,
                    detail="Можно добавлять сотрудников только в отделы своего управления",
                )
            management_id = actor.management_id

        validated_data = data.model_copy(update={"management_id": management_id})
        return await self.create_user(validated_data)

    async def get_user(
        self,
        id: int,
        actor_id: int | None = None,
    ) -> UserOutSchema:
        user = await self.db.users.get_one(id=id)
        if actor_id is not None:
            actor = await self.db.users.get_one(id=actor_id)
            if actor.status in MANAGEMENT_SCOPED_STATUSES:
                actor_management_id = await self.get_user_management_id(actor)
                target_management_id = await self.get_user_management_id(user)
                if target_management_id != actor_management_id:
                    raise HTTPException(status_code=404, detail="Сотрудник не найден")
        return user

    async def get_users(
        self,
        department_id: int | None = None,
        actor_id: int | None = None,
    ):
        management_id = None
        if actor_id is not None:
            actor = await self.db.users.get_one(id=actor_id)
            if actor.status in MANAGEMENT_SCOPED_STATUSES:
                management_id = await self.get_user_management_id(actor)
                if management_id is None:
                    return []
        return await self.db.users.get_user_full_data(
            department_id=department_id,
            management_id=management_id,
        )

    async def update_user(self, data: UserUpdateSchema, user_id: int) -> UserOutSchema:
        try:
            new_user = await self.db.users.update_user(data=data, user_id=user_id)
        except UniqueObjIsExistException as err:
            raise UserAlreadyExistException from err

        await self.db.save()
        return new_user

    async def update_admin_user(
        self,
        data: UserUpdateSchema,
        user_id: int,
        actor_id: int | None = None,
    ) -> UserOutSchema:
        actor = await self.db.users.get_one(id=actor_id) if actor_id is not None else None
        user = await self.db.users.get_one(id=user_id)
        if actor is not None and actor.status == "MANAGEMENT_HEAD":
            if user_id == actor_id:
                raise HTTPException(status_code=403, detail="Нельзя изменять собственную учетную запись")
            target_management_id = user.management_id
            if user.department_id is not None:
                target_departments = await self.db.departments.get_departments(
                    id=user.department_id
                )
                if target_departments:
                    target_management_id = target_departments[0].management_id
            if target_management_id != actor.management_id:
                raise HTTPException(status_code=404, detail="Сотрудник не найден")

        changed_fields = data.model_fields_set
        status = data.status if "status" in changed_fields and data.status else user.status
        if actor is not None and actor.status == "MANAGEMENT_HEAD" and status not in {
            "USER",
            "HEAD",
            "DEPUTY",
        }:
            raise HTTPException(
                status_code=403,
                detail="Нельзя назначить эту роль",
            )
        role_changed = status != user.status

        department_id = (
            data.department_id
            if "department_id" in changed_fields
            else None if role_changed else user.department_id
        )
        management_id = (
            data.management_id
            if "management_id" in changed_fields
            else None if role_changed else user.management_id
        )

        if status == "ADMIN":
            department_id = None
            management_id = None
        elif status == "MANAGEMENT_HEAD":
            if department_id is not None:
                raise HTTPException(
                    status_code=422,
                    detail="Для начальника управления нельзя выбрать отдел",
                )
            if management_id is None:
                raise HTTPException(
                    status_code=422,
                    detail="Для начальника управления необходимо выбрать управление",
                )
            managements = await self.db.managements.get_managements(id=management_id)
            if not managements:
                raise HTTPException(status_code=404, detail="Управление не найдено")
            current_head = managements[0].head
            if current_head is not None and current_head.id != user_id:
                raise HTTPException(
                    status_code=409,
                    detail="У управления уже есть начальник",
                )
        elif status in {"HEAD", "DEPUTY"}:
            if department_id is None:
                raise HTTPException(
                    status_code=422,
                    detail="Для начальника отдела и заместителя необходимо выбрать отдел",
                )
            if management_id is None:
                raise HTTPException(
                    status_code=422,
                    detail="Для роли на уровне отдела необходимо выбрать управление",
                )
            departments = await self.db.departments.get_departments(id=department_id)
            if not departments:
                raise HTTPException(status_code=404, detail="Отдел не найден")
            department = departments[0]
            if department.management_id != management_id:
                raise HTTPException(
                    status_code=422,
                    detail="Выбранный отдел не относится к указанному управлению",
                )
            incumbent = department.head if status == "HEAD" else department.deputy_head
            if incumbent is not None and incumbent.id != user_id:
                raise HTTPException(
                    status_code=409,
                    detail="В отделе уже назначен сотрудник на эту должность",
                )
            management_id = department.management_id
        elif status == "USER":
            if role_changed and (department_id is None or management_id is None):
                raise HTTPException(
                    status_code=422,
                    detail="Для назначения сотрудника в отдел необходимо выбрать управление и отдел",
                )
            if department_id is not None:
                departments = await self.db.departments.get_departments(id=department_id)
                if not departments:
                    raise HTTPException(status_code=404, detail="Отдел не найден")
                if (
                    management_id is not None
                    and departments[0].management_id != management_id
                ):
                    raise HTTPException(
                        status_code=422,
                        detail="Выбранный отдел не относится к указанному управлению",
                    )
                management_id = departments[0].management_id
            elif management_id is not None:
                if not await self.db.managements.get_managements(id=management_id):
                    raise HTTPException(status_code=404, detail="Управление не найдено")
        else:  # DIVISION_HEAD
            department_id = None
            if management_id is not None and not await self.db.managements.get_managements(
                id=management_id
            ):
                raise HTTPException(status_code=404, detail="Управление не найдено")

        if actor is not None and actor.status == "MANAGEMENT_HEAD":
            if management_id != actor.management_id:
                raise HTTPException(
                    status_code=403,
                    detail="Можно управлять только сотрудниками своего управления",
                )

        normalized_data = data.model_copy(
            update={
                "status": status,
                "department_id": department_id,
                "management_id": management_id,
            }
        )
        return await self.update_user(data=normalized_data, user_id=user_id)

    async def delete_user(
        self,
        user_id: int,
        actor_id: int | None = None,
    ) -> None:
        if actor_id is not None:
            actor = await self.db.users.get_one(id=actor_id)
            if actor.status == "MANAGEMENT_HEAD":
                if actor_id == user_id:
                    raise HTTPException(
                        status_code=403,
                        detail="Нельзя удалить собственную учетную запись",
                    )
                target = await self.db.users.get_one(id=user_id)
                target_management_id = target.management_id
                if target.department_id is not None:
                    departments = await self.db.departments.get_departments(
                        id=target.department_id
                    )
                    if departments:
                        target_management_id = departments[0].management_id
                if target_management_id != actor.management_id or target.status == "MANAGEMENT_HEAD":
                    raise HTTPException(status_code=404, detail="Сотрудник не найден")
        await self.db.users.delete_bulk(id=user_id)
        await self.db.save()