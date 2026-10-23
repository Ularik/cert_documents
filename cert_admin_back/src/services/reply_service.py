from src.schemas.tasks import TaskPatchStatusSchema
from src.exceptions.exceptions import ReplyNotFoundException, TaskNotFoundException
from src.schemas.users import UserInCookiesSchema
from src.schemas.users_tasks import UsersConnectTaskSchema
from src.schemas.tasks_reply import ReplyLiteOutSchema, ReplyUpdateSchema, ReplyCreateSchema, ReplyFullOutSchema
from src.services.base import BaseService
from fastapi import UploadFile
from src.schemas.tasks import DocumentLiteSchema
from src.models.users import MANAGEMENT_SCOPED_STATUSES


class ReplyService(BaseService):

    async def _check_management_scope(
        self,
        task_id: int,
        actor_id: int,
    ) -> None:
        actor = await self.db.users.get_one(id=actor_id)
        if actor.status not in MANAGEMENT_SCOPED_STATUSES:
            return
        task = await self.db.tasks.get_one_or_none(id=task_id)
        management_id = await self.get_user_management_id(actor)
        if task is None or task.management_id != management_id:
            raise TaskNotFoundException

    async def get_replies(
        self,
        task_id: int,
        actor_id: int | None = None,
    ) -> list[ReplyFullOutSchema]:
        if actor_id is not None:
            await self._check_management_scope(task_id, actor_id)
        replies: list[ReplyFullOutSchema] = await self.db.reply_tasks.get_filtered_replies(task_id=task_id)
        return replies

    async def get_one_reply(
        self,
        reply_id: int,
        actor_id: int | None = None,
    ) -> ReplyFullOutSchema:
        res = await self.db.reply_tasks.get_filtered_replies(id=reply_id)
        if not res:
            raise ReplyNotFoundException
        if actor_id is not None:
            await self._check_management_scope(res[0].task_id, actor_id)
        return res[0]

    async def create_reply(
            self,
            executor: UserInCookiesSchema,
            task_id: int,
            content: str,
            attachments: list[UploadFile]
    ):
        await self._check_management_scope(task_id, executor.user_id)
        # обновляем статус задачи на "в процессе"
        task_update_status = TaskPatchStatusSchema(status="PROGRESS")
        await self.db.tasks.edit(data=task_update_status, id=task_id)

        #
        users_task: UsersConnectTaskSchema = await self.db.tasks_users.get_one_or_none(task_id=task_id, user_id=executor.user_id)
        if not users_task:
            await self.db.tasks_users.connect_user_task(task_id=task_id, executor_ids=[executor.user_id])

        reply_data = ReplyCreateSchema(task_id=task_id, content=content, author_id=executor.user_id)
        reply: ReplyLiteOutSchema = await self.db.reply_tasks.add_obj(reply_data)

        documents: list[DocumentLiteSchema] = await self.db.reply_documents.add_documents(
            documents_files=attachments,
            reply_id=reply.id
        )
        reply_with_docs = ReplyFullOutSchema(**reply.model_dump(), attachments=documents)
        await self.db.save()
        return reply_with_docs

    async def update_reply(
            self,
            reply_id: int,
            attachments: list[UploadFile],
            old_attachments_ids: list[int],
            content: str | None = None,
            actor_id: int | None = None,
    ) -> ReplyFullOutSchema:
        if actor_id is not None:
            await self._check_reply_management_scope(reply_id, actor_id)
        docs: list[DocumentLiteSchema] = await self.db.reply_documents.update_documents(
            reply_id=reply_id,
            new_documents=attachments,
            old_docs_id_from_front=old_attachments_ids,
        )

        data = ReplyUpdateSchema(content=content)
        reply = await self.db.reply_tasks.edit(data=data, id=reply_id)
        await self.db.save()
        return ReplyFullOutSchema(**reply.model_dump(), attachments=docs)

    async def delete_reply(self, reply_id: int, actor_id: int | None = None):
        if actor_id is not None:
            await self._check_reply_management_scope(reply_id, actor_id)
        await self.db.reply_tasks.delete(id=reply_id)
        await self.db.save()

    async def _check_reply_management_scope(
        self,
        reply_id: int,
        actor_id: int,
    ) -> None:
        reply = await self.db.reply_tasks.get_filtered_replies(id=reply_id)
        if not reply:
            raise ReplyNotFoundException
        await self._check_management_scope(reply[0].task_id, actor_id)
