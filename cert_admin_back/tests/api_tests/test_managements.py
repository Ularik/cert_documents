import pytest
from httpx import AsyncClient


async def test_create_management_without_trailing_slash(admin_ac: AsyncClient):
    response = await admin_ac.post(
        "/api/admin/managements",
        json={"title": "Management without trailing slash"},
    )

    assert response.status_code == 200


@pytest.mark.parametrize("role", ["ADMIN", "DIVISION_HEAD", "MANAGEMENT_HEAD"])
async def test_management_roles_have_admin_access(ac: AsyncClient, role: str):
    user_response = await ac.post(
        "/api/users/",
        json={
            "username": role.lower(),
            "last_name": "Testov",
            "status": role,
            "password": "password",
        },
    )
    assert user_response.status_code == 200

    login_response = await ac.post(
        "/api/users/login",
        json={
            "username": role.lower(),
            "last_name": "Testov",
            "password": "password",
        },
    )
    assert login_response.status_code == 200

    management_response = await ac.post(
        "/api/admin/managements/",
        json={
            "title": f"{role} management",
            "head_id": user_response.json()["id"] if role == "MANAGEMENT_HEAD" else None,
        },
    )
    assert management_response.status_code == 200

    task_response = await ac.post(
        "/api/admin/tasks/",
        data={
            "title": f"Task for {role}",
            "management_id": management_response.json()["id"],
        },
    )
    assert task_response.status_code == 200


async def test_management_head_and_department_relationships(admin_ac: AsyncClient):
    user_response = await admin_ac.post(
        "/api/users/",
        json={
            "username": "management-head",
            "last_name": "Testov",
            "password": "password",
        },
    )
    department_head_response = await admin_ac.post(
        "/api/users/",
        json={
            "username": "department-head",
            "last_name": "Testov",
            "password": "password",
        },
    )
    assert user_response.status_code == 200
    assert department_head_response.status_code == 200

    management_response = await admin_ac.post(
        "/api/admin/managements/",
        json={
            "title": "Test management",
            "head_id": user_response.json()["id"],
        },
    )
    assert management_response.status_code == 200
    assert management_response.json()["head"]["status"] == "MANAGEMENT_HEAD"

    department_response = await admin_ac.post(
        "/api/admin/departments/",
        json={
            "title": "Test department",
            "management_id": management_response.json()["id"],
            "head_id": department_head_response.json()["id"],
        },
    )
    assert department_response.status_code == 200
    assert department_response.json()["management_id"] == management_response.json()["id"]
    assert department_response.json()["head"]["status"] == "HEAD"

    response = await admin_ac.get(
        f"/api/managements/{management_response.json()['id']}"
    )
    assert response.status_code == 200
    assert response.json()["departments"][0]["id"] == department_response.json()["id"]

    await admin_ac.post(
        "/api/users/login",
        json={
            "username": "department-head",
            "last_name": "Testov",
            "password": "password",
        },
    )
    created_by_department_head = await admin_ac.post(
        "/api/head/departments/",
        json={
            "title": "Department created by its head",
            "management_id": management_response.json()["id"],
        },
    )
    assert created_by_department_head.status_code == 200


async def test_management_cannot_be_deleted_while_it_has_departments(admin_ac: AsyncClient):
    management_response = await admin_ac.post(
        "/api/admin/managements/",
        json={"title": "Management with department"},
    )
    assert management_response.status_code == 200
    await admin_ac.post(
        "/api/admin/departments/",
        json={
            "title": "Department in management",
            "management_id": management_response.json()["id"],
        },
    )

    response = await admin_ac.delete(
        f"/api/admin/managements/{management_response.json()['id']}"
    )

    assert response.status_code == 409


async def test_management_head_is_limited_to_own_departments_and_task_targets(
    ac: AsyncClient,
):
    management_head = await ac.post(
        "/api/users/",
        json={
            "username": "scoped-management-head",
            "last_name": "Testov",
            "password": "password",
        },
    )
    assert management_head.status_code == 200

    admin_response = await ac.post(
        "/api/users/",
        json={
            "username": "scoped-admin",
            "last_name": "Testov",
            "status": "ADMIN",
            "password": "password",
        },
    )
    assert admin_response.status_code == 200
    await ac.post(
        "/api/users/login",
        json={
            "username": "scoped-admin",
            "last_name": "Testov",
            "password": "password",
        },
    )

    own_management = await ac.post(
        "/api/admin/managements/",
        json={
            "title": "Scoped management",
            "head_id": management_head.json()["id"],
        },
    )
    other_management = await ac.post(
        "/api/admin/managements/",
        json={"title": "Other management"},
    )
    assert own_management.status_code == 200
    assert other_management.status_code == 200

    own_department = await ac.post(
        "/api/admin/departments/",
        json={
            "title": "Scoped department",
            "management_id": own_management.json()["id"],
        },
    )
    other_department = await ac.post(
        "/api/admin/departments/",
        json={
            "title": "Other department",
            "management_id": other_management.json()["id"],
        },
    )
    assert own_department.status_code == 200
    assert other_department.status_code == 200
    other_own_department = await ac.post(
        "/api/admin/departments/",
        json={
            "title": "Second scoped department",
            "management_id": own_management.json()["id"],
        },
    )
    assert other_own_department.status_code == 200

    employee = await ac.post(
        "/api/users/",
        json={
            "username": "scoped-employee",
            "last_name": "Testov",
            "department_id": own_department.json()["id"],
            "password": "password",
        },
    )
    assert employee.status_code == 200
    outside_employee = await ac.post(
        "/api/users/",
        json={
            "username": "outside-employee",
            "last_name": "Testov",
            "department_id": other_department.json()["id"],
            "password": "password",
        },
    )
    assert outside_employee.status_code == 200

    other_management_task = await ac.post(
        "/api/admin/tasks/",
        data={
            "title": "Admin task in other management",
            "management_id": other_management.json()["id"],
            "departments_ids": [other_department.json()["id"]],
        },
    )
    assert other_management_task.status_code == 200

    await ac.post(
        "/api/users/login",
        json={
            "username": "scoped-management-head",
            "last_name": "Testov",
            "password": "password",
        },
    )

    allowed_department = await ac.post(
        "/api/admin/departments/",
        json={
            "title": "Created by management head",
            "management_id": own_management.json()["id"],
        },
    )
    forbidden_department = await ac.post(
        "/api/admin/departments/",
        json={
            "title": "Created outside management",
            "management_id": other_management.json()["id"],
        },
    )
    assert allowed_department.status_code == 200
    assert forbidden_department.status_code == 403

    allowed_task = await ac.post(
        "/api/admin/tasks/",
        data={
            "title": "Task in own management",
            "management_id": own_management.json()["id"],
            "departments_ids": [own_department.json()["id"]],
            "executor_ids": [employee.json()["id"]],
        },
    )
    forbidden_task = await ac.post(
        "/api/admin/tasks/",
        data={
            "title": "Task in other management",
            "management_id": other_management.json()["id"],
            "departments_ids": [other_department.json()["id"]],
        },
    )
    assert allowed_task.status_code == 200, allowed_task.text
    assert forbidden_task.status_code == 403
    forbidden_delete = await ac.delete(
        f"/api/tasks/{other_management_task.json()['id']}"
    )
    assert forbidden_delete.status_code == 403

    forbidden_executor = await ac.post(
        "/api/admin/tasks/",
        data={
            "title": "Task with outside employee",
            "management_id": own_management.json()["id"],
            "departments_ids": [own_department.json()["id"]],
            "executor_ids": [outside_employee.json()["id"]],
        },
    )
    assert forbidden_executor.status_code == 400


async def test_user_is_limited_to_their_management(admin_ac: AsyncClient):
    own_management = await admin_ac.post(
        "/api/admin/managements/",
        json={"title": "Employee's own management"},
    )
    other_management = await admin_ac.post(
        "/api/admin/managements/",
        json={"title": "Employee's other management"},
    )
    assert own_management.status_code == 200
    assert other_management.status_code == 200

    own_department = await admin_ac.post(
        "/api/admin/departments/",
        json={
            "title": "Employee's own department",
            "management_id": own_management.json()["id"],
        },
    )
    other_department = await admin_ac.post(
        "/api/admin/departments/",
        json={
            "title": "Employee's other department",
            "management_id": other_management.json()["id"],
        },
    )
    assert own_department.status_code == 200
    assert other_department.status_code == 200

    employee = await admin_ac.post(
        "/api/users/",
        json={
            "username": "management-scoped-employee",
            "last_name": "Testov",
            "department_id": own_department.json()["id"],
            "password": "password",
        },
    )
    colleague = await admin_ac.post(
        "/api/users/",
        json={
            "username": "management-scoped-colleague",
            "last_name": "Testov",
            "department_id": own_department.json()["id"],
            "password": "password",
        },
    )
    outside_employee = await admin_ac.post(
        "/api/users/",
        json={
            "username": "management-outside-employee",
            "last_name": "Testov",
            "department_id": other_department.json()["id"],
            "password": "password",
        },
    )
    assert employee.status_code == colleague.status_code == outside_employee.status_code == 200

    own_task = await admin_ac.post(
        "/api/admin/tasks/",
        data={
            "title": "Task in employee's management",
            "management_id": own_management.json()["id"],
            "departments_ids": [own_department.json()["id"]],
        },
        files={"attachments": ("own.txt", b"own task document", "text/plain")},
    )
    other_task = await admin_ac.post(
        "/api/admin/tasks/",
        data={
            "title": "Task outside employee's management",
            "management_id": other_management.json()["id"],
            "departments_ids": [other_department.json()["id"]],
        },
        files={"attachments": ("other.txt", b"other task document", "text/plain")},
    )
    assert own_task.status_code == other_task.status_code == 200

    await admin_ac.post(
        "/api/users/login",
        json={
            "username": "management-scoped-employee",
            "last_name": "Testov",
            "password": "password",
        },
    )

    managements = await admin_ac.get("/api/managements/")
    departments = await admin_ac.get("/api/departments/")
    users = await admin_ac.get("/api/users/")
    assert [management["id"] for management in managements.json()] == [
        own_management.json()["id"]
    ]
    assert [department["id"] for department in departments.json()] == [
        own_department.json()["id"]
    ]
    visible_user_ids = {user["id"] for user in users.json()}
    assert employee.json()["id"] in visible_user_ids
    assert colleague.json()["id"] in visible_user_ids
    assert outside_employee.json()["id"] not in visible_user_ids

    outside_user_detail = await admin_ac.get(
        f"/api/users/{outside_employee.json()['id']}"
    )
    outside_management_detail = await admin_ac.get(
        f"/api/managements/{other_management.json()['id']}"
    )
    outside_department_detail = await admin_ac.get(
        f"/api/departments/{other_department.json()['id']}"
    )
    own_tasks = await admin_ac.get("/api/tasks/")
    outside_management_tasks = await admin_ac.get(
        "/api/tasks/",
        params={"management_id": other_management.json()["id"]},
    )
    own_task_detail = await admin_ac.get(f"/api/tasks/{own_task.json()['id']}")
    outside_task_detail = await admin_ac.get(f"/api/tasks/{other_task.json()['id']}")
    own_reply = await admin_ac.post(
        f"/api/tasks/{own_task.json()['id']}/tasks_reply",
        data={"content": "Reply in own management"},
        files={"attachments": ("reply.txt", b"own reply document", "text/plain")},
    )
    own_replies = await admin_ac.get(
        f"/api/tasks/{own_task.json()['id']}/tasks_reply"
    )
    outside_replies = await admin_ac.get(
        f"/api/tasks/{other_task.json()['id']}/tasks_reply"
    )
    outside_document = await admin_ac.get(
        f"/api/tasks/task-documents/{other_task.json()['attachments'][0]['id']}/download"
    )
    own_reply_document = await admin_ac.get(
        f"/api/tasks/tasks_reply/{own_reply.json()['attachments'][0]['id']}/download"
    )

    assert outside_user_detail.status_code == 404
    assert outside_management_detail.status_code == 404
    assert outside_department_detail.status_code == 404
    assert [task["id"] for task in own_tasks.json()["items"]] == [
        own_task.json()["id"]
    ]
    assert outside_management_tasks.status_code == 403
    assert own_task_detail.status_code == 200
    assert outside_task_detail.status_code == 404
    assert own_replies.status_code == 200
    assert own_reply.status_code == 200
    assert own_reply_document.status_code == 200
    assert outside_replies.status_code == 404
    assert outside_document.status_code == 404
