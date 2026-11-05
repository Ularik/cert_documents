from sqlalchemy import select

from src.database import AsyncSessionNullPool
from src.models.users import Users


async def _login(ac, username: str, password: str):
    return await ac.post(
        "/api/users/login",
        json={"username": username, "last_name": username, "password": password},
    )


async def test_admin_resets_user_password(admin_ac, ac):
    created = await admin_ac.post(
        "/api/users/",
        json={"username": "reset-target", "last_name": "reset-target", "password": "old-password"},
    )
    assert created.status_code == 200
    user_id = created.json()["id"]

    async with AsyncSessionNullPool() as session:
        old_hash = (await session.execute(
            select(Users.hashed_password).filter_by(id=user_id)
        )).scalar_one()

    response = await admin_ac.patch(
        f"/api/admin/users/{user_id}/password",
        json={"password": "new-password"},
    )
    assert response.status_code == 200

    async with AsyncSessionNullPool() as session:
        new_hash = (await session.execute(
            select(Users.hashed_password).filter_by(id=user_id)
        )).scalar_one()
    assert new_hash != old_hash

    assert (await _login(admin_ac, "reset-target", "old-password")).status_code == 401
    assert (await _login(admin_ac, "reset-target", "new-password")).status_code == 200


async def test_password_reset_validation_and_not_found(admin_ac):
    too_short = await admin_ac.patch("/api/admin/users/1/password", json={"password": "short"})
    assert too_short.status_code == 422

    missing = await admin_ac.patch("/api/admin/users/999999/password", json={"password": "new-password"})
    assert missing.status_code == 404


async def test_division_head_cannot_reset_password(admin_ac):
    await admin_ac.post(
        "/api/users/",
        json={"username": "dh", "last_name": "dh", "status": "DIVISION_HEAD", "password": "dh-password"},
    )
    target = await admin_ac.post(
        "/api/users/",
        json={"username": "victim", "last_name": "victim", "password": "victim-password"},
    )
    assert (await _login(admin_ac, "dh", "dh-password")).status_code == 200

    response = await admin_ac.patch(
        f"/api/admin/users/{target.json()['id']}/password",
        json={"password": "new-password"},
    )
    assert response.status_code == 403
