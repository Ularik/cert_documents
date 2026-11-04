from datetime import datetime

from fastapi import APIRouter

from src.routers.dependencies import AuthUserDep, DBDep
from src.schemas.notes import NoteOutSchema, NoteRequestSchema
from src.services.notes_service import NotesService


router = APIRouter(prefix="/notes", tags=["Личные заметки"])


@router.get("/")
async def get_notes(
        db: DBDep,
        user: AuthUserDep,
        deadline_from: datetime,
        deadline_to: datetime,
) -> list[NoteOutSchema]:
    """Свои заметки со сроком в периоде [deadline_from, deadline_to) — для календаря."""
    return await NotesService(db).get_notes(
        user_id=user.user_id,
        deadline_from=deadline_from,
        deadline_to=deadline_to,
    )


@router.post("/")
async def create_note(db: DBDep, user: AuthUserDep, data: NoteRequestSchema) -> NoteOutSchema:
    return await NotesService(db).create_note(user_id=user.user_id, data=data)


@router.get("/{note_id}")
async def get_note(db: DBDep, user: AuthUserDep, note_id: int) -> NoteOutSchema:
    return await NotesService(db).get_note(note_id=note_id, user_id=user.user_id)


@router.put("/{note_id}")
async def update_note(db: DBDep, user: AuthUserDep, note_id: int, data: NoteRequestSchema) -> NoteOutSchema:
    return await NotesService(db).update_note(note_id=note_id, user_id=user.user_id, data=data)


@router.delete("/{note_id}")
async def delete_note(db: DBDep, user: AuthUserDep, note_id: int):
    await NotesService(db).delete_note(note_id=note_id, user_id=user.user_id)
    return {"status": "delete success"}
