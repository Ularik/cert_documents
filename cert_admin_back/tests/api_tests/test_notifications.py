"""Уведомления о назначении исполнителем задачи."""
from httpx import AsyncClient

from tests.api_tests.test_task_targets import login, org  # noqa: F401  (фикстура org)


async def unread(ac: AsyncClient) -> list[dict]:
    response = await ac.get("/api/notifications/", params={"unread": True})
    assert response.status_code == 200, response.text
    return response.json()


async def test_executors_are_notified_on_create(admin_ac, org):
    task = await admin_ac.post(
        "/api/admin/tasks/",
        data={
            "title": "assigned",
            "management_ids": [org["man_a"]["id"]],
            "departments_ids": [org["dep_a1"]["id"]],
            "executor_ids": [org["user_a1"]["id"], org["head_a1"]["id"]],
        },
    )
    assert task.status_code == 200, task.text
    task_id = task.json()["id"]

    for username in ("user-a1", "head-a1"):
        await login(admin_ac, username)
        items = await unread(admin_ac)
        assert [(n["task_id"], n["task_title"], n["kind"]) for n in items] == [(task_id, "assigned", "TASK_ASSIGNED")]
        assert items[0]["author_name"] == "admin admin"

    # не назначенный сотрудник уведомления не получает
    await login(admin_ac, "user-a2")
    assert await unread(admin_ac) == []


async def test_author_is_not_notified_and_only_new_executors_on_update(admin_ac, org):
    await login(admin_ac, "head-a1")
    created = await admin_ac.post(
        "/api/head/tasks/",
        data={"title": "by head", "executor_ids": [org["head_a1"]["id"], org["user_a1"]["id"]]},
    )
    assert created.status_code == 200, created.text
    task_id = created.json()["id"]
    assert await unread(admin_ac) == []  # себе не уведомляем

    await login(admin_ac, "user-a1")
    first = await unread(admin_ac)
    assert len(first) == 1
    assert (await admin_ac.post("/api/notifications/read", json={"ids": [first[0]["id"]]})).status_code == 200
    assert await unread(admin_ac) == []

    await login(admin_ac, "head-a1")
    updated = await admin_ac.put(
        f"/api/head/tasks/{task_id}",
        data={"title": "by head", "executor_ids": [org["user_a1"]["id"], org["deputy_a1"]["id"]]},
    )
    assert updated.status_code == 200, updated.text

    # уже назначенный повторно не уведомляется, новый — да
    await login(admin_ac, "user-a1")
    assert await unread(admin_ac) == []
    await login(admin_ac, "deputy-a1")
    assert [n["task_id"] for n in await unread(admin_ac)] == [task_id]


async def test_mark_read_only_own_and_all(admin_ac, org):
    await admin_ac.post(
        "/api/admin/tasks/",
        data={"title": "t1", "management_ids": [org["man_a"]["id"]], "departments_ids": [org["dep_a1"]["id"]],
              "executor_ids": [org["user_a1"]["id"], org["deputy_a1"]["id"]]},
    )
    await admin_ac.post(
        "/api/admin/tasks/",
        data={"title": "t2", "management_ids": [org["man_a"]["id"]], "departments_ids": [org["dep_a1"]["id"]],
              "executor_ids": [org["user_a1"]["id"]]},
    )

    await login(admin_ac, "deputy-a1")
    foreign_id = (await unread(admin_ac))[0]["id"]

    await login(admin_ac, "user-a1")
    items = await unread(admin_ac)
    assert [n["task_title"] for n in items] == ["t2", "t1"]  # новые сначала

    # чужое уведомление отметить нельзя
    await admin_ac.post("/api/notifications/read", json={"ids": [foreign_id]})
    await login(admin_ac, "deputy-a1")
    assert len(await unread(admin_ac)) == 1

    await login(admin_ac, "user-a1")
    assert (await admin_ac.post("/api/notifications/read", json={})).status_code == 200
    assert await unread(admin_ac) == []
    history = (await admin_ac.get("/api/notifications/")).json()
    assert len(history) == 2 and all(n["read_at"] for n in history)


async def test_notifications_require_auth(ac):
    assert (await ac.get("/api/notifications/")).status_code == 401
