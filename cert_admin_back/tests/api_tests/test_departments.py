from httpx import AsyncClient


async def test_get_departments(ac: AsyncClient):
    res = await ac.get('/api/departments/')
    assert res.status_code == 200


async def test_403_post_dep(ac: AsyncClient, test_user):
    await test_user(title="test_user")
    payload = {
        "username": "test_user",
        "last_name": "test_user",
        "password": "test_user"
    }
    await ac.post("/api/users/login", json=payload)

    payload = {
        "title": "test dep",
        "description": "test descript",
        "management_id": 1,
    }
    res = await ac.post("/api/admin/departments/", json=payload)
    assert res.status_code == 403


async def test_201_post_dep(admin_ac: AsyncClient):
    management_res = await admin_ac.post(
        "/api/admin/managements/",
        json={"title": "test management"},
    )
    assert management_res.status_code == 200
    res = await admin_ac.post(
        "/api/admin/departments/",
        json={
            "title": "test dep",
            "description": "test descript",
            "management_id": management_res.json()["id"],
        },
    )

    assert res.status_code == 200


async def test_department_titles_are_unique_per_management(admin_ac: AsyncClient):
    first_management = await admin_ac.post(
        "/api/admin/managements/",
        json={"title": "first management for duplicate department test"},
    )
    second_management = await admin_ac.post(
        "/api/admin/managements/",
        json={"title": "second management for duplicate department test"},
    )
    assert first_management.status_code == 200
    assert second_management.status_code == 200

    first_department = await admin_ac.post(
        "/api/admin/departments/",
        json={
            "title": "Shared department title",
            "management_id": first_management.json()["id"],
        },
    )
    second_department = await admin_ac.post(
        "/api/admin/departments/",
        json={
            "title": "Shared department title",
            "management_id": second_management.json()["id"],
        },
    )
    duplicate_department = await admin_ac.post(
        "/api/admin/departments/",
        json={
            "title": "Shared department title",
            "management_id": first_management.json()["id"],
        },
    )

    assert first_department.status_code == 200
    assert second_department.status_code == 200
    assert duplicate_department.status_code == 409
    assert duplicate_department.json()["detail"] == (
        "Отдел с таким названием уже существует в этом управлении"
    )


async def test_delete_department_resets_department_heads(admin_ac: AsyncClient):
    management_response = await admin_ac.post(
        "/api/admin/managements/",
        json={"title": "management for department deletion"},
    )
    assert management_response.status_code == 200

    head_response = await admin_ac.post(
        "/api/users/",
        json={
            "username": "department-head-to-delete",
            "last_name": "Testov",
            "password": "password",
        },
    )
    assert head_response.status_code == 200

    department_response = await admin_ac.post(
        "/api/admin/departments/",
        json={
            "title": "department to delete",
            "management_id": management_response.json()["id"],
            "head_id": head_response.json()["id"],
        },
    )
    assert department_response.status_code == 200
    assert department_response.json()["head"]["status"] == "HEAD"

    delete_response = await admin_ac.delete(
        f"/api/admin/departments/{department_response.json()['id']}"
    )
    assert delete_response.status_code == 204

    updated_head = await admin_ac.get(f"/api/users/{head_response.json()['id']}")
    assert updated_head.status_code == 200
    assert updated_head.json()["status"] == "USER"
    assert updated_head.json()["department_id"] is None


async def test_management_head_cannot_delete_department_in_another_management(
    ac: AsyncClient,
):
    department_user = await ac.post(
        "/api/users/",
        json={
            "username": "department-delete-admin",
            "last_name": "Testov",
            "status": "ADMIN",
            "password": "password",
        },
    )
    management_head = await ac.post(
        "/api/users/",
        json={
            "username": "department-delete-management-head",
            "last_name": "Testov",
            "password": "password",
        },
    )
    assert department_user.status_code == 200
    assert management_head.status_code == 200

    await ac.post(
        "/api/users/login",
        json={
            "username": "department-delete-admin",
            "last_name": "Testov",
            "password": "password",
        },
    )
    management_response = await ac.post(
        "/api/admin/managements/",
        json={"title": "management for another department"},
    )
    assert management_response.status_code == 200
    department_response = await ac.post(
        "/api/admin/departments/",
        json={
            "title": "department outside management head scope",
            "management_id": management_response.json()["id"],
        },
    )
    assert department_response.status_code == 200

    own_management = await ac.post(
        "/api/admin/managements/",
        json={
            "title": "management for scoped department deletion",
            "head_id": management_head.json()["id"],
        },
    )
    assert own_management.status_code == 200
    await ac.post(
        "/api/users/login",
        json={
            "username": "department-delete-management-head",
            "last_name": "Testov",
            "password": "password",
        },
    )

    delete_response = await ac.delete(
        f"/api/admin/departments/{department_response.json()['id']}"
    )
    assert delete_response.status_code == 403