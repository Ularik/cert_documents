import io
import uuid
from docx import Document


async def test_admin_user_creation_respects_role_and_management_scope(admin_ac):
    first_management = await admin_ac.post(
        "/api/admin/managements/",
        json={"title": "management for role assignment"},
    )
    second_management = await admin_ac.post(
        "/api/admin/managements/",
        json={"title": "other management for role assignment"},
    )
    assert first_management.status_code == 200
    assert second_management.status_code == 200

    first_department = await admin_ac.post(
        "/api/admin/departments/",
        json={
            "title": "department for role assignment",
            "management_id": first_management.json()["id"],
        },
    )
    second_department = await admin_ac.post(
        "/api/admin/departments/",
        json={
            "title": "department for other role assignment",
            "management_id": second_management.json()["id"],
        },
    )
    assert first_department.status_code == 200
    assert second_department.status_code == 200

    management_head = await admin_ac.post(
        "/api/admin/users/",
        json={
            "username": "management-head-role-assignment",
            "last_name": "Testov",
            "status": "MANAGEMENT_HEAD",
            "management_id": first_management.json()["id"],
            "password": "password",
        },
    )
    assert management_head.status_code == 200
    assert management_head.json()["management_id"] == first_management.json()["id"]

    forbidden_admin = await admin_ac.post(
        "/api/admin/users/",
        json={
            "username": "forbidden-admin-role-assignment",
            "last_name": "Testov",
            "status": "ADMIN",
            "password": "password",
        },
    )
    assert forbidden_admin.status_code == 403

    await admin_ac.post(
        "/api/users/login",
        json={
            "username": "management-head-role-assignment",
            "last_name": "Testov",
            "password": "password",
        },
    )

    scoped_employee = await admin_ac.post(
        "/api/admin/users/",
        json={
            "username": "scoped-employee-role-assignment",
            "last_name": "Testov",
            "status": "HEAD",
            "department_id": first_department.json()["id"],
            "password": "password",
        },
    )
    assert scoped_employee.status_code == 200
    assert scoped_employee.json()["department_id"] == first_department.json()["id"]
    assert scoped_employee.json()["management_id"] == first_management.json()["id"]

    forbidden_role = await admin_ac.post(
        "/api/admin/users/",
        json={
            "username": "forbidden-division-role-assignment",
            "last_name": "Testov",
            "status": "DIVISION_HEAD",
            "password": "password",
        },
    )
    assert forbidden_role.status_code == 403

    forbidden_department = await admin_ac.post(
        "/api/admin/users/",
        json={
            "username": "out-of-scope-head-role-assignment",
            "last_name": "Testov",
            "status": "HEAD",
            "department_id": second_department.json()["id"],
            "password": "password",
        },
    )
    assert forbidden_department.status_code == 403


async def test_head_can_create_deputy_only_in_own_department(admin_ac):
    management = await admin_ac.post(
        "/api/admin/managements/",
        json={"title": f"management for deputy creation {uuid.uuid4().hex[:8]}"},
    )
    assert management.status_code == 200

    department_ids = []
    for suffix in ("own", "other"):
        department = await admin_ac.post(
            "/api/admin/departments/",
            json={
                "title": f"{suffix} department for deputy {uuid.uuid4().hex[:8]}",
                "management_id": management.json()["id"],
            },
        )
        assert department.status_code == 200
        department_ids.append(department.json()["id"])

    head = await admin_ac.post(
        "/api/admin/users/",
        json={
            "username": f"head-for-deputy-{uuid.uuid4().hex[:8]}",
            "last_name": "Testov",
            "status": "HEAD",
            "department_id": department_ids[0],
            "password": "password",
        },
    )
    assert head.status_code == 200

    await admin_ac.post(
        "/api/users/login",
        json={
            "username": head.json()["username"],
            "last_name": "Testov",
            "password": "password",
        },
    )

    deputy = await admin_ac.post(
        "/api/head/users/",
        json={
            "username": f"deputy-{uuid.uuid4().hex[:8]}",
            "last_name": "Testov",
            "status": "DEPUTY",
            "department_id": department_ids[0],
            "password": "password",
        },
    )
    assert deputy.status_code == 200
    assert deputy.json()["status"] == "DEPUTY"
    assert deputy.json()["department_id"] == department_ids[0]
    assert deputy.json()["management_id"] == management.json()["id"]

    out_of_department = await admin_ac.post(
        "/api/head/users/",
        json={
            "username": f"out-of-department-{uuid.uuid4().hex[:8]}",
            "last_name": "Testov",
            "status": "DEPUTY",
            "department_id": department_ids[1],
            "password": "password",
        },
    )
    assert out_of_department.status_code == 403


async def test_admin_user_update_changes_role_and_organization(admin_ac):
    management = await admin_ac.post(
        "/api/admin/managements/",
        json={"title": f"management for user update {uuid.uuid4().hex[:8]}"},
    )
    assert management.status_code == 200
    department = await admin_ac.post(
        "/api/admin/departments/",
        json={
            "title": f"department for user update {uuid.uuid4().hex[:8]}",
            "management_id": management.json()["id"],
        },
    )
    assert department.status_code == 200
    other_management = await admin_ac.post(
        "/api/admin/managements/",
        json={"title": f"other management for user update {uuid.uuid4().hex[:8]}"},
    )
    assert other_management.status_code == 200
    user = await admin_ac.post(
        "/api/admin/users/",
        json={
            "username": f"user-update-{uuid.uuid4().hex[:8]}",
            "last_name": "Testov",
            "status": "USER",
            "password": "password",
        },
    )
    assert user.status_code == 200
    user_id = user.json()["id"]

    management_head = await admin_ac.patch(
        f"/api/admin/users/{user_id}",
        json={
            "status": "MANAGEMENT_HEAD",
            "management_id": management.json()["id"],
            "department_id": None,
        },
    )
    assert management_head.status_code == 200
    assert management_head.json()["status"] == "MANAGEMENT_HEAD"
    assert management_head.json()["management_id"] == management.json()["id"]
    assert management_head.json()["department_id"] is None

    mismatched_department = await admin_ac.patch(
        f"/api/admin/users/{user_id}",
        json={
            "status": "HEAD",
            "department_id": department.json()["id"],
            "management_id": other_management.json()["id"],
        },
    )
    assert mismatched_department.status_code == 422

    department_head = await admin_ac.patch(
        f"/api/admin/users/{user_id}",
        json={
            "status": "HEAD",
            "department_id": department.json()["id"],
            "management_id": management.json()["id"],
        },
    )
    assert department_head.status_code == 200
    assert department_head.json()["status"] == "HEAD"
    assert department_head.json()["department_id"] == department.json()["id"]
    assert department_head.json()["management_id"] == management.json()["id"]

    administrator = await admin_ac.patch(
        f"/api/admin/users/{user_id}",
        json={
            "status": "ADMIN",
            "department_id": None,
            "management_id": None,
        },
    )
    assert administrator.status_code == 200
    assert administrator.json()["status"] == "ADMIN"
    assert administrator.json()["department_id"] is None
    assert administrator.json()["management_id"] is None

    missing_department_assignment = await admin_ac.patch(
        f"/api/admin/users/{user_id}",
        json={"status": "USER"},
    )
    assert missing_department_assignment.status_code == 422

    employee = await admin_ac.patch(
        f"/api/admin/users/{user_id}",
        json={
            "status": "USER",
            "department_id": department.json()["id"],
            "management_id": management.json()["id"],
        },
    )
    assert employee.status_code == 200
    assert employee.json()["department_id"] == department.json()["id"]
    assert employee.json()["management_id"] == management.json()["id"]

    missing_management = await admin_ac.patch(
        f"/api/admin/users/{user_id}",
        json={"status": "MANAGEMENT_HEAD", "management_id": None},
    )
    assert missing_management.status_code == 422


async def test_users_are_unique_by_username_and_last_name(admin_ac):
    username = f"duplicate-name-{uuid.uuid4().hex[:8]}"
    first = await admin_ac.post(
        "/api/admin/users/",
        json={
            "username": username,
            "last_name": "Ivanov",
            "status": "USER",
            "password": "password",
        },
    )
    second_last_name = await admin_ac.post(
        "/api/admin/users/",
        json={
            "username": username,
            "last_name": "Petrov",
            "status": "USER",
            "password": "password",
        },
    )
    duplicate_pair = await admin_ac.post(
        "/api/admin/users/",
        json={
            "username": username,
            "last_name": "Ivanov",
            "status": "USER",
            "password": "password",
        },
    )

    assert first.status_code == 200
    assert second_last_name.status_code == 200
    assert duplicate_pair.status_code == 409


async def test_tasks_can_be_filtered_by_management(admin_ac):
    first_management = await admin_ac.post(
        "/api/admin/managements/",
        json={"title": f"first task filter management {uuid.uuid4().hex[:8]}"},
    )
    second_management = await admin_ac.post(
        "/api/admin/managements/",
        json={"title": f"second task filter management {uuid.uuid4().hex[:8]}"},
    )
    assert first_management.status_code == 200
    assert second_management.status_code == 200

    first_title = unique_title("first-management-task")
    second_title = unique_title("second-management-task")
    first_task = await admin_ac.post(
        "/api/admin/tasks/",
        data={
            "title": first_title,
            "management_id": first_management.json()["id"],
        },
    )
    second_task = await admin_ac.post(
        "/api/admin/tasks/",
        data={
            "title": second_title,
            "management_id": second_management.json()["id"],
        },
    )
    assert first_task.status_code == 200
    assert second_task.status_code == 200

    filtered_tasks = await admin_ac.get(
        "/api/tasks/",
        params={"management_id": first_management.json()["id"]},
    )
    assert filtered_tasks.status_code == 200
    returned_titles = {task["title"] for task in filtered_tasks.json()["items"]}
    assert first_title in returned_titles
    assert second_title not in returned_titles
    assert all(
        task["management_id"] == first_management.json()["id"]
        for task in filtered_tasks.json()["items"]
    )


async def test_management_head_reads_only_own_management_data(admin_ac):
    own_management = await admin_ac.post(
        "/api/admin/managements/",
        json={"title": f"own scoped management {uuid.uuid4().hex[:8]}"},
    )
    other_management = await admin_ac.post(
        "/api/admin/managements/",
        json={"title": f"other scoped management {uuid.uuid4().hex[:8]}"},
    )
    assert own_management.status_code == 200
    assert other_management.status_code == 200

    own_department = await admin_ac.post(
        "/api/admin/departments/",
        json={
            "title": f"own scoped department {uuid.uuid4().hex[:8]}",
            "management_id": own_management.json()["id"],
        },
    )
    other_department = await admin_ac.post(
        "/api/admin/departments/",
        json={
            "title": f"other scoped department {uuid.uuid4().hex[:8]}",
            "management_id": other_management.json()["id"],
        },
    )
    assert own_department.status_code == 200
    assert other_department.status_code == 200

    manager = await admin_ac.post(
        "/api/admin/users/",
        json={
            "username": f"scoped-manager-{uuid.uuid4().hex[:8]}",
            "last_name": "Manager",
            "status": "MANAGEMENT_HEAD",
            "management_id": own_management.json()["id"],
            "password": "password",
        },
    )
    assert manager.status_code == 200

    own_task_title = unique_title("own-scoped-task")
    other_task_title = unique_title("other-scoped-task")
    own_task = await admin_ac.post(
        "/api/admin/tasks/",
        data={
            "title": own_task_title,
            "management_id": own_management.json()["id"],
        },
    )
    other_task = await admin_ac.post(
        "/api/admin/tasks/",
        data={
            "title": other_task_title,
            "management_id": other_management.json()["id"],
        },
    )
    assert own_task.status_code == 200
    assert other_task.status_code == 200

    await admin_ac.post(
        "/api/users/login",
        json={
            "username": manager.json()["username"],
            "last_name": "Manager",
            "password": "password",
        },
    )

    managements = await admin_ac.get("/api/managements/")
    departments = await admin_ac.get("/api/departments/")
    users = await admin_ac.get("/api/users/")
    tasks = await admin_ac.get("/api/tasks/")

    assert managements.status_code == 200
    assert [item["id"] for item in managements.json()] == [own_management.json()["id"]]
    assert departments.status_code == 200
    assert [item["id"] for item in departments.json()] == [own_department.json()["id"]]
    assert users.status_code == 200
    assert all(
        user["management_id"] == own_management.json()["id"]
        or user["department_id"] == own_department.json()["id"]
        for user in users.json()
    )
    assert tasks.status_code == 200
    assert all(
        task["management_id"] == own_management.json()["id"]
        for task in tasks.json()["items"]
    )
    other_management_tasks = await admin_ac.get(
        "/api/tasks/",
        params={"management_id": other_management.json()["id"]},
    )
    assert other_management_tasks.status_code == 403
    other_task_detail = await admin_ac.get(f"/api/tasks/{other_task.json()['id']}")
    assert other_task_detail.status_code == 404
    other_department_detail = await admin_ac.get(
        f"/api/departments/{other_department.json()['id']}"
    )
    assert other_department_detail.status_code == 404
    other_management_detail = await admin_ac.get(
        f"/api/managements/{other_management.json()['id']}"
    )
    assert other_management_detail.status_code == 404


def make_real_docx_file(filename="task1.docx", text="Test document content"):
    doc = Document()
    doc.add_paragraph(text)

    buffer = io.BytesIO()
    doc.save(buffer)
    buffer.seek(0)

    return (
        filename,
        buffer,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    )


def unique_title(prefix: str = "task") -> str:
    return f"{prefix}-{uuid.uuid4().hex[:8]}"


def make_upload_file(filename="file.txt", content=b"hello world"):
    return (filename, io.BytesIO(content), "text/plain")


class TestCreateTask:
    async def test_create_task_max(self, admin_ac, test_department, test_user):
        department = await test_department(title="test_department")
        executor = await test_user(title="executor")
        title = unique_title()

        body = {
            "title": title,
            "description": "some description",
            "departments_ids": [department['id']],
            "executor_ids": [executor['id']],
        }

        files = [
            ("attachments", make_upload_file("report.pdf", b"pdf content")),
            ("attachments", make_real_docx_file("report.docx")),
        ]

        response = await admin_ac.post(
            "/admin/tasks/",
            data=body,
            files=files,
        )

        assert response.status_code == 200
        res = response.json()
        assert len(res["attachments"]) == 2


    async def test_create_task_missing_title_returns_422(self, admin_ac):
        response = await admin_ac.post("/admin/tasks/", data={"description": "no title here"})
        assert response.status_code == 422

    async def test_create_task_with_nonexistent_executor_returns_error(self, admin_ac, test_department):
        title = unique_title()
        department = await test_department()
        response = await admin_ac.post(
            "/admin/tasks/",
            data={
                "title": title,
                "departments_ids": [department["id"]],
                "executor_ids": [999_999_999],
            },
        )
        assert response.status_code == 404

    async def test_create_task_with_duplicate_attachment(self, admin_ac, test_department):
        title = unique_title()
        department = await test_department()
        files = [
            ("attachments", make_real_docx_file("report.docx")),
            ("attachments", make_real_docx_file("report.docx")),
            ("attachments", make_real_docx_file("report.docx")),
        ]
        response = await admin_ac.post(
            "/admin/tasks/",
            data={"title": title, "departments_ids": [department["id"]]},
            files=files,
        )
        assert response.status_code == 200
        res = response.json()
        print(res['attachments'])
        assert len(res['attachments']) == 1

    async def test_create_task_duplicate_title_returns_error(self, admin_ac, test_department):
        """title у Tasks unique=True — повторное создание с тем же title должно падать."""
        title = "Повторный заголовок"
        department = await test_department()
        data = {"title": title, "departments_ids": [department["id"]]}
        first = await admin_ac.post("/admin/tasks/", data=data)
        assert first.status_code == 200, first.text

        second = await admin_ac.post("/admin/tasks/", data=data)
        assert second.status_code == 400


# ---------------------------------------------------------------------------
# GET /tasks/
# ---------------------------------------------------------------------------

class TestGetTasks:
    async def test_get_tasks_success(self, admin_ac, test_department):
        department = await test_department()
        await admin_ac.post(
            "/admin/tasks/",
            data={"title": unique_title(), "departments_ids": [department["id"]]},
        )
        response = await admin_ac.get("/tasks/", params={"limit": 10, "offset": 0})
        assert response.status_code == 200

#     async def test_get_tasks_limit_out_of_range_returns_422(self, ac):
#         # QueryParamsSchema: limit = Field(10, gt=0, lt=20)
#         response = await ac.get("/tasks/", params={"limit": 50})
#         assert response.status_code == 422
#
#     async def test_get_tasks_negative_offset_returns_422(self, ac):
#         # offset = Field(0, ge=0)
#         response = await ac.get("/tasks/", params={"offset": -1})
#         assert response.status_code == 422


# ---------------------------------------------------------------------------
# PUT /tasks/{id}
# ---------------------------------------------------------------------------
# Секция была полностью закомментирована в исходнике — оставляю как есть,
# похоже на осознанный временный disable. Если она нужна, раскомментируйте
# и синтаксис/логика там валидны без изменений.

class TestUpdateTask:
    async def test_update_task(self, admin_ac, test_department):
        department = await test_department()
        create_resp = await admin_ac.post("/admin/tasks/",
                                          data={
                                              "title": unique_title(),
                                              "departments_ids": [department["id"]],
                                          },
                                          files=[
                                              ("attachments", make_real_docx_file("test.docx")),
                                              ("attachments", make_real_docx_file("test2.docx")),
                                          ]
                                          )
        response = create_resp.json()
        assert create_resp.status_code == 200
        task_id = response["id"]
        old_attachment = response['attachments'][0]

        new_title = unique_title("updated")
        response = await admin_ac.put(
            f"/admin/tasks/{task_id}",
            data={
                "title": new_title,
                "departments_ids": [department["id"]],
                "old_attachments_ids": [old_attachment['id']]
            },
            files=[
                ("attachments", make_real_docx_file("new_test.docx")),
                ("attachments", make_real_docx_file(old_attachment['filename'])), # check on duplicate
            ]
        )

        assert response.status_code == 200
        body = response.json()
        assert body["title"] == new_title
        print(body["attachments"])
        assert len(body["attachments"]) == 2
#
#     async def test_update_task_invalid_id_type_returns_422(self, ac):
#         response = await ac.put("/tasks/not-an-int", data={"title": "x"})
#         assert response.status_code == 422
#
#     async def test_update_nonexistent_task_returns_error(self, ac):
#         response = await ac.put("/tasks/999999999", data={"title": unique_title()})
#         assert response.status_code != 200


# ---------------------------------------------------------------------------
# PATCH /tasks/{id}
# ---------------------------------------------------------------------------

class TestUpdateExecutors:
    async def test_patch_task_status_success(self, admin_ac, test_department):
        department = await test_department()
        create_resp = await admin_ac.post(
            "/admin/tasks/",
            data={"title": unique_title(), "departments_ids": [department["id"]]},
        )
        task_id = create_resp.json()["id"]

        response = await admin_ac.patch(
            f"/admin/tasks/{task_id}",
            json={"status": "DONE"},
        )
        assert response.status_code == 200


# ---------------------------------------------------------------------------
# POST /tasks/{id}/tasks_reply
# ---------------------------------------------------------------------------

class TestCreateReply:
    async def test_create_reply_success(self, admin_ac, test_department):
        department = await test_department()
        create_resp = await admin_ac.post(
            "/admin/tasks/",
            data={"title": unique_title(), "departments_ids": [department["id"]]},
        )

        assert create_resp.status_code == 200
        task_id = create_resp.json()["id"]

        files = [
            ('attachments', make_real_docx_file('response.docx'))
        ]

        response = await admin_ac.post(
            f"/tasks/{task_id}/tasks_reply",
            data={"content": "done"},
            files=files
        )
        assert response.status_code == 200
        assert response.json()["content"] == "done"

#     async def test_create_reply_missing_content_returns_422(self, ac):
#         create_resp = await ac.post("/tasks/", data={"title": unique_title()})
#         task_id = create_resp.json()["id"]
#
#         response = await ac.post(f"/tasks/{task_id}/tasks_reply", data={})
#         assert response.status_code == 422
#
#     async def test_create_reply_with_attachment(self, ac):
#         create_resp = await ac.post("/tasks/", data={"title": unique_title()})
#         task_id = create_resp.json()["id"]
#
#         response = await ac.post(
#             f"/tasks/{task_id}/tasks_reply",
#             data={"content": "with file"},
#             files={"attachments": make_upload_file()},
#         )
#         assert response.status_code == 200, response.text
#
#     async def test_create_reply_on_nonexistent_task_returns_error(self, ac):
#         response = await ac.post(
#             "/tasks/999999999/tasks_reply", data={"content": "irrelevant"}
#         )
#         assert response.status_code != 200


# ---------------------------------------------------------------------------
# DELETE /tasks/{id}
# ---------------------------------------------------------------------------

# class TestDeleteTask:
#     async def test_delete_own_task_success(self, ac):
#         create_resp = await ac.post("/tasks/", data={"title": unique_title()})
#         task_id = create_resp.json()["id"]
#
#         response = await ac.delete(f"/tasks/{task_id}")
#
#         # ВНИМАНИЕ: в роутере `return 200, {'status': 'delete success'}` — это
#         # tuple, а не Response/dict. FastAPI сериализует его как JSON-массив
#         # [200, {...}], HTTP-статус при этом остаётся 200 (дефолтный), а не тот,
#         # что передавали руками. Стоит поправить на `return {'status': ...}`.
#         assert response.status_code == 200
#         assert response.json() == [200, {"status": "delete success"}]
#
#     async def test_delete_task_invalid_id_returns_422(self, ac):
#         response = await ac.delete("/tasks/abc")
#         assert response.status_code == 422
#
#     async def test_delete_nonexistent_task_returns_error(self, ac):
#         response = await ac.delete("/tasks/999999999")
#         assert response.status_code != 200
#
#     async def test_delete_other_users_task_forbidden(self, ac, admin_ac):
#         """Комментарий в роутере: "удалить только свою задачу".
#         Создаём задачу от имени admin_ac и пробуем удалить её через ac (test_user) —
#         ожидаем отказ. Конкретный код зависит от реализации delete_task в сервисе,
#         сейчас проверяем только что это не 200 — уточните под реальный код (403/404)."""
#         create_resp = await admin_ac.post("/tasks/", data={"title": unique_title()})
#         task_id = create_resp.json()["id"]
#
#         response = await ac.delete(f"/tasks/{task_id}")
#         assert response.status_code != 200