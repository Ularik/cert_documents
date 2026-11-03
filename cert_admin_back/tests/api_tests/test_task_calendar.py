"""Срок задачи с временем и календарь задач на главной панели."""
from datetime import datetime

from httpx import AsyncClient

from tests.api_tests.test_task_targets import create_admin_task, login, org  # noqa: F401  (фикстура org)

CALENDAR_PARAMS = {
    "deadline_from": "2026-11-01T00:00:00+06:00",
    "deadline_to": "2026-12-01T00:00:00+06:00",
}


async def test_deadline_keeps_time(admin_ac: AsyncClient, org):
    created = await create_admin_task(
        admin_ac,
        "Task with time",
        deadlines="2026-11-15T14:30:00+06:00",
        management_ids=[org["man_a"]["id"]],
    )
    detail = (await admin_ac.get(f"/api/tasks/{created['id']}")).json()
    assert datetime.fromisoformat(detail["deadlines"]) == datetime.fromisoformat("2026-11-15T14:30:00+06:00")


async def test_naive_deadline_is_bishkek_time(admin_ac: AsyncClient, org):
    created = await create_admin_task(
        admin_ac,
        "Naive deadline",
        deadlines="2026-11-15T09:00:00",
        management_ids=[org["man_a"]["id"]],
    )
    detail = (await admin_ac.get(f"/api/tasks/{created['id']}")).json()
    assert datetime.fromisoformat(detail["deadlines"]) == datetime.fromisoformat("2026-11-15T09:00:00+06:00")


async def test_calendar_returns_tasks_in_period_sorted(admin_ac: AsyncClient, org):
    man_a = org["man_a"]["id"]
    late = await create_admin_task(admin_ac, "Late", deadlines="2026-11-20T18:00:00+06:00", management_ids=[man_a])
    early = await create_admin_task(admin_ac, "Early", deadlines="2026-11-20T09:00:00+06:00", management_ids=[man_a])
    await create_admin_task(admin_ac, "Next month", deadlines="2026-12-01T00:00:00+06:00", management_ids=[man_a])
    await create_admin_task(admin_ac, "No deadline", management_ids=[man_a])

    response = await admin_ac.get("/api/tasks/calendar", params=CALENDAR_PARAMS)
    assert response.status_code == 200, response.text
    assert [item["id"] for item in response.json()] == [early["id"], late["id"]]


async def test_calendar_filters_by_department(admin_ac: AsyncClient, org):
    in_a1 = await create_admin_task(
        admin_ac, "A1 task", deadlines="2026-11-10T10:00:00+06:00", departments_ids=[org["dep_a1"]["id"]]
    )
    await create_admin_task(
        admin_ac, "A2 task", deadlines="2026-11-10T10:00:00+06:00", departments_ids=[org["dep_a2"]["id"]]
    )

    response = await admin_ac.get(
        "/api/tasks/calendar", params={**CALENDAR_PARAMS, "department_id": org["dep_a1"]["id"]}
    )
    assert response.status_code == 200, response.text
    assert [item["id"] for item in response.json()] == [in_a1["id"]]


async def test_management_head_calendar_is_scoped_to_own_management(admin_ac: AsyncClient, org):
    own = await create_admin_task(
        admin_ac, "Own management", deadlines="2026-11-10T10:00:00+06:00", management_ids=[org["man_a"]["id"]]
    )
    await create_admin_task(
        admin_ac, "Other management", deadlines="2026-11-10T10:00:00+06:00", management_ids=[org["man_b"]["id"]]
    )

    await login(admin_ac, "mh-a")
    response = await admin_ac.get("/api/management-head/tasks/calendar", params=CALENDAR_PARAMS)
    assert response.status_code == 200, response.text
    assert [item["id"] for item in response.json()] == [own["id"]]

    foreign = await admin_ac.get(
        "/api/management-head/tasks/calendar",
        params={**CALENDAR_PARAMS, "management_id": org["man_b"]["id"]},
    )
    assert foreign.status_code == 403


async def test_calendar_rejects_bad_period(admin_ac: AsyncClient):
    reversed_period = await admin_ac.get(
        "/api/tasks/calendar",
        params={"deadline_from": CALENDAR_PARAMS["deadline_to"], "deadline_to": CALENDAR_PARAMS["deadline_from"]},
    )
    assert reversed_period.status_code == 400

    too_long = await admin_ac.get(
        "/api/tasks/calendar",
        params={"deadline_from": "2026-01-01T00:00:00+06:00", "deadline_to": "2026-06-01T00:00:00+06:00"},
    )
    assert too_long.status_code == 400
