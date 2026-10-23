from sqlalchemy import select
from sqlalchemy.orm import joinedload, selectinload
from src.repositories.base import BaseRepository
from src.models.tasks import TaskReply
from src.schemas.tasks_reply import ReplyCreateSchema, ReplyLiteOutSchema, ReplyFullOutSchema


class ReplyRepository(BaseRepository):
    model = TaskReply
    schema = ReplyLiteOutSchema

    async def create_tasks_reply(self, data: ReplyCreateSchema) -> None:
        reply: ReplyLiteOutSchema = await self.add_obj(data)

    async def get_filtered_replies(self, **kwargs) -> list[ReplyFullOutSchema]:
        query = (
            select(self.model)
            .options(
                selectinload(self.model.attachments),
                joinedload(self.model.author),
            )
            .filter_by(**kwargs)
        )

        result = await self.session.execute(query)
        replies = [ReplyFullOutSchema.model_validate(r) for r in result.scalars().all()]
        return replies