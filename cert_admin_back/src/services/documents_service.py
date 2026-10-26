from src.services.base import BaseService
from src.schemas.tasks import DocumentOutSchema


class DocumentService(BaseService):

    async def download_task_document(self, document_id: int, actor_id: int):
        task_id = await self.db.tasks_documents.get_task_id(document_id)
        if task_id is None:
            return None
        await self.check_task_management_scope(task_id, actor_id)
        res: DocumentOutSchema = await self.db.tasks_documents.download_document(document_id=document_id)
        return res

    async def download_reply_document(self, document_id: int, actor_id: int):
        task_id = await self.db.reply_documents.get_task_id(document_id)
        if task_id is None:
            return None
        await self.check_task_management_scope(task_id, actor_id)
        res: DocumentOutSchema = await self.db.reply_documents.download_document(document_id=document_id)
        return res