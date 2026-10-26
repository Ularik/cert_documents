from src.schemas.users import UserInCookiesSchema
from src.exceptions.exceptions import ObjectNotFoundException, DepartmentNotFoundException, UniqueObjIsExistException, \
    TaskAlreadyExistException, HasNotRightsToTaskException, UserNotFoundException, DependsDepartmentException, \
    TaskNotFoundException
from src.routers.dependencies import QueryParamsSchema
from src.schemas.users import UserOutSchema
from src.models.tasks import TaskTargetType
from src.models.users import MANAGEMENT_SCOPED_STATUSES, UserStatus
from src.services.base import BaseService
from src.services.task_access import ADMIN_TIER, can_modify_task, can_work_with_task
from src.schemas.tasks import (TaskCreateUpdateSchema, TaskUpdateSchema, TaskOutSchema,
                               TaskLiteOutSchema, TaskApiResponseSchema, TaskFullOutSchema, TaskPatchStatusSchema)
from fastapi import UploadFile
from fastapi import HTTPException
from datetime import date


def _unique(values: list[int]) -> list[int]:
    return list(dict.fromkeys(values))


class TasksService(BaseService):
    async def _resolve_targets(
        self,
        actor: UserOutSchema,
        management_ids: list[int],
        department_ids: list[int],
        executor_ids: list[int],
    ) -> tuple[list[int], list[int], TaskTargetType]:
        """Приводит выбранные адресаты к согласованному виду и определяет тип назначения.

        Задачу можно поручить: управлениям (отделы не выбраны), отделам или
        конкретным сотрудникам. Отделы должны входить в выбранные управления,
        исполнители — в выбранные отделы; если отделы не заданы, но выбраны
        исполнители, отделы берутся у самих исполнителей.
        """
        management_ids = _unique(management_ids)
        department_ids = _unique(department_ids)
        executor_ids = _unique(executor_ids)

        if actor.status == UserStatus.MANAGEMENT_HEAD.value:
            own_management_id = await self.get_user_management_id(actor)
            if own_management_id is None:
                raise HasNotRightsToTaskException
            if any(management_id != own_management_id for management_id in management_ids):
                raise HTTPException(status_code=403, detail="Можно создавать задачи только для своего управления")
            management_ids = [own_management_id]
        elif actor.status not in ADMIN_TIER:
            # HEAD / DEPUTY / USER работают только в рамках своего отдела
            if not actor.department_id:
                raise DependsDepartmentException
            department_ids = [actor.department_id]
            management_ids = []

        department_managements = await self.db.departments.get_management_ids(department_ids)
        if set(department_managements) != set(department_ids):
            raise DepartmentNotFoundException

        executors = await self.db.users.get_users_by_ids(executor_ids)
        if {executor.id for executor in executors} != set(executor_ids):
            raise UserNotFoundException

        if executor_ids and not department_ids:
            if any(executor.department_id is None for executor in executors):
                raise HTTPException(status_code=400, detail="У исполнителей должен быть указан отдел")
            department_ids = _unique([executor.department_id for executor in executors])
            department_managements = await self.db.departments.get_management_ids(department_ids)

        if any(executor.department_id not in department_ids for executor in executors):
            raise HTTPException(
                status_code=400,
                detail="Исполнители должны состоять в выбранных отделах задачи",
            )

        if department_ids:
            derived_management_ids = _unique(list(department_managements.values()))
            if management_ids and set(management_ids) != set(derived_management_ids):
                raise HTTPException(
                    status_code=400,
                    detail="Отделы задачи должны принадлежать выбранным управлениям, "
                           "а у каждого выбранного управления должен быть хотя бы один отдел",
                )
            management_ids = derived_management_ids

        if not management_ids:
            raise HTTPException(status_code=400, detail="Для задачи необходимо указать хотя бы одно управление")

        if await self.db.managements.get_existing_ids(management_ids) != set(management_ids):
            raise HTTPException(status_code=404, detail="Управление не найдено")

        if executor_ids:
            target_type = TaskTargetType.EXECUTORS
        elif department_ids:
            target_type = TaskTargetType.DEPARTMENTS
        else:
            target_type = TaskTargetType.MANAGEMENTS
        return management_ids, department_ids, target_type

    async def _get_full_task(self, task_id: int) -> TaskFullOutSchema:
        found: TaskApiResponseSchema = await self.db.tasks.get_filtered_tasks(id=task_id)
        if not found.items:
            raise TaskNotFoundException
        return found.items[0]

    async def create_task(
            self,
            user_id: int,
            title: str,
            description: str | None,
            deadlines: date | None,
            note: str | None,
            attachments: list[UploadFile] | None,
            management_ids: list[int] = [],
            departments_ids: list[int] = [],
            executor_ids: list[int] = []
    ) -> TaskOutSchema:

        user: UserOutSchema = await self.db.users.get_one(id=user_id)

        management_ids, departments_ids, target_type = await self._resolve_targets(
            user, management_ids, departments_ids, executor_ids
        )
        executor_ids = _unique(executor_ids)

        task_data = TaskCreateUpdateSchema(
            author_id=user_id,
            title=title,
            description=description,
            deadlines=deadlines,
            note=note,
            target_type=target_type,
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
            await self.db.task_managements.set_managements_to_task(task_id=new_task.id,
                                                                   management_ids=management_ids)
        except ObjectNotFoundException:
            raise DepartmentNotFoundException

        await self.db.save()

        return TaskOutSchema(
            **new_task.model_dump(),
            management_ids=management_ids,
            attachments=documents,
            executors=executor_ids,
        )

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
            management_ids: list[int] = [],
            departments_ids: list[int] = [],
            executor_ids: list[int] = []
    ):
        user: UserOutSchema = await self.db.users.get_one(id=user_id)
        old_task = await self._get_full_task(task_id)

        if not can_modify_task(user, await self.get_user_management_id(user), old_task):
            raise HasNotRightsToTaskException

        management_ids, departments_ids, target_type = await self._resolve_targets(
            user, management_ids, departments_ids, executor_ids
        )
        executor_ids = _unique(executor_ids)

        # автор не меняется: от него зависит, кто может править задачу
        task_data = TaskUpdateSchema(
            title=title,
            description=description,
            deadlines=deadlines,
            note=note,
            target_type=target_type,
        )
        try:
            task = await self.db.tasks.edit(task_data, exclude_unset=True, id=task_id)
        except UniqueObjIsExistException:
            raise TaskAlreadyExistException
        except ObjectNotFoundException:
            raise TaskNotFoundException

        try:
            await self.update_executors_task(executor_ids=executor_ids, task_id=task_id)
            await self.db.task_departments.connect_departments_to_task(task_id=task_id, departments_ids=departments_ids)
            await self.db.task_managements.set_managements_to_task(task_id=task_id, management_ids=management_ids)
        except ObjectNotFoundException:
            raise DepartmentNotFoundException

        tasks_docs = await self.db.tasks_documents.update_documents(
            task_id=task_id,
            old_docs_id_from_front=old_attachments_id_from_front,
            new_documents=attachments or []
        )

        new_task_full_out = TaskOutSchema(
            **task.model_dump(),
            management_ids=management_ids,
            attachments=tasks_docs,
            executors=executor_ids,
        )
        await self.db.save()
        return new_task_full_out

    async def change_status(self, task_id: int, data: TaskPatchStatusSchema, user: UserInCookiesSchema) -> None:
        task = await self._get_full_task(task_id)
        actor = await self.db.users.get_one(id=user.user_id)
        if not can_work_with_task(actor, await self.get_user_management_id(actor), task):
            raise HasNotRightsToTaskException

        await self.db.tasks.edit(data, id=task_id)
        await self.db.save()

    async def _mark_editable(self, actor: UserOutSchema, tasks: list[TaskFullOutSchema]) -> None:
        actor_management_id = await self.get_user_management_id(actor)
        for task in tasks:
            task.can_edit = can_modify_task(actor, actor_management_id, task)

    async def get_tasks(
        self,
        query_params: QueryParamsSchema,
        user_id: int | None = None,
    ) -> TaskApiResponseSchema:
        management_id = query_params.management_id
        actor = None
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

        result = await self.db.tasks.get_filtered_tasks(
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
        if actor is not None:
            await self._mark_editable(actor, result.items)
        return result

    async def get_one(
        self,
        task_id: int,
        user_id: int | None = None,
    ) -> TaskFullOutSchema:
        task = await self._get_full_task(task_id)
        if user_id is not None:
            actor = await self.db.users.get_one(id=user_id)
            actor_management_id = await self.get_user_management_id(actor)
            if (
                actor.status in MANAGEMENT_SCOPED_STATUSES
                and actor_management_id not in {m.id for m in task.managements}
            ):
                raise TaskNotFoundException
            await self._mark_editable(actor, [task])
        return task

    async def update_executors_task(self, executor_ids: list[int], task_id: int) -> None:
        await self.db.tasks_users.set_user_task(executors_ids=executor_ids, task_id=task_id)

    async def delete_task(self, task_id: int, user_id: int) -> None:
        task = await self._get_full_task(task_id)
        user: UserOutSchema = await self.db.users.get_one(id=user_id)
        if not can_modify_task(user, await self.get_user_management_id(user), task):
            raise HasNotRightsToTaskException
        await self.db.tasks.delete_bulk(id=task_id)
        await self.db.save()
