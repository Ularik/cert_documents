from fastapi import HTTPException

from src.exceptions.exceptions import ObjectNotFoundException, UniqueObjIsExistException
from src.schemas.managements import ManagementCreateUpdateSchema, ManagementOutSchema, ManagementRequestSchema
from src.schemas.users import UserUpdateSchema
from src.models.users import MANAGEMENT_SCOPED_STATUSES
from src.services.base import BaseService


class ManagementService(BaseService):
    async def get_managements(
        self,
        user_id: int | None = None,
    ) -> list[ManagementOutSchema]:
        if user_id is not None:
            actor = await self.db.users.get_one(id=user_id)
            if actor.status in MANAGEMENT_SCOPED_STATUSES:
                management_id = await self.get_user_management_id(actor)
                if management_id is None:
                    return []
                return await self.db.managements.get_managements(
                    id=management_id
                )
        return await self.db.managements.get_managements()

    async def get_one_management(
        self,
        management_id: int,
        user_id: int | None = None,
    ) -> ManagementOutSchema:
        if user_id is not None:
            actor = await self.db.users.get_one(id=user_id)
            actor_management_id = await self.get_user_management_id(actor)
            if (
                actor.status in MANAGEMENT_SCOPED_STATUSES
                and actor_management_id != management_id
            ):
                raise ObjectNotFoundException
        result = await self.db.managements.get_managements(id=management_id)
        if not result:
            raise ObjectNotFoundException
        return result[0]

    async def add_management(self, data: ManagementRequestSchema) -> ManagementOutSchema:
        management_data = ManagementCreateUpdateSchema(
            title=data.title,
            description=data.description,
        )
        try:
            management = await self.db.managements.add_obj(management_data)
        except UniqueObjIsExistException as err:
            raise HTTPException(status_code=409, detail="Такое управление уже существует") from err

        if data.head_id is not None:
            await self.db.users.update_user(
                user_id=data.head_id,
                data=UserUpdateSchema(status="MANAGEMENT_HEAD", management_id=management.id),
            )

        await self.db.save()
        return await self.get_one_management(management.id)

    async def update_management(
        self,
        management_id: int,
        data: ManagementRequestSchema,
    ) -> ManagementOutSchema:
        old_management = await self.get_one_management(management_id)
        management_data = ManagementCreateUpdateSchema(
            title=data.title,
            description=data.description,
        )
        try:
            await self.db.managements.edit(management_data, id=management_id)
        except UniqueObjIsExistException as err:
            raise HTTPException(status_code=409, detail="Такое управление уже существует") from err

        old_head_id = old_management.head.id if old_management.head else None
        if old_head_id != data.head_id:
            if old_head_id is not None:
                await self.db.users.update_user(
                    user_id=old_head_id,
                    data=UserUpdateSchema(status="USER", management_id=None),
                )
            if data.head_id is not None:
                await self.db.users.update_user(
                    user_id=data.head_id,
                    data=UserUpdateSchema(status="MANAGEMENT_HEAD", management_id=management_id),
                )

        await self.db.save()
        return await self.get_one_management(management_id)

    async def delete_management(self, management_id: int) -> None:
        management = await self.get_one_management(management_id)
        if await self.db.managements.has_departments(management_id):
            raise HTTPException(
                status_code=409,
                detail="Нельзя удалить управление, пока в нем есть отделы",
            )

        if management.head is not None:
            await self.db.users.update_user(
                user_id=management.head.id,
                data=UserUpdateSchema(status="USER", management_id=None),
            )
        await self.db.managements.delete(id=management_id)
        await self.db.save()
