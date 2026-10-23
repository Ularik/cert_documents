from fastapi import HTTPException

from src.exceptions.exceptions import UniqueObjIsExistException, DepartmentAlreadyExistException, \
    ObjectNotFoundException, DepartmentNotFoundException
from src.schemas.users import UserUpdateSchema
from src.services.base import BaseService
from src.schemas.departments import DepartmentCreateUpdateSchema, DepartmentsOutSchema, \
    DepartmentRequestCreateUpdateSchema, DepartmentsWithHeadsOutSchema
from src.models.users import MANAGEMENT_SCOPED_STATUSES


class DepartmentService(BaseService):
    async def _validate_management_head_leaders(
        self,
        *,
        actor_management_id: int | None,
        leader_ids: set[int],
        actor_id: int,
    ) -> None:
        for leader_id in leader_ids:
            leader = await self.db.users.get_one(id=leader_id)
            leader_management_id = await self.get_user_management_id(leader)
            if (
                leader_id == actor_id
                or actor_management_id is None
                or leader_management_id != actor_management_id
            ):
                raise HTTPException(
                    status_code=403,
                    detail="Можно назначать руководителями только сотрудников своего управления",
                )

    async def add_department(
        self,
        data: DepartmentRequestCreateUpdateSchema,
        user_id: int,
    ) -> DepartmentsOutSchema:
        actor = await self.db.users.get_one(id=user_id)
        if actor.status not in {"ADMIN", "DIVISION_HEAD", "MANAGEMENT_HEAD", "HEAD"}:
            raise HTTPException(status_code=403, detail="Недостаточно прав для создания отдела")
        if actor.status == "MANAGEMENT_HEAD" and actor.management_id != data.management_id:
            raise HTTPException(status_code=403, detail="Можно создавать отделы только в своем управлении")
        if actor.status == "MANAGEMENT_HEAD":
            await self._validate_management_head_leaders(
                actor_management_id=actor.management_id,
                leader_ids=set(filter(None, [data.head_id, data.deputy_head_id])),
                actor_id=actor.id,
            )
        if not await self.db.managements.get_managements(id=data.management_id):
            raise HTTPException(status_code=404, detail="Управление не найдено")

        new_dep_data = DepartmentCreateUpdateSchema(
            title=data.title,
            description=data.description,
            management_id=data.management_id,
        )
        try:
            new_dep: DepartmentsOutSchema = await self.db.departments.add_obj(new_dep_data)
        except UniqueObjIsExistException as err:
            raise DepartmentAlreadyExistException from err

        if data.head_id is not None:
            await self.db.users.update_user(
                user_id=data.head_id,
                data=UserUpdateSchema(status="HEAD", department_id=new_dep.id),
            )
        if data.deputy_head_id is not None:
            await self.db.users.update_user(
                user_id=data.deputy_head_id,
                data=UserUpdateSchema(status="DEPUTY", department_id=new_dep.id),
            )

        await self.db.save()
        return await self.get_one_department(department_id=new_dep.id)

    async def update_department(
        self,
        dep_id: int,
        data: DepartmentRequestCreateUpdateSchema,
        user_id: int,
    ) -> DepartmentsOutSchema:
        actor = await self.db.users.get_one(id=user_id)
        old_department = await self.get_one_department(department_id=dep_id)
        if actor.status == "MANAGEMENT_HEAD" and (
            actor.management_id != old_department.management_id
            or actor.management_id != data.management_id
        ):
            raise HTTPException(status_code=403, detail="Можно изменять отделы только своего управления")
        if actor.status == "MANAGEMENT_HEAD":
            await self._validate_management_head_leaders(
                actor_management_id=actor.management_id,
                leader_ids=set(filter(None, [data.head_id, data.deputy_head_id])),
                actor_id=actor.id,
            )
        if not await self.db.managements.get_managements(id=data.management_id):
            raise HTTPException(status_code=404, detail="Управление не найдено")

        new_dep_data = DepartmentCreateUpdateSchema(
            title=data.title,
            description=data.description,
            management_id=data.management_id,
        )
        try:
            await self.db.departments.edit(new_dep_data, id=dep_id, exclude_unset=True)
        except UniqueObjIsExistException as err:
            raise DepartmentAlreadyExistException from err
        except ObjectNotFoundException as err:
            raise DepartmentNotFoundException from err

        old_heads = set()
        if old_department.head:
            old_heads.add(old_department.head.id)
        if old_department.deputy_head:
            old_heads.add(old_department.deputy_head.id)

        new_heads = set(filter(None, [data.head_id, data.deputy_head_id]))

        old_heads_for_set_status_to_user = old_heads - new_heads

        if old_heads_for_set_status_to_user:
            await self.db.users.update_status(users_ids=old_heads_for_set_status_to_user, status="USER")

        if data.head_id is not None:
            await self.db.users.update_user(
                data=UserUpdateSchema(department_id=old_department.id, status="HEAD"),
                user_id=data.head_id,
            )
        if data.deputy_head_id is not None:
            await self.db.users.update_user(
                data=UserUpdateSchema(department_id=old_department.id, status="DEPUTY"),
                user_id=data.deputy_head_id,
            )

        await self.db.save()
        return await self.get_one_department(department_id=dep_id)

    async def delete_department(self, dep_id: int, user_id: int) -> None:
        actor = await self.db.users.get_one(id=user_id)
        department = await self.get_one_department(department_id=dep_id)

        if actor.status == "MANAGEMENT_HEAD" and actor.management_id != department.management_id:
            raise HTTPException(
                status_code=403,
                detail="Можно удалять отделы только своего управления",
            )
        if actor.status not in {"ADMIN", "DIVISION_HEAD", "MANAGEMENT_HEAD"}:
            raise HTTPException(status_code=403, detail="Недостаточно прав для удаления отдела")

        department_heads = [
            head.id
            for head in (department.head, department.deputy_head)
            if head is not None
        ]
        if department_heads:
            await self.db.users.update_status(users_ids=department_heads, status="USER")

        await self.db.departments.delete(id=dep_id)
        await self.db.save()

    async def get_department(
        self,
        user_id: int | None = None,
    ) -> list[DepartmentsWithHeadsOutSchema]:
        if user_id is None:
            return await self.db.departments.get_departments()
        actor = await self.db.users.get_one(id=user_id)
        if actor.status in MANAGEMENT_SCOPED_STATUSES:
            management_id = await self.get_user_management_id(actor)
            if management_id is None:
                return []
            return await self.db.departments.get_departments(
                management_id=management_id
            )
        return await self.db.departments.get_departments()

    async def get_one_department(
        self,
        department_id: int,
        user_id: int | None = None,
    ) -> DepartmentsWithHeadsOutSchema:
        res: list[DepartmentsWithHeadsOutSchema] = await self.db.departments.get_departments(id=department_id)
        if not res:
            raise DepartmentNotFoundException
        if user_id is not None:
            actor = await self.db.users.get_one(id=user_id)
            management_id = await self.get_user_management_id(actor)
            if (
                actor.status in MANAGEMENT_SCOPED_STATUSES
                and res[0].management_id != management_id
            ):
                raise DepartmentNotFoundException
        return res[0]