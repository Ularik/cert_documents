"""Просрочка задачи: флаг is_expired ставится после 00:00 и не снимается при завершении."""
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from httpx import AsyncClient

from tests.api_tests.test_task_calendar import _expire_tasks, _is_expired
from tests.api_tests.test_task_targets import create_admin_task, org  # noqa: F401  (фикстура org)


def _ids(response) -> list[int]:
    assert response.status_code == 200, response.text
    return [item["id"] for item in response.json()["items"]]


def _passed_today() -> str:
    """Момент между сегодняшней полуночью (Asia/Bishkek) и текущим временем."""
    now = datetime.now(ZoneInfo("Asia/Bishkek"))
    midnight = now.replace(hour=0, minute=0, second=0, microsecond=0)
    return (midnight + (now - midnight) / 2).isoformat()


async def test_expired_after_midnight_stays_expired_when_done(admin_ac: AsyncClient, org):
    task = await create_admin_task(
        admin_ac, "Overdue", deadlines="2020-01-01T10:00:00+06:00", management_ids=[org["man_a"]["id"]]
    )
    await _expire_tasks()
    assert await _is_expired(task["id"]) is True
    assert task["id"] in _ids(await admin_ac.get("/api/tasks/", params={"is_expired": True}))

    response = await admin_ac.patch(f"/api/tasks/{task['id']}", json={"status": "DONE"})
    assert response.status_code == 200, response.text

    # завершили после полуночи — отметка просрочки сохраняется
    assert await _is_expired(task["id"]) is True
    assert task["id"] in _ids(await admin_ac.get("/api/tasks/", params={"is_expired": True}))


async def test_deadline_passed_today_is_shown_expired_without_flag(admin_ac: AsyncClient, org):
    task = await create_admin_task(
        admin_ac, "Today", deadlines=_passed_today(), management_ids=[org["man_a"]["id"]]
    )
    await _expire_tasks()
    # полночь ещё не наступила — флаг не ставится, но задача уже отображается просроченной
    assert not await _is_expired(task["id"])
    assert task["id"] in _ids(await admin_ac.get("/api/tasks/", params={"is_expired": True}))

    # завершили до полуночи — задача не просрочена
    response = await admin_ac.patch(f"/api/tasks/{task['id']}", json={"status": "DONE"})
    assert response.status_code == 200, response.text
    assert task["id"] not in _ids(await admin_ac.get("/api/tasks/", params={"is_expired": True}))

    await _expire_tasks()
    assert not await _is_expired(task["id"])


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
