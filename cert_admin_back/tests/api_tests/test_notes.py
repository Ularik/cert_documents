"""Личные заметки сотрудников: видны и меняются только своим автором."""
from datetime import datetime

from httpx import AsyncClient
from sqlalchemy import select

from src.database import AsyncSessionNullPool
from src.models.notes import Notes
from tests.api_tests.test_task_targets import login, org  # noqa: F401  (фикстура org)

PERIOD = {
    "deadline_from": "2026-11-01T00:00:00+06:00",
    "deadline_to": "2026-12-01T00:00:00+06:00",
}


async def create_note(ac: AsyncClient, title: str, deadlines: str, **extra) -> dict:
    response = await ac.post("/api/notes/", json={"title": title, "deadlines": deadlines, **extra})
    assert response.status_code == 200, response.text
    return response.json()


async def test_create_note_belongs_to_author(admin_ac: AsyncClient, org):
    await login(admin_ac, "user-a1")
    note = await create_note(
        admin_ac, "  Позвонить  ", "2026-11-15T14:30:00+06:00", description="Уточнить сроки"
    )
    assert note["title"] == "Позвонить"
    assert note["description"] == "Уточнить сроки"
    assert note["user_id"] == org["user_a1"]["id"]
    assert datetime.fromisoformat(note["deadlines"]) == datetime.fromisoformat("2026-11-15T14:30:00+06:00")

    async with AsyncSessionNullPool() as session:
        stored = (await session.execute(select(Notes).filter_by(id=note["id"]))).scalar_one()
    assert stored.user_id == org["user_a1"]["id"]


async def test_naive_deadline_is_bishkek_time(admin_ac: AsyncClient, org):
    note = await create_note(admin_ac, "Naive", "2026-11-15T09:00:00")
    assert datetime.fromisoformat(note["deadlines"]) == datetime.fromisoformat("2026-11-15T09:00:00+06:00")


async def test_notes_list_is_personal_and_sorted(admin_ac: AsyncClient, org):
    await login(admin_ac, "user-a1")
    late = await create_note(admin_ac, "Late", "2026-11-20T18:00:00+06:00")
    early = await create_note(admin_ac, "Early", "2026-11-20T09:00:00+06:00")
    await create_note(admin_ac, "Next month", "2026-12-01T00:00:00+06:00")

    await login(admin_ac, "user-a2")
    await create_note(admin_ac, "Someone else's", "2026-11-20T10:00:00+06:00")

    await login(admin_ac, "user-a1")
    response = await admin_ac.get("/api/notes/", params=PERIOD)
    assert response.status_code == 200, response.text
    assert [item["id"] for item in response.json()] == [early["id"], late["id"]]


async def test_management_head_can_use_notes(admin_ac: AsyncClient, org):
    await login(admin_ac, "mh-a")
    note = await create_note(admin_ac, "MH note", "2026-11-10T10:00:00+06:00")
    response = await admin_ac.get("/api/notes/", params=PERIOD)
    assert response.status_code == 200, response.text
    assert [item["id"] for item in response.json()] == [note["id"]]


async def test_update_and_delete_own_note(admin_ac: AsyncClient, org):
    await login(admin_ac, "user-a1")
    note = await create_note(admin_ac, "Draft", "2026-11-10T10:00:00+06:00", description="old")

    updated = await admin_ac.put(
        f"/api/notes/{note['id']}",
        json={"title": "Final", "description": "", "deadlines": "2026-11-11T12:00:00+06:00"},
    )
    assert updated.status_code == 200, updated.text
    body = updated.json()
    assert body["title"] == "Final"
    assert body["description"] is None
    assert datetime.fromisoformat(body["deadlines"]) == datetime.fromisoformat("2026-11-11T12:00:00+06:00")

    deleted = await admin_ac.delete(f"/api/notes/{note['id']}")
    assert deleted.status_code == 200, deleted.text
    async with AsyncSessionNullPool() as session:
        assert (await session.execute(select(Notes).filter_by(id=note["id"]))).scalar_one_or_none() is None


async def test_foreign_note_is_not_found(admin_ac: AsyncClient, org):
    await login(admin_ac, "user-a1")
    note = await create_note(admin_ac, "Private", "2026-11-10T10:00:00+06:00")

    await login(admin_ac, "user-a2")
    payload = {"title": "Hacked", "deadlines": "2026-11-10T10:00:00+06:00"}
    assert (await admin_ac.get(f"/api/notes/{note['id']}")).status_code == 404
    assert (await admin_ac.put(f"/api/notes/{note['id']}", json=payload)).status_code == 404
    assert (await admin_ac.delete(f"/api/notes/{note['id']}")).status_code == 404

    async with AsyncSessionNullPool() as session:
        stored = (await session.execute(select(Notes).filter_by(id=note["id"]))).scalar_one()
    assert stored.title == "Private"


async def test_note_validation(admin_ac: AsyncClient):
    assert (await admin_ac.post("/api/notes/", json={"title": "   ", "deadlines": "2026-11-10T10:00:00"})).status_code == 422
    assert (await admin_ac.post("/api/notes/", json={"title": "No deadline"})).status_code == 422


async def test_notes_require_auth(ac: AsyncClient):
    assert (await ac.get("/api/notes/", params=PERIOD)).status_code == 401


async def test_notes_reject_bad_period(admin_ac: AsyncClient):
    reversed_period = await admin_ac.get(
        "/api/notes/", params={"deadline_from": PERIOD["deadline_to"], "deadline_to": PERIOD["deadline_from"]}
    )
    assert reversed_period.status_code == 400
