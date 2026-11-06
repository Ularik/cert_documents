"""Выполненная задача не просрочена и не попадает в срочные."""
from datetime import datetime, timedelta, timezone

from httpx import AsyncClient

from tests.api_tests.test_task_calendar import _expire_tasks, _is_expired
from tests.api_tests.test_task_targets import create_admin_task, org  # noqa: F401  (фикстура org)


def _ids(response) -> list[int]:
    assert response.status_code == 200, response.text
    return [item["id"] for item in response.json()["items"]]


async def test_done_task_is_not_expired(admin_ac: AsyncClient, org):
    task = await create_admin_task(
        admin_ac, "Overdue", deadlines="2020-01-01T10:00:00+06:00", management_ids=[org["man_a"]["id"]]
    )
    await _expire_tasks()
    assert await _is_expired(task["id"]) is True
    assert task["id"] in _ids(await admin_ac.get("/api/tasks/", params={"is_expired": True}))

    response = await admin_ac.patch(f"/api/tasks/{task['id']}", json={"status": "DONE"})
    assert response.status_code == 200, response.text

    assert await _is_expired(task["id"]) is False
    assert task["id"] not in _ids(await admin_ac.get("/api/tasks/", params={"is_expired": True}))

    # повторный прогон celery-задачи не возвращает отметку выполненной задаче
    await _expire_tasks()
    assert await _is_expired(task["id"]) is False


async def test_done_task_is_not_rush(admin_ac: AsyncClient, org):
    man_a = org["man_a"]["id"]
    soon = (datetime.now(timezone.utc) + timedelta(hours=12)).isoformat()
    upcoming = await create_admin_task(admin_ac, "Soon", deadlines=soon, management_ids=[man_a])
    overdue = await create_admin_task(admin_ac, "Overdue", deadlines="2020-01-01T10:00:00+06:00", management_ids=[man_a])

    for params in ({"rush": True}, {"extra_rush": True}):
        ids = _ids(await admin_ac.get("/api/tasks/", params=params))
        assert upcoming["id"] in ids and overdue["id"] in ids

    for task in (upcoming, overdue):
        response = await admin_ac.patch(f"/api/tasks/{task['id']}", json={"status": "DONE"})
        assert response.status_code == 200, response.text

    for params in ({"rush": True}, {"extra_rush": True}):
        ids = _ids(await admin_ac.get("/api/tasks/", params=params))
        assert upcoming["id"] not in ids and overdue["id"] not in ids
