from sqlalchemy import text

from src.schemas.users import UserOutSchema
from src.database import engine_null_pool, Base
from src.main import app
from src.config import settings
from src.models import *  # импортируем все таблицы для Base metadata
import pytest
from httpx import ASGITransport, AsyncClient
from typing import AsyncGenerator
from src.schemas.departments import DepartmentsOutSchema

# session, “function”, “class”, “module”, “package”,
@pytest.fixture(scope="session", autouse=True)
async def check_mode():
    assert settings.MODE == "TEST"


# 1. Сбрасываем и создаем схему один раз на всю сессию тестов
@pytest.fixture(scope="session", autouse=True)
async def setup_database_schema(check_mode):
    async with engine_null_pool.begin() as conn:
        # Полностью очищаем схему public каскадом, обходя любые циклические FK
        await conn.execute(text("DROP SCHEMA public CASCADE;"))
        await conn.execute(text("CREATE SCHEMA public;"))
        # Создаем все таблицы с нуля
        await conn.run_sync(Base.metadata.create_all)

    yield

    async with engine_null_pool.begin() as conn:
        await conn.execute(text("DROP SCHEMA public CASCADE;"))
        await conn.execute(text("CREATE SCHEMA public;"))


# 2. Быстро очищаем данные перед каждым тестом
@pytest.fixture(scope="function", autouse=True)
async def setup_database():
    async with engine_null_pool.begin() as conn:
        table_names = ", ".join([f'"{table.name}"' for table in Base.metadata.sorted_tables])
        if table_names:
            await conn.execute(
                text(f"TRUNCATE TABLE {table_names} RESTART IDENTITY CASCADE;")
            )


@pytest.fixture(scope="function")
async def ac() -> AsyncClient:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


@pytest.fixture(scope="function", autouse=False)
async def test_user(setup_database, ac):
    async def wrapper(title: str = "test_user") -> UserOutSchema:
        response = await ac.post(
            "/api/users/",
            json={
                "username": title,
                "last_name": title,
                "password": title
            }
        )
        user = response.json()
        assert user['username']
        return user

    return wrapper

@pytest.fixture(scope="function", autouse=False)
async def test_department(setup_database, admin_ac):
    async def wrapper(title: str = "test_department"):
        management_response = await admin_ac.post(
            "/api/admin/managements/",
            json={"title": f"{title} management"},
        )
        assert management_response.status_code == 200
        response = await admin_ac.post(
            "/api/admin/departments/",
            json={
                "title": title,
                "description": title,
                "management_id": management_response.json()["id"],
            }
        )
        department = response.json()
        return department

    return wrapper

@pytest.fixture(scope="function", autouse=False)
async def admin_ac(ac) -> AsyncGenerator[AsyncClient]:
    response = await ac.post(
        "/api/users/",
        json={
            "username": "admin",
            "last_name": "admin",
            "status": "ADMIN",
            "password": "admin"
        }
    )
    user = response.json()
    assert user['username']
    assert response.status_code == 200

    await ac.post(
        "/api/users/login",
        json={
            "username": "admin",
            "last_name": "admin",
            "password": "admin"
        }
    )
    assert ac.cookies['access_token']
    yield ac