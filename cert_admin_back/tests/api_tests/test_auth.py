from httpx import AsyncClient
import pytest


async def test_get_me_unauthorized(ac: AsyncClient):
    """Тест получения профиля без авторизации (ожидается ошибка)."""
    response = await ac.get("/api/users/me")
    assert response.status_code in (401, 403)


async def test_add_user_success(ac: AsyncClient):
    """Тест успешного добавления пользователя."""
    payload = {
        "username": "testuser",
        "last_name": "Testov",
        "status": "HEAD",
        "password": "strongpassword123",
    }
    response = await ac.post("/api/users/", json=payload)

    assert response.status_code in (200, 201)
    data = response.json()
    assert data["username"] == payload["username"]
    assert "password" not in data


async def test_login_user_success(ac: AsyncClient, test_user):
    await test_user(title="test_user")
    payload = {
        "username": "test_user",
        "last_name": "test_user",
        "password": "test_user"
    }
    response = await ac.post("/api/users/login", json=payload)

    assert response.status_code == 200
    assert "access_token" in response.json()
    assert "access_token" in response.cookies


async def test_get_me_authorized(ac: AsyncClient, test_user):
    """Тест получения своего профиля с переданным токеном/cookie."""
    await test_user(title="test_user")
    payload = {
        "username": "test_user",
        "last_name": "test_user",
        "password": "test_user"
    }
    await ac.post("/api/users/login", json=payload)

    response = await ac.get("/api/users/me")

    assert response.status_code == 200
    assert "id" in response.json()


async def test_logout(admin_ac: AsyncClient):
    """Тест выхода из системы (удаление Cookie)."""
    response = await admin_ac.post("/api/users/logout")

    assert response.status_code == 200
    # Проверяем, что кука удалена или очищена
    assert admin_ac.cookies.get("access_token") is None

async def test_get_users(ac: AsyncClient):
    """Тест получения списка пользователей."""
    response = await ac.get("/api/users/")

    assert response.status_code == 200


async def test_get_user_roles(ac: AsyncClient):
    response = await ac.get("/api/users/roles")

    assert response.status_code == 200
    assert response.json() == [
        "ADMIN",
        "DIVISION_HEAD",
        "MANAGEMENT_HEAD",
        "HEAD",
        "DEPUTY",
        "USER",
    ]


@pytest.mark.parametrize("role", ["DIVISION_HEAD", "MANAGEMENT_HEAD"])
async def test_add_user_with_management_role(ac: AsyncClient, role: str):
    response = await ac.post(
        "/api/users/",
        json={
            "username": role.lower(),
            "last_name": "Testov",
            "status": role,
            "password": "strongpassword123",
        },
    )

    assert response.status_code in (200, 201)
    assert response.json()["status"] == role