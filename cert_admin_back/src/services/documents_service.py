from src.services.base import BaseService
from src.schemas.tasks import DocumentOutSchema
from src.models.users import MANAGEMENT_SCOPED_STATUSES
from src.exceptions.exceptions import TaskNotFoundException


class DocumentService(BaseService):

    async def _check_management_scope(self, task_id: int, actor_id: int) -> None:
        actor = await self.db.users.get_one(id=actor_id)
        if actor.status not in MANAGEMENT_SCOPED_STATUSES:
            return

        task = await self.db.tasks.get_one_or_none(id=task_id)
        management_id = await self.get_user_management_id(actor)
        if task is None or task.management_id != management_id:
            raise TaskNotFoundException

    async def download_task_document(self, document_id: int, actor_id: int):
        task_id = await self.db.tasks_documents.get_task_id(document_id)
        if task_id is None:
            return None
        await self._check_management_scope(task_id, actor_id)
        res: DocumentOutSchema = await self.db.tasks_documents.download_document(document_id=document_id)
        return res

    async def download_reply_document(self, document_id: int, actor_id: int):
        task_id = await self.db.reply_documents.get_task_id(document_id)
        if task_id is None:
            return None
        await self._check_management_scope(task_id, actor_id)
        res: DocumentOutSchema = await self.db.reply_documents.download_document(document_id=document_id)
        return res