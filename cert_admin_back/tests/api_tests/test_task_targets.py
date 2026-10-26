"""Адресаты задач (управления / отделы / сотрудники) и права на их изменение."""
import pytest
from httpx import AsyncClient

PASSWORD = "password"


async def login(ac: AsyncClient, username: str) -> None:
    # админа создаёт фикстура admin_ac с last_name == "admin"
    last_name = "admin" if username == "admin" else "Testov"
    response = await ac.post(
        "/api/users/login",
        json={"username": username, "last_name": last_name, "password": "admin" if username == "admin" else PASSWORD},
    )
    assert response.status_code == 200, response.text


async def make_user(admin_ac: AsyncClient, username: str, status: str, **extra) -> dict:
    response = await admin_ac.post(
        "/api/users/",
        json={"username": username, "last_name": "Testov", "status": status, "password": PASSWORD, **extra},
    )
    assert response.status_code == 200, response.text
    return response.json()


async def make_management(admin_ac: AsyncClient, title: str) -> dict:
    response = await admin_ac.post("/api/admin/managements/", json={"title": title})
    assert response.status_code == 200, response.text
    return response.json()


async def make_department(admin_ac: AsyncClient, title: str, management_id: int) -> dict:
    response = await admin_ac.post(
        "/api/admin/departments/",
        json={"title": title, "management_id": management_id},
    )
    assert response.status_code == 200, response.text
    return response.json()


@pytest.fixture
async def org(admin_ac: AsyncClient) -> dict:
    """Управления A (отделы A1, A2) и B (отдел B1) и по сотруднику на каждую роль."""
    man_a = await make_management(admin_ac, "Management A")
    man_b = await make_management(admin_ac, "Management B")
    dep_a1 = await make_department(admin_ac, "Department A1", man_a["id"])
    dep_a2 = await make_department(admin_ac, "Department A2", man_a["id"])
    dep_b1 = await make_department(admin_ac, "Department B1", man_b["id"])
    return {
        "man_a": man_a,
        "man_b": man_b,
        "dep_a1": dep_a1,
        "dep_a2": dep_a2,
        "dep_b1": dep_b1,
        "mh_a": await make_user(admin_ac, "mh-a", "MANAGEMENT_HEAD", management_id=man_a["id"]),
        "head_a1": await make_user(admin_ac, "head-a1", "HEAD", department_id=dep_a1["id"]),
        "deputy_a1": await make_user(admin_ac, "deputy-a1", "DEPUTY", department_id=dep_a1["id"]),
        "user_a1": await make_user(admin_ac, "user-a1", "USER", department_id=dep_a1["id"]),
        "user_a2": await make_user(admin_ac, "user-a2", "USER", department_id=dep_a2["id"]),
        "user_b1": await make_user(admin_ac, "user-b1", "USER", department_id=dep_b1["id"]),
    }


async def create_admin_task(admin_ac: AsyncClient, title: str, **data) -> dict:
    response = await admin_ac.post("/api/admin/tasks/", data={"title": title, **data})
    assert response.status_code == 200, response.text
    return response.json()


def put_data(title: str, **data) -> dict:
    return {"title": title, **data}


# ---------------------------------------------------------------------------
# Создание: три вида адресатов
# ---------------------------------------------------------------------------

async def test_task_for_several_managements_without_departments(admin_ac, org):
    created = await create_admin_task(
        admin_ac,
        "managements only",
        management_ids=[org["man_a"]["id"], org["man_b"]["id"]],
    )
    assert created["target_type"] == "MANAGEMENTS"
    assert set(created["management_ids"]) == {org["man_a"]["id"], org["man_b"]["id"]}

    detail = (await admin_ac.get(f"/api/tasks/{created['id']}")).json()
    assert {m["id"] for m in detail["managements"]} == {org["man_a"]["id"], org["man_b"]["id"]}
    assert detail["departments"] == []
    assert detail["executors"] == []
    assert detail["can_edit"] is True


async def test_task_for_departments_derives_managements(admin_ac, org):
    created = await create_admin_task(
        admin_ac,
        "departments",
        departments_ids=[org["dep_a1"]["id"], org["dep_b1"]["id"]],
    )
    assert created["target_type"] == "DEPARTMENTS"
    assert set(created["management_ids"]) == {org["man_a"]["id"], org["man_b"]["id"]}


async def test_task_for_executors_without_departments(admin_ac, org):
    created = await create_admin_task(
        admin_ac,
        "executors only",
        executor_ids=[org["user_a1"]["id"], org["user_b1"]["id"]],
    )
    assert created["target_type"] == "EXECUTORS"
    assert set(created["management_ids"]) == {org["man_a"]["id"], org["man_b"]["id"]}

    detail = (await admin_ac.get(f"/api/tasks/{created['id']}")).json()
    assert {d["id"] for d in detail["departments"]} == {org["dep_a1"]["id"], org["dep_b1"]["id"]}


async def test_department_outside_selected_managements_is_rejected(admin_ac, org):
    response = await admin_ac.post(
        "/api/admin/tasks/",
        data={
            "title": "wrong department",
            "management_ids": [org["man_a"]["id"]],
            "departments_ids": [org["dep_b1"]["id"]],
        },
    )
    assert response.status_code == 400


async def test_selected_management_without_department_is_rejected_when_departments_chosen(admin_ac, org):
    response = await admin_ac.post(
        "/api/admin/tasks/",
        data={
            "title": "extra management",
            "management_ids": [org["man_a"]["id"], org["man_b"]["id"]],
            "departments_ids": [org["dep_a1"]["id"]],
        },
    )
    assert response.status_code == 400


async def test_executor_outside_selected_departments_is_rejected(admin_ac, org):
    response = await admin_ac.post(
        "/api/admin/tasks/",
        data={
            "title": "wrong executor",
            "departments_ids": [org["dep_a1"]["id"]],
            "executor_ids": [org["user_a2"]["id"]],
        },
    )
    assert response.status_code == 400


async def test_task_without_any_target_is_rejected(admin_ac):
    response = await admin_ac.post("/api/admin/tasks/", data={"title": "nobody"})
    assert response.status_code == 400


async def test_management_head_is_limited_to_own_management(admin_ac, org):
    await login(admin_ac, "mh-a")
    foreign = await admin_ac.post(
        "/api/management-head/tasks/",
        data={"title": "foreign", "management_ids": [org["man_b"]["id"]]},
    )
    assert foreign.status_code == 403

    own = await admin_ac.post("/api/management-head/tasks/", data={"title": "own whole management"})
    assert own.status_code == 200, own.text
    assert own.json()["management_ids"] == [org["man_a"]["id"]]
    assert own.json()["target_type"] == "MANAGEMENTS"


async def test_head_always_targets_own_department(admin_ac, org):
    await login(admin_ac, "head-a1")
    response = await admin_ac.post(
        "/api/head/tasks/",
        data={"title": "head task", "departments_ids": [org["dep_a2"]["id"]]},
    )
    assert response.status_code == 200, response.text
    detail = (await admin_ac.get(f"/api/tasks/{response.json()['id']}")).json()
    assert [d["id"] for d in detail["departments"]] == [org["dep_a1"]["id"]]
    assert detail["target_type"] == "DEPARTMENTS"


# ---------------------------------------------------------------------------
# Права на изменение
# ---------------------------------------------------------------------------

async def test_shared_tasks_are_editable_only_by_author(admin_ac, org):
    management_task = await create_admin_task(
        admin_ac, "shared managements", management_ids=[org["man_a"]["id"]]
    )
    department_task = await create_admin_task(
        admin_ac, "shared departments", departments_ids=[org["dep_a1"]["id"]]
    )

    for username, route in (("mh-a", "management-head"), ("head-a1", "head")):
        await login(admin_ac, username)
        for task in (management_task, department_task):
            put = await admin_ac.put(
                f"/api/{route}/tasks/{task['id']}",
                data=put_data("hacked", departments_ids=[org["dep_a1"]["id"]]),
            )
            assert put.status_code == 403, (username, put.text)
            delete = await admin_ac.delete(f"/api/{route}/tasks/{task['id']}")
            assert delete.status_code == 403, (username, delete.text)

    await login(admin_ac, "admin")
    updated = await admin_ac.put(
        f"/api/admin/tasks/{management_task['id']}",
        data=put_data("renamed by author", management_ids=[org["man_a"]["id"]]),
    )
    assert updated.status_code == 200, updated.text
    assert updated.json()["title"] == "renamed by author"

    deleted = await admin_ac.delete(f"/api/admin/tasks/{department_task['id']}")
    assert deleted.status_code == 200


async def test_can_edit_flag_reflects_rights(admin_ac, org):
    shared = await create_admin_task(admin_ac, "flag shared", departments_ids=[org["dep_a1"]["id"]])
    await login(admin_ac, "head-a1")
    detail = await admin_ac.get(f"/api/tasks/{shared['id']}")
    assert detail.json()["can_edit"] is False
    listing = await admin_ac.get("/api/tasks/")
    assert [item["can_edit"] for item in listing.json()["items"] if item["id"] == shared["id"]] == [False]


async def test_higher_role_edits_executor_task_of_lower_role_but_not_vice_versa(admin_ac, org):
    # сотрудник ставит задачу коллеге по отделу
    await login(admin_ac, "user-a1")
    by_user = await admin_ac.post(
        "/api/tasks/",
        data={"title": "from user", "executor_ids": [org["deputy_a1"]["id"]]},
    )
    assert by_user.status_code == 200, by_user.text
    assert by_user.json()["target_type"] == "EXECUTORS"

    # начальник отдела выше сотрудника и отдел задачи — его
    await login(admin_ac, "head-a1")
    edited = await admin_ac.put(
        f"/api/head/tasks/{by_user.json()['id']}",
        data=put_data("edited by head", executor_ids=[org["user_a1"]["id"]]),
    )
    assert edited.status_code == 200, edited.text
    assert edited.json()["title"] == "edited by head"
    assert edited.json()["author_id"] == org["user_a1"]["id"]  # автор не перешёл к редактору

    # а теперь задача начальника: сотрудник и заместитель её менять не могут
    by_head = await admin_ac.post(
        "/api/head/tasks/",
        data={"title": "from head", "executor_ids": [org["user_a1"]["id"]]},
    )
    assert by_head.status_code == 200, by_head.text

    for username in ("user-a1", "deputy-a1"):
        await login(admin_ac, username)
        put = await admin_ac.put(
            f"/api/tasks/{by_head.json()['id']}",
            data=put_data("hacked", executor_ids=[org["user_a1"]["id"]]),
        )
        assert put.status_code == 403, (username, put.text)
        delete = await admin_ac.delete(f"/api/tasks/{by_head.json()['id']}")
        assert delete.status_code == 403, (username, delete.text)

    # начальник управления выше начальника отдела
    await login(admin_ac, "mh-a")
    by_manager = await admin_ac.put(
        f"/api/management-head/tasks/{by_head.json()['id']}",
        data=put_data("edited by manager", executor_ids=[org["user_a1"]["id"]]),
    )
    assert by_manager.status_code == 200, by_manager.text

    # админ выше всех
    await login(admin_ac, "admin")
    by_admin = await admin_ac.put(
        f"/api/admin/tasks/{by_head.json()['id']}",
        data=put_data("edited by admin", executor_ids=[org["user_a1"]["id"]]),
    )
    assert by_admin.status_code == 200, by_admin.text


async def test_head_cannot_edit_executor_task_of_other_department(admin_ac, org):
    other = await create_admin_task(admin_ac, "other department", executor_ids=[org["user_a2"]["id"]])
    await login(admin_ac, "head-a1")
    put = await admin_ac.put(
        f"/api/head/tasks/{other['id']}",
        data=put_data("hacked", executor_ids=[org["user_a1"]["id"]]),
    )
    assert put.status_code == 403


async def test_management_head_cannot_edit_executor_task_spanning_other_management(admin_ac, org):
    spanning = await create_admin_task(
        admin_ac,
        "spanning",
        executor_ids=[org["user_a1"]["id"], org["user_b1"]["id"]],
    )
    await login(admin_ac, "mh-a")
    put = await admin_ac.put(
        f"/api/management-head/tasks/{spanning['id']}",
        data=put_data("hacked", executor_ids=[org["user_a1"]["id"]]),
    )
    assert put.status_code == 403


async def test_update_can_narrow_task_down_to_managements(admin_ac, org):
    task = await create_admin_task(
        admin_ac,
        "narrow",
        management_ids=[org["man_a"]["id"]],
        departments_ids=[org["dep_a1"]["id"]],
        executor_ids=[org["user_a1"]["id"]],
    )
    assert task["target_type"] == "EXECUTORS"

    updated = await admin_ac.put(
        f"/api/admin/tasks/{task['id']}",
        data=put_data("narrow", management_ids=[org["man_a"]["id"], org["man_b"]["id"]]),
    )
    assert updated.status_code == 200, updated.text
    assert updated.json()["target_type"] == "MANAGEMENTS"

    detail = (await admin_ac.get(f"/api/tasks/{task['id']}")).json()
    assert detail["departments"] == []
    assert detail["executors"] == []
    assert {m["id"] for m in detail["managements"]} == {org["man_a"]["id"], org["man_b"]["id"]}


# ---------------------------------------------------------------------------
# Видимость и статус
# ---------------------------------------------------------------------------

async def test_management_wide_task_shows_up_for_its_departments(admin_ac, org):
    whole = await create_admin_task(admin_ac, "whole management A", management_ids=[org["man_a"]["id"]])
    other = await create_admin_task(admin_ac, "whole management B", management_ids=[org["man_b"]["id"]])

    for department in (org["dep_a1"], org["dep_a2"]):
        listing = await admin_ac.get("/api/tasks/", params={"department_id": department["id"]})
        ids = {item["id"] for item in listing.json()["items"]}
        assert whole["id"] in ids
        assert other["id"] not in ids


async def test_status_change_follows_target_scope(admin_ac, org):
    whole = await create_admin_task(admin_ac, "status whole A", management_ids=[org["man_a"]["id"]])
    dep_task = await create_admin_task(admin_ac, "status dep A1", departments_ids=[org["dep_a1"]["id"]])

    await login(admin_ac, "user-a2")
    assert (await admin_ac.patch(f"/api/tasks/{whole['id']}", json={"status": "PROGRESS"})).status_code == 200
    assert (await admin_ac.patch(f"/api/tasks/{dep_task['id']}", json={"status": "PROGRESS"})).status_code == 403

    await login(admin_ac, "user-b1")
    assert (await admin_ac.patch(f"/api/tasks/{whole['id']}", json={"status": "PROGRESS"})).status_code == 403

    await login(admin_ac, "mh-a")
    assert (
        await admin_ac.patch(f"/api/management-head/tasks/{whole['id']}", json={"status": "DONE"})
    ).status_code == 200


async def test_reply_and_documents_follow_task_managements(admin_ac, org):
    both = await create_admin_task(
        admin_ac,
        "reply scope",
        management_ids=[org["man_a"]["id"], org["man_b"]["id"]],
    )
    only_a = await create_admin_task(admin_ac, "reply scope A", management_ids=[org["man_a"]["id"]])

    await login(admin_ac, "user-b1")
    assert (await admin_ac.get(f"/api/tasks/{both['id']}/tasks_reply")).status_code == 200
    assert (await admin_ac.get(f"/api/tasks/{only_a['id']}/tasks_reply")).status_code == 404
    assert (await admin_ac.get(f"/api/tasks/{only_a['id']}")).status_code == 404
