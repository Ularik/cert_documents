from datetime import datetime

from sqlalchemy import select

from src.models.notes import Notes
from src.repositories.base import BaseRepository
from src.schemas.notes import NoteOutSchema


class NotesRepository(BaseRepository):
    model = Notes
    schema = NoteOutSchema

    async def get_user_notes(
        self,
        user_id: int,
        deadline_from: datetime,
        deadline_to: datetime,
    ) -> list[NoteOutSchema]:
        """Заметки пользователя со сроком в периоде [deadline_from, deadline_to)."""
        query = (
            select(Notes)
            .where(
                Notes.user_id == user_id,
                Notes.deadlines >= deadline_from,
                Notes.deadlines < deadline_to,
            )
            .order_by(Notes.deadlines, Notes.id)
        )
        result = await self.session.execute(query)
        return [self.schema.model_validate(note) for note in result.scalars()]
