"""Пользователи из ADMIN_USERS получают права админа, сохраняя свой статус в БД."""
from httpx import AsyncClient
from sqlalchemy import text

from src.database import engine_null_pool

from src.config import AdminUser, settings


async def _register_and_login(ac: AsyncClient, username: str, last_name: str, password: str = "password123"):
    response = await ac.post(
        "/api/users/", json={"username": username, "last_name": last_name, "password": password}
    )
    assert response.status_code == 200, response.text
    response = await ac.post(
        "/api/users/login", json={"username": username, "last_name": last_name, "password": password}
    )
    assert response.status_code == 200, response.text


async def _db_status(username: str, last_name: str) -> str:
    async with engine_null_pool.connect() as conn:
        return (await conn.execute(
            text("SELECT status FROM users WHERE username = :u AND last_name = :l"), {"u": username, "l": last_name}
        )).scalar_one()


async def test_env_admin_gets_admin_rights_keeping_own_status(ac: AsyncClient, setup_database, monkeypatch):
    monkeypatch.setattr(settings, "ADMIN_USERS", [AdminUser(username="Иван", surname="Иванов")])

    await _register_and_login(ac, "Иван", "Иванов")

    me = await ac.get("/api/users/me")
    assert me.status_code == 200, me.text
    assert me.json()["status"] == "ADMIN"
    assert me.json()["own_status"] == "USER"
    assert (await ac.post("/api/admin/managements/", json={"title": "Управление"})).status_code == 200

    # статус в БД не меняется
    assert await _db_status("Иван", "Иванов") == "USER"


async def test_not_listed_user_stays_regular(ac: AsyncClient, setup_database, monkeypatch):
    monkeypatch.setattr(settings, "ADMIN_USERS", [AdminUser(username="Иван", surname="Иванов")])

    await _register_and_login(ac, "Иван", "Петров")

    me = await ac.get("/api/users/me")
    assert me.json()["status"] == "USER"
    assert me.json()["own_status"] == "USER"
    assert (await ac.post("/api/admin/managements/", json={"title": "Управление"})).status_code == 403


async def test_real_admin_is_hidden(admin_ac: AsyncClient, monkeypatch):
    monkeypatch.setattr(settings, "ADMIN_USERS", [])
    me = (await admin_ac.get("/api/users/me")).json()
    assert me["status"] == "ADMIN"

    users = await admin_ac.get("/api/users/")
    assert users.status_code == 200, users.text
    assert me["id"] not in [u["id"] for u in users.json()]
    assert (await admin_ac.get(f"/api/users/{me['id']}")).status_code == 200  # себя видно

    stats = await admin_ac.get("/api/admin/users/tasks-stats")
    assert stats.status_code == 200, stats.text
    assert me["id"] not in [u["id"] for u in stats.json()]


async def test_real_admin_is_hidden_from_env_admin(admin_ac: AsyncClient, ac: AsyncClient, monkeypatch):
    admin_id = (await admin_ac.get("/api/users/me")).json()["id"]
    monkeypatch.setattr(settings, "ADMIN_USERS", [AdminUser(username="Иван", surname="Иванов")])
    await _register_and_login(ac, "Иван", "Иванов")

    assert admin_id not in [u["id"] for u in (await ac.get("/api/users/")).json()]
    assert (await ac.get(f"/api/users/{admin_id}")).status_code == 404
