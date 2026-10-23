from typing import Literal

from src.schemas.users import UserInCookiesSchema
from src.exceptions.exceptions import ObjectNotFoundException, DepartmentNotFoundException, UniqueObjIsExistException, \
    TaskAlreadyExistException, HasNotRightsToTaskException, UserNotFoundException, DependsDepartmentException, \
    TaskNotFoundException
from src.routers.dependencies import QueryParamsSchema
from src.schemas.users import UserOutSchema
from src.models.users import ADMIN_ACCESS_STATUSES, MANAGEMENT_SCOPED_STATUSES
from src.services.base import BaseService
from src.schemas.tasks import (TaskCreateUpdateSchema, TaskOutSchema,
                               TaskLiteOutSchema, TaskApiResponseSchema, TaskFullOutSchema, TaskPatchStatusSchema)
from fastapi import UploadFile
from fastapi import HTTPException
from datetime import date


class TasksService(BaseService):
    async def _validate_task_targets(
        self,
        management_id: int | None,
        department_ids: list[int],
        executor_ids: list[int],
        *,
        actor: UserOutSchema,
        fallback_management_id: int | None = None,
    ) -> int:
        department_managements = await self.db.departments.get_management_ids(department_ids)
        if set(department_managements) != set(department_ids):
            raise DepartmentNotFoundException

        resolved_management_id = management_id or fallback_management_id or actor.management_id
        if resolved_management_id is None and department_managements:
            distinct_managements = set(department_managements.values())
            if len(distinct_managements) == 1:
                resolved_management_id = distinct_managements.pop()

        if resolved_management_id is None:
            raise HTTPException(status_code=400, detail="Для задачи необходимо указать управление")

        if not await self.db.managements.get_managements(id=resolved_management_id):
            raise HTTPException(status_code=404, detail="Управление не найдено")

        if actor.status == "MANAGEMENT_HEAD" and actor.management_id != resolved_management_id:
            raise HTTPException(status_code=403, detail="Можно создавать задачи только для своего управления")

        if any(value != resolved_management_id for value in department_managements.values()):
            raise HTTPException(
                status_code=400,
                detail="Все отделы задачи должны принадлежать выбранному управлению",
            )

        if executor_ids:
            executors = await self.db.users.get_users_by_ids(executor_ids)
            executor_by_id = {executor.id: executor for executor in executors}
            missing_ids = set(executor_ids) - set(executor_by_id)
            if missing_ids:
                raise UserNotFoundException
            if not department_ids or any(
                executor_by_id[executor_id].department_id not in department_ids
                for executor_id in executor_ids
            ):
                raise HTTPException(
                    status_code=400,
                    detail="Исполнители должны состоять в выбранных отделах задачи",
                )

        return resolved_management_id

    async def create_task(
            self,
            user_id: int,
            title: str,
            description: str | None,
            deadlines: date | None,
            note: str | None,
            attachments: list[UploadFile] | None,
            management_id: int | None = None,
            departments_ids: list[int] = [],
            executor_ids: list[int] = []
    ) -> TaskOutSchema:

        user: UserOutSchema = await self.db.users.get_one(id=user_id)

        has_admin_access = user.status in ADMIN_ACCESS_STATUSES
        if not has_admin_access and not user.department_id:
            raise DependsDepartmentException

        if not has_admin_access:
            departments_ids = [user.department_id]

        management_id = await self._validate_task_targets(
            management_id,
            departments_ids,
            executor_ids,
            actor=user,
        )

        task_data = TaskCreateUpdateSchema(
            author_id=user_id,
            management_id=management_id,
            title=title,
            description=description,
            deadlines=deadlines,
            note=note,
        )
        try:
            new_task: TaskLiteOutSchema = await self.db.tasks.add_obj(task_data)
        except UniqueObjIsExistException:
            raise TaskAlreadyExistException

        documents = await self.db.tasks_documents.add_documents(task_id=new_task.id,
                                                                documents_files=set(attachments or []))

        try:
            await self.db.tasks_users.connect_user_task(task_id=new_task.id, executor_ids=executor_ids)
        except ObjectNotFoundException:
            raise UserNotFoundException

        try:
            await self.db.task_departments.connect_departments_to_task(task_id=new_task.id,
                                                                       departments_ids=departments_ids)
        except ObjectNotFoundException:
            raise DepartmentNotFoundException

        await self.db.save()

        new_task_full_out = TaskOutSchema(**new_task.model_dump(), attachments=documents, executors=executor_ids)
        return new_task_full_out

    async def update_task(
            self,
            user_id: int,
            task_id: int,
            title: str,
            description: str | None,
            deadlines: date | None,
            note: str | None,
            attachments: list[UploadFile] | None,
            old_attachments_id_from_front: list[int],
            management_id: int | None = None,
            departments_ids: list[int] = [],
            executor_ids: list[int] = []
    ):
        user: UserOutSchema = await self.db.users.get_one(id=user_id)
        old_task: TaskLiteOutSchema = await self.db.tasks.get_one(id=task_id)

        if user.status == "MANAGEMENT_HEAD" and old_task.management_id != user.management_id:
            raise HasNotRightsToTaskException
        if user.status not in ADMIN_ACCESS_STATUSES:
            if not user.department_id:
                raise HasNotRightsToTaskException

            old_departments_ids = await self.db.tasks.get_task_department_ids(task_id=task_id)
            departments_ids = [user.department_id]
            if old_departments_ids != [user.department_id]:
                raise HasNotRightsToTaskException

        management_id = await self._validate_task_targets(
            management_id,
            departments_ids,
            executor_ids,
            actor=user,
            fallback_management_id=old_task.management_id,
        )
        task_data = TaskCreateUpdateSchema(
            author_id=user_id,
            management_id=management_id,
            title=title,
            description=description,
            deadlines=deadlines,
            note=note,
        )
        try:
            task = await self.db.tasks.edit(task_data, exclude_unset=True, id=task_id)
        except ObjectNotFoundException:
            raise DepartmentNotFoundException

        await self.update_executors_task(executor_ids=executor_ids, task_id=task_id)

        tasks_docs = await self.db.tasks_documents.update_documents(
            task_id=task_id,
            old_docs_id_from_front=old_attachments_id_from_front,
            new_documents=attachments or []
        )
        await self.db.task_departments.connect_departments_to_task(task_id=task_id, departments_ids=departments_ids)

        new_task_full_out = TaskOutSchema(**task.model_dump(), attachments=tasks_docs, executors=executor_ids)
        await self.db.save()
        return new_task_full_out

    async def change_status(self, task_id: int, data: TaskPatchStatusSchema, user: UserInCookiesSchema) -> None:
        if user.status == "MANAGEMENT_HEAD":
            task = await self.db.tasks.get_one(id=task_id)
            actor = await self.db.users.get_one(id=user.user_id)
            if task.management_id != actor.management_id:
                raise HasNotRightsToTaskException
        elif user.status not in ADMIN_ACCESS_STATUSES:
            canEdit = await self.db.task_departments.same_department(user_id=user.user_id, task_id=task_id)
            if not canEdit:
                raise HasNotRightsToTaskException

        await self.db.tasks.edit(data, id=task_id)
        await self.db.save()

    async def get_tasks(
        self,
        query_params: QueryParamsSchema,
        user_id: int | None = None,
    ) -> TaskApiResponseSchema:
        management_id = query_params.management_id
        if user_id is not None:
            actor = await self.db.users.get_one(id=user_id)
            if actor.status in MANAGEMENT_SCOPED_STATUSES:
                actor_management_id = await self.get_user_management_id(actor)
                if actor_management_id is None:
                    return TaskApiResponseSchema(total=0, items=[])
                if (
                    management_id is not None
                    and management_id != actor_management_id
                ):
                    raise HasNotRightsToTaskException
                management_id = actor_management_id

        return await self.db.tasks.get_filtered_tasks(
            department_id=query_params.department_id,
            management_id=management_id,
            from_date=query_params.from_date,
            to_date=query_params.to_date,
            rush=query_params.rush,
            extra_rush=query_params.extra_rush,
            is_expired=query_params.is_expired,
            status=query_params.status,
            limit=query_params.limit,
            offset=query_params.offset,
        )

    async def get_one(
        self,
        task_id: int,
        user_id: int | None = None,
    ) -> TaskFullOutSchema:
        task: TaskApiResponseSchema = await self.db.tasks.get_filtered_tasks(id=task_id)
        if not task.items:
            raise TaskNotFoundException
        if user_id is not None:
            actor = await self.db.users.get_one(id=user_id)
            actor_management_id = await self.get_user_management_id(actor)
            if (
                actor.status in MANAGEMENT_SCOPED_STATUSES
                and actor_management_id != task.items[0].management_id
            ):
                raise TaskNotFoundException
        return task.items[0]

    async def update_executors_task(self, executor_ids: list[int], task_id: int) -> None:
        await self.db.tasks_users.set_user_task(executors_ids=executor_ids, task_id=task_id)

    async def delete_task(self, task_id: int, user_id: int) -> None:
        task: TaskLiteOutSchema = await self.db.tasks.get_one(id=task_id)
        user: UserOutSchema = await self.db.users.get_one(id=user_id)
        if user.status == "MANAGEMENT_HEAD" and task.management_id != user.management_id:
            raise HasNotRightsToTaskException
        if user.status not in ADMIN_ACCESS_STATUSES and task.author_id != user_id:
            raise HasNotRightsToTaskException
        await self.db.tasks.delete_bulk(id=task_id)
        await self.db.save()

    async def delete_task_by_head(self, task_id: int, user_id: int):
        user: UserOutSchema = await self.db.users.get_one(id=user_id)
        if user.status == "MANAGEMENT_HEAD":
            task: TaskLiteOutSchema = await self.db.tasks.get_one(id=task_id)
            if task.management_id != user.management_id:
                raise HasNotRightsToTaskException
            await self.db.tasks.delete_bulk(id=task_id)
            await self.db.save()
            return
        departments_ids = await self.db.tasks.get_task_department_ids(task_id=task_id)
        if departments_ids != [user.department_id]:
            raise HasNotRightsToTaskException
        await self.db.tasks.delete_bulk(id=task_id)
        await self.db.save()

    async def delete_task_by_admin(self, task_id: int, user_id: int) -> None:
        user: UserOutSchema = await self.db.users.get_one(id=user_id)
        task: TaskLiteOutSchema = await self.db.tasks.get_one(id=task_id)
        if user.status == "MANAGEMENT_HEAD" and task.management_id != user.management_id:
            raise HasNotRightsToTaskException
        await self.db.tasks.delete_bulk(id=task_id)
        await self.db.save()
