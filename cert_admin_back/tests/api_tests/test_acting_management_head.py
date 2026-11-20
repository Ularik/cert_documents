"""Начальник отдела с флагом can_act_as_management_head переключается в режим
заместителя начальника управления и получает права MANAGEMENT_HEAD в своём управлении."""
import pytest
from httpx import AsyncClient
from sqlalchemy import text

from src.database import engine_null_pool
from tests.api_tests.test_task_targets import login, org  # noqa: F401  (фикстура org)


async def set_flag(admin_ac: AsyncClient, user_id: int, value: bool, management_id: int = 1):
    # пользователи фикстуры org созданы без management_id, поэтому передаём его явно
    await login(admin_ac, "admin")
    return await admin_ac.patch(
        f"/api/admin/users/{user_id}",
        json={"can_act_as_management_head": value, "management_id": management_id},
    )


async def db_flag(user_id: int) -> bool:
    async with engine_null_pool.connect() as conn:
        return (await conn.execute(
            text("SELECT can_act_as_management_head FROM users WHERE id = :id"), {"id": user_id}
        )).scalar_one()


async def act(ac: AsyncClient, role: str | None = "MANAGEMENT_HEAD"):
    return await ac.post("/api/users/switch-role", json={"role": role})


async def test_head_without_flag_cannot_switch(admin_ac, org):
    await login(admin_ac, "head-a1")
    assert (await act(admin_ac)).status_code == 403
    assert (await admin_ac.get("/api/management-head/tasks/")).status_code == 403


async def test_acting_head_gets_management_head_rights(admin_ac, org):
    response = await set_flag(admin_ac, org["head_a1"]["id"], True)
    assert response.status_code == 200, response.text
    assert response.json()["can_act_as_management_head"] is True

    await login(admin_ac, "head-a1")
    # до переключения — обычный начальник отдела
    assert (await admin_ac.get("/api/management-head/tasks/")).status_code == 403

    response = await act(admin_ac)
    assert response.status_code == 200, response.text
    me = (await admin_ac.get("/api/users/me")).json()
    assert me["status"] == "MANAGEMENT_HEAD"
    assert me["own_status"] == "HEAD"
    assert me["acting"] is True
    assert me["management_id"] == org["man_a"]["id"]

    assert (await admin_ac.get("/api/management-head/tasks/")).status_code == 200
    # общий маршрут задач начальнику управления закрыт
    assert (await admin_ac.get("/api/tasks/")).status_code == 403

    # сотрудники для выбора исполнителей — всё управление, без чужих
    user_ids = {u["id"] for u in (await admin_ac.get("/api/users/")).json()}
    assert {org["user_a1"]["id"], org["user_a2"]["id"]} <= user_ids
    assert org["user_b1"]["id"] not in user_ids

    # отделы — только своего управления
    departments = (await admin_ac.get("/api/departments/")).json()
    assert {d["id"] for d in departments} == {org["dep_a1"]["id"], org["dep_a2"]["id"]}

    # задача для другого отдела своего управления — можно, для чужого управления — нельзя
    own = await admin_ac.post(
        "/api/management-head/tasks/",
        data={"title": "for A2", "department_ids": [org["dep_a2"]["id"]]},
    )
    assert own.status_code == 200, own.text
    foreign = await admin_ac.post(
        "/api/management-head/tasks/",
        data={"title": "foreign", "management_ids": [org["man_b"]["id"]]},
    )
    assert foreign.status_code == 403

    # статус в БД не меняется
    await login(admin_ac, "admin")
    user = (await admin_ac.get(f"/api/users/{org['head_a1']['id']}")).json()
    assert user["status"] == "HEAD"


async def test_switch_back_to_head(admin_ac, org):
    await set_flag(admin_ac, org["head_a1"]["id"], True)
    await login(admin_ac, "head-a1")
    await act(admin_ac)

    response = await act(admin_ac, None)
    assert response.status_code == 200, response.text
    me = (await admin_ac.get("/api/users/me")).json()
    assert me["status"] == "HEAD"
    assert me["acting"] is False
    assert (await admin_ac.get("/api/management-head/tasks/")).status_code == 403
    assert (await admin_ac.get("/api/tasks/")).status_code == 200


async def test_revoked_flag_disables_acting_token(admin_ac, org, ac):
    await set_flag(admin_ac, org["head_a1"]["id"], True)
    await login(admin_ac, "head-a1")
    await act(admin_ac)
    acting_cookie = admin_ac.cookies["access_token"]

    await set_flag(admin_ac, org["head_a1"]["id"], False)

    # старый токен режима больше не даёт прав начальника управления
    admin_ac.cookies.set("access_token", acting_cookie)
    assert (await admin_ac.get("/api/management-head/tasks/")).status_code == 403
    me = (await admin_ac.get("/api/users/me")).json()
    assert me["status"] == "HEAD"
    assert me["acting"] is False


async def test_flag_only_for_department_head(admin_ac, org):
    response = await set_flag(admin_ac, org["user_a1"]["id"], True)
    assert response.status_code == 422
    assert await db_flag(org["user_a1"]["id"]) is False


async def test_flag_is_cleared_when_role_changes(admin_ac, org):
    await set_flag(admin_ac, org["head_a1"]["id"], True)
    response = await admin_ac.patch(
        f"/api/admin/users/{org['head_a1']['id']}",
        json={"status": "USER", "department_id": org["dep_a1"]["id"], "management_id": org["man_a"]["id"]},
    )
    assert response.status_code == 200, response.text
    assert await db_flag(org["head_a1"]["id"]) is False


async def test_management_head_can_grant_flag_in_own_management(admin_ac, org):
    await login(admin_ac, "mh-a")
    response = await admin_ac.patch(
        f"/api/management-head/users/{org['head_a1']['id']}",
        json={"can_act_as_management_head": True, "management_id": org["man_a"]["id"]},
    )
    assert response.status_code == 200, response.text
    assert await db_flag(org["head_a1"]["id"]) is True


async def test_acting_head_cannot_touch_management_head_or_grant_flag(admin_ac, org):
    await set_flag(admin_ac, org["head_a1"]["id"], True)
    await login(admin_ac, "head-a1")
    await act(admin_ac)

    demote = await admin_ac.patch(f"/api/management-head/users/{org['mh_a']['id']}", json={"status": "USER"})
    assert demote.status_code == 403
    assert (await admin_ac.delete(f"/api/management-head/users/{org['mh_a']['id']}")).status_code == 404

    # обычного сотрудника своего управления править можно
    edit = await admin_ac.patch(f"/api/management-head/users/{org['user_a2']['id']}", json={"username": "renamed"})
    assert edit.status_code == 200, edit.text

    # но раздавать флаг заместителя — нельзя
    await login(admin_ac, "admin")
    await admin_ac.patch(
        f"/api/admin/departments/{org['dep_a2']['id']}",
        json={"title": "Department A2", "management_id": org["man_a"]["id"]},
    )
    head_a2 = await admin_ac.post(
        "/api/users/",
        json={"username": "head-a2", "last_name": "Testov", "status": "HEAD",
              "password": "password", "department_id": org["dep_a2"]["id"]},
    )
    await login(admin_ac, "head-a1")
    await act(admin_ac)
    grant = await admin_ac.patch(
        f"/api/management-head/users/{head_a2.json()['id']}",
        json={"can_act_as_management_head": True},
    )
    assert grant.status_code == 403


async def test_acting_head_edits_any_task_of_own_management(admin_ac, org):
    # задачи вышестоящих: на всё управление, на отдел, на сотрудников, и задача чужого управления
    await login(admin_ac, "admin")
    whole = (await admin_ac.post("/api/admin/tasks/", data={
        "title": "admin whole A", "management_ids": [org["man_a"]["id"]]})).json()
    other_dep = (await admin_ac.post("/api/admin/tasks/", data={
        "title": "admin dep A2", "departments_ids": [org["dep_a2"]["id"]]})).json()
    spanning = (await admin_ac.post("/api/admin/tasks/", data={
        "title": "admin A+B", "management_ids": [org["man_a"]["id"], org["man_b"]["id"]]})).json()
    foreign = (await admin_ac.post("/api/admin/tasks/", data={
        "title": "admin B", "management_ids": [org["man_b"]["id"]]})).json()
    await login(admin_ac, "mh-a")
    by_mh = (await admin_ac.post("/api/management-head/tasks/", data={
        "title": "mh executors", "executor_ids": [org["user_a2"]["id"]]})).json()

    await set_flag(admin_ac, org["head_a1"]["id"], True, management_id=org["man_a"]["id"])
    await login(admin_ac, "head-a1")
    # в обычном режиме начальник отдела эти задачи не правит
    assert (await admin_ac.get(f"/api/tasks/{whole['id']}")).json()["can_edit"] is False
    await act(admin_ac)

    detail = (await admin_ac.get(f"/api/management-head/tasks/{whole['id']}")).json()
    assert detail["can_edit"] is True

    edited = await admin_ac.put(
        f"/api/management-head/tasks/{whole['id']}",
        data={"title": "renamed by acting", "executor_ids": [org["user_a1"]["id"]]},
    )
    assert edited.status_code == 200, edited.text
    assert edited.json()["title"] == "renamed by acting"
    assert edited.json()["author_id"] == whole["author_id"]

    for task in (other_dep, by_mh):
        put = await admin_ac.put(
            f"/api/management-head/tasks/{task['id']}",
            data={"title": f"{task['title']} edited by acting", "departments_ids": [org["dep_a2"]["id"]]},
        )
        assert put.status_code == 200, (task["title"], put.text)

    # задача сразу нескольких управлений и задача чужого управления — нельзя
    spanning_put = await admin_ac.put(
        f"/api/management-head/tasks/{spanning['id']}", data={"title": "hacked"})
    assert spanning_put.status_code == 403
    foreign_put = await admin_ac.put(
        f"/api/management-head/tasks/{foreign['id']}", data={"title": "hacked"})
    assert foreign_put.status_code in (403, 404)

    assert (await admin_ac.delete(f"/api/management-head/tasks/{other_dep['id']}")).status_code == 200

    # после выхода из режима права пропадают
    await act(admin_ac, None)
    assert (await admin_ac.get(f"/api/tasks/{by_mh['id']}")).json()["can_edit"] is False


async def test_management_head_edits_shared_tasks_of_head_and_acting_head(admin_ac, org):
    # начальник отдела ставит задачу на весь свой отдел
    await login(admin_ac, "head-a1")
    dep_task = (await admin_ac.post("/api/head/tasks/", data={"title": "head whole dep"})).json()
    assert dep_task["target_type"] == "DEPARTMENTS"

    # он же в режиме И.О. — на всё управление
    await set_flag(admin_ac, org["head_a1"]["id"], True, management_id=org["man_a"]["id"])
    await login(admin_ac, "head-a1")
    await act(admin_ac)
    whole = (await admin_ac.post("/api/management-head/tasks/", data={"title": "acting whole A"})).json()
    assert whole["target_type"] == "MANAGEMENTS"

    await login(admin_ac, "mh-a")
    for task, departments in ((dep_task, [org["dep_a1"]["id"]]), (whole, [])):
        detail = (await admin_ac.get(f"/api/management-head/tasks/{task['id']}")).json()
        assert detail["can_edit"] is True, task["title"]
        put = await admin_ac.put(
            f"/api/management-head/tasks/{task['id']}",
            data={"title": f"{task['title']} by mh", "departments_ids": departments},
        )
        assert put.status_code == 200, (task["title"], put.text)
        assert put.json()["author_id"] == org["head_a1"]["id"]
        assert put.json()["target_type"] == task["target_type"]

    # админ тоже правит общую задачу начальника отдела
    await login(admin_ac, "admin")
    by_admin = await admin_ac.put(
        f"/api/admin/tasks/{dep_task['id']}",
        data={"title": "head whole dep by admin", "departments_ids": [org["dep_a1"]["id"]]},
    )
    assert by_admin.status_code == 200, by_admin.text

    # заместитель начальника отдела по-прежнему не правит общую задачу своего начальника
    await login(admin_ac, "head-a1")
    shared = (await admin_ac.post("/api/head/tasks/", data={"title": "head shared 2"})).json()
    await login(admin_ac, "deputy-a1")
    assert (await admin_ac.put(f"/api/tasks/{shared['id']}", data={"title": "hacked"})).status_code == 403


@pytest.mark.parametrize("role", ["ADMIN", "HEAD"])
async def test_switch_role_rejects_other_roles(admin_ac, org, role):
    await login(admin_ac, "head-a1")
    response = await admin_ac.post("/api/users/switch-role", json={"role": role})
    assert response.status_code == 422
