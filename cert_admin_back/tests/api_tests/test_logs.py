"""Логирование: вход/выход и действия с задачами, handler'ы db_logger / file / console."""
import json
import logging

import pytest
from httpx import AsyncClient
from sqlalchemy import select

from src.database import AsyncSessionNullPool
from src.logging_conf.handlers import DatabaseHandler
from src.logging_conf.logging_conf import setup_logging
from src.models.logs import Logs


@pytest.fixture
def db_logging():
    """Все логи приложения — в таблицу logs."""
    setup_logging(handlers="db_logger", routes={})
    yield
    setup_logging(handlers="console", routes={})


async def get_logs(logger: str | None = None) -> list[Logs]:
    await DatabaseHandler.flush_pending()
    async with AsyncSessionNullPool() as session:
        # фоновые записи могут закоммититься не по порядку — сортируем по времени события
        query = select(Logs).order_by(Logs.created_at, Logs.id)
        if logger:
            query = query.where(Logs.logger == logger)
        return list((await session.execute(query)).scalars())


async def get_user_id(ac: AsyncClient) -> int:
    response = await ac.get("/api/users/me")
    assert response.status_code == 200
    return response.json()["id"]


async def test_login_and_logout_are_logged(db_logging, admin_ac: AsyncClient):
    admin_id = await get_user_id(admin_ac)

    response = await admin_ac.post("/api/users/logout", headers={"X-Real-IP": "10.1.2.3"})
    assert response.status_code == 200

    login, logout = await get_logs("app.auth")
    assert (login.message, login.user_id, login.level) == ("Вход в систему", admin_id, "INFO")
    assert (logout.message, logout.user_id) == ("Выход из системы", admin_id)
    assert logout.ip_address == "10.1.2.3"


async def test_failed_login_and_anonymous_logout_are_not_logged(db_logging, ac: AsyncClient, test_user):
    await test_user("someone")
    response = await ac.post(
        "/api/users/login",
        json={"username": "someone", "last_name": "someone", "password": "wrong"},
    )
    assert response.status_code == 401
    assert (await ac.post("/api/users/logout")).status_code == 200
    assert await get_logs() == []


async def test_task_lifecycle_is_logged(db_logging, admin_ac: AsyncClient, test_department):
    admin_id = await get_user_id(admin_ac)
    department = await test_department()

    create = await admin_ac.post(
        "/api/admin/tasks/",
        data={"title": "Лог", "departments_ids": [department["id"]]},
    )
    assert create.status_code == 200
    task_id = create.json()["id"]

    update = await admin_ac.put(
        f"/api/admin/tasks/{task_id}",
        data={"title": "Лог (правка)", "description": "описание", "departments_ids": [department["id"]]},
    )
    assert update.status_code == 200
    assert (await admin_ac.patch(f"/api/admin/tasks/{task_id}", json={"status": "DONE"})).status_code == 200
    assert (await admin_ac.delete(f"/api/admin/tasks/{task_id}")).status_code == 200

    created, updated, status, deleted = await get_logs("app.tasks")
    assert all(log.user_id == admin_id and log.data["task_id"] == task_id
               for log in (created, updated, status, deleted))

    assert created.message == "Создана задача"
    assert created.data["departments_ids"] == [department["id"]]

    assert updated.message == "Изменена задача"
    assert updated.data["changes"]["title"] == {"old": "Лог", "new": "Лог (правка)"}
    assert updated.data["changes"]["description"] == {"old": None, "new": "описание"}
    assert "departments_ids" not in updated.data["changes"]

    assert status.message == "Изменён статус задачи"
    assert status.data["status"] == {"old": "NEW", "new": "DONE"}

    assert deleted.message == "Удалена задача"
    assert deleted.data["title"] == "Лог (правка)"


async def test_failed_task_create_is_not_logged(db_logging, admin_ac: AsyncClient):
    response = await admin_ac.post("/api/admin/tasks/", data={"title": "без отдела"})
    assert response.status_code != 200
    assert await get_logs("app.tasks") == []


async def test_routes_send_log_types_to_different_handlers(admin_ac: AsyncClient, test_department, tmp_path):
    """auth -> только в файл, tasks -> только в БД."""
    log_file = tmp_path / "app.log"
    setup_logging(handlers="console", routes={"auth": "file", "tasks": "db_logger"}, log_file=str(log_file))
    try:
        department = await test_department()
        create = await admin_ac.post(
            "/api/admin/tasks/",
            data={"title": "Маршрут", "departments_ids": [department["id"]]},
        )
        assert create.status_code == 200
        await admin_ac.post("/api/users/logout")

        logs = await get_logs()
        assert [log.logger for log in logs] == ["app.tasks"]

        for handler in logging.getLogger("app.auth").handlers:
            handler.flush()
        lines = log_file.read_text(encoding="utf-8").splitlines()
        assert len(lines) == 1
        assert "app.auth" in lines[0] and "Выход из системы" in lines[0]
    finally:
        setup_logging(handlers="console", routes={})


def test_unknown_handler_is_rejected():
    with pytest.raises(ValueError, match="Неизвестный handler"):
        setup_logging(handlers="console,telegram", routes={})
    setup_logging(handlers="console", routes={})


def test_text_and_json_formatters_include_context():
    from src.logging_conf.handlers import JsonFormatter, TextFormatter

    record = logging.LogRecord("app.tasks", logging.INFO, __file__, 1, "Создана задача", None, None)
    record.user_id = 7
    record.data = {"task_id": 3}

    assert TextFormatter().format(record).endswith('Создана задача | user_id=7 data={"task_id": 3}')
    payload = json.loads(JsonFormatter().format(record))
    assert payload["msg"] == "Создана задача"
    assert payload["user_id"] == 7 and payload["data"] == {"task_id": 3}


# ---------- API журнала аудита (/api/logs) ----------

async def add_log(message: str, user_id: int | None, logger: str = "app.tasks", **kwargs) -> None:
    async with AsyncSessionNullPool() as session:
        session.add(Logs(level="INFO", logger=logger, message=message, user_id=user_id, **kwargs))
        await session.commit()


async def create_user(ac: AsyncClient, name: str, **fields) -> dict:
    response = await ac.post(
        "/api/users/",
        json={"username": name, "last_name": name, "password": "password", **fields},
    )
    assert response.status_code == 200
    return response.json()


async def login(name: str) -> AsyncClient:
    from httpx import ASGITransport
    from src.main import app

    client = AsyncClient(transport=ASGITransport(app=app), base_url="http://test")
    response = await client.post(
        "/api/users/login",
        json={"username": name, "last_name": name, "password": "password"},
    )
    assert response.status_code == 200
    return client


@pytest.fixture
async def two_managements(admin_ac: AsyncClient):
    """Два управления с отделом в каждом, начальник первого и по сотруднику в каждом."""
    setup_logging(handlers="console", routes={})
    m1 = (await admin_ac.post("/api/admin/managements/", json={"title": "M1"})).json()
    m2 = (await admin_ac.post("/api/admin/managements/", json={"title": "M2"})).json()
    d1 = (await admin_ac.post("/api/admin/departments/", json={"title": "D1", "management_id": m1["id"]})).json()
    d2 = (await admin_ac.post("/api/admin/departments/", json={"title": "D2", "management_id": m2["id"]})).json()
    return {
        "head": await create_user(admin_ac, "mhead", status="MANAGEMENT_HEAD", management_id=m1["id"]),
        "own": await create_user(admin_ac, "own", department_id=d1["id"]),
        "other": await create_user(admin_ac, "other", department_id=d2["id"]),
    }


async def test_admin_sees_all_logs_newest_first(admin_ac: AsyncClient, two_managements):
    users = two_managements
    await add_log("первый", users["own"]["id"])
    await add_log("второй", users["other"]["id"], logger="app.auth")
    await add_log("системный", None)

    response = await admin_ac.get("/api/logs/")
    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 3
    assert [item["message"] for item in body["items"]] == ["системный", "второй", "первый"]
    assert body["items"][1]["user"]["username"] == "other"
    assert body["items"][0]["user"] is None

    types = await admin_ac.get("/api/logs/types")
    assert types.json() == ["app.auth", "app.tasks"]


async def test_logs_filters(admin_ac: AsyncClient, two_managements):
    users = two_managements
    await add_log("Создана задача", users["own"]["id"])
    await add_log("Вход в систему", users["own"]["id"], logger="app.auth")
    await add_log("Удалена задача", users["other"]["id"])

    async def messages(**params) -> list[str]:
        response = await admin_ac.get("/api/logs/", params=params)
        assert response.status_code == 200
        return sorted(item["message"] for item in response.json()["items"])

    assert await messages(logger="app.auth") == ["Вход в систему"]
    assert await messages(user_id=users["other"]["id"]) == ["Удалена задача"]
    assert await messages(search="задача") == ["Создана задача", "Удалена задача"]
    assert await messages(from_date="2000-01-01", to_date="2000-01-02") == []

    page = (await admin_ac.get("/api/logs/", params={"limit": 2, "offset": 2})).json()
    assert page["total"] == 3 and len(page["items"]) == 1


async def test_management_head_sees_only_own_management(admin_ac: AsyncClient, two_managements):
    users = two_managements
    await add_log("свой сотрудник", users["own"]["id"])
    await add_log("сам начальник", users["head"]["id"])
    await add_log("чужое управление", users["other"]["id"])
    await add_log("без пользователя", None)

    head_client = await login("mhead")
    try:
        response = await head_client.get("/api/logs/")
        assert response.status_code == 200
        assert sorted(item["message"] for item in response.json()["items"]) == ["сам начальник", "свой сотрудник"]
        assert response.json()["total"] == 2
    finally:
        await head_client.aclose()


@pytest.mark.parametrize("role", ["HEAD", "DEPUTY", "USER"])
async def test_lower_roles_have_no_access_to_logs(ac: AsyncClient, role: str):
    await create_user(ac, f"{role.lower()}_user", status=role)
    client = await login(f"{role.lower()}_user")
    try:
        assert (await client.get("/api/logs/")).status_code == 403
        assert (await client.get("/api/logs/types")).status_code == 403
    finally:
        await client.aclose()


async def test_logs_require_auth(ac: AsyncClient):
    assert (await ac.get("/api/logs/")).status_code == 401
