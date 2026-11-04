from datetime import datetime, timedelta

from fastapi import HTTPException

from src.exceptions.exceptions import NoteNotFoundException
from src.schemas.notes import NoteAddSchema, NoteOutSchema, NoteRequestSchema
from src.services.base import BaseService
from src.services.tasks_service import CALENDAR_MAX_DAYS, _with_timezone


class NotesService(BaseService):
    """Личные заметки: каждый сотрудник видит и меняет только свои."""

    async def get_notes(
        self,
        user_id: int,
        deadline_from: datetime,
        deadline_to: datetime,
    ) -> list[NoteOutSchema]:
        deadline_from = _with_timezone(deadline_from)
        deadline_to = _with_timezone(deadline_to)
        if deadline_to <= deadline_from:
            raise HTTPException(status_code=400, detail="Конец периода должен быть позже начала")
        if deadline_to - deadline_from > timedelta(days=CALENDAR_MAX_DAYS):
            raise HTTPException(status_code=400, detail=f"Период не может превышать {CALENDAR_MAX_DAYS} дней")
        return await self.db.notes.get_user_notes(
            user_id=user_id,
            deadline_from=deadline_from,
            deadline_to=deadline_to,
        )

    async def get_note(self, note_id: int, user_id: int) -> NoteOutSchema:
        # чужая заметка для пользователя не существует
        note = await self.db.notes.get_one_or_none(id=note_id, user_id=user_id)
        if note is None:
            raise NoteNotFoundException
        return note

    async def create_note(self, user_id: int, data: NoteRequestSchema) -> NoteOutSchema:
        note = await self.db.notes.add_obj(NoteAddSchema(user_id=user_id, **data.model_dump()))
        await self.db.save()
        return note

    async def update_note(self, note_id: int, user_id: int, data: NoteRequestSchema) -> NoteOutSchema:
        await self.get_note(note_id, user_id)
        note = await self.db.notes.edit(data, exclude_unset=False, id=note_id, user_id=user_id)
        await self.db.save()
        return note

    async def delete_note(self, note_id: int, user_id: int) -> None:
        await self.get_note(note_id, user_id)
        await self.db.notes.delete(id=note_id, user_id=user_id)
        await self.db.save()
