from sqlalchemy import select

from src.repositories.task_document_repository import TasksDocumentRepository
from src.models.tasks import ReplyDocument, TaskReply
from src.schemas.tasks import DocumentLiteSchema


class ReplyDocumentsRepository(TasksDocumentRepository):
    model = ReplyDocument
    schema = DocumentLiteSchema

    async def get_task_id(self, document_id: int) -> int | None:
        query = (
            select(TaskReply.task_id)
            .join(self.model, self.model.reply_id == TaskReply.id)
            .where(self.model.id == document_id)
        )
        result = await self.session.execute(query)
        return result.scalar_one_or_none()
