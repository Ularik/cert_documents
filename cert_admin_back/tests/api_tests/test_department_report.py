"""Отчёт отдела в .docx: выполненные за период задачи каждого сотрудника."""
from datetime import date, timedelta
from io import BytesIO

from docx import Document
from docx.oxml.ns import qn
from docx.table import Table
from docx.text.paragraph import Paragraph
from httpx import AsyncClient
from sqlalchemy import text

from src.database import engine_null_pool
from tests.api_tests.test_task_targets import login, org  # noqa: F401  (фикстура org)

DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
TODAY = date.today()


async def create_task(ac: AsyncClient, title: str, **data) -> int:
    response = await ac.post("/api/admin/tasks/", data={"title": title, **data})
    assert response.status_code == 200, response.text
    return response.json()["id"]


async def set_status(ac: AsyncClient, path: str, task_id: int, status: str) -> None:
    response = await ac.patch(f"{path}/{task_id}", json={"status": status})
    assert response.status_code == 200, response.text


async def report(ac: AsyncClient, department_id: int, date_from: date = TODAY, date_to: date = TODAY):
    return await ac.get(
        f"/api/reports/departments/{department_id}",
        params={"date_from": date_from.isoformat(), "date_to": date_to.isoformat()},
    )


def report_text(response) -> str:
    assert response.status_code == 200, response.text
    assert response.headers["content-type"] == DOCX
    document = Document(BytesIO(response.content))
    # абзацы и таблицы в том порядке, в каком они идут в документе
    parts = []
    for element in document.element.body.iterchildren():
        if element.tag == qn("w:p"):
            parts.append(Paragraph(element, document).text)
        elif element.tag == qn("w:tbl"):
            for row in Table(element, document).rows:
                parts.append(" | ".join(cell.text.replace("\n", " ") for cell in row.cells))
    return "\n".join(parts)


def section(text_: str, heading: str) -> str:
    """Текст раздела сотрудника: от его заголовка до следующего заголовка «… — …»."""
    after = text_.split(heading, 1)[1]
    lines = []
    for line in after.splitlines()[1:]:
        if " — " in line and "|" not in line:
            break
        lines.append(line)
    return "\n".join(lines)


async def db_done(task_id: int):
    async with engine_null_pool.connect() as conn:
        return (await conn.execute(
            text("SELECT done_at, done_by_id FROM tasks WHERE id = :id"), {"id": task_id}
        )).one()


async def test_report_lists_done_tasks_per_employee(admin_ac, org):
    a1, a2 = org["dep_a1"]["id"], org["dep_a2"]["id"]
    shared = await create_task(
        admin_ac, "Общая задача",
        management_ids=[org["man_a"]["id"]], departments_ids=[a1, a2],
        executor_ids=[org["user_a1"]["id"], org["user_a2"]["id"]],
    )
    personal = await create_task(
        admin_ac, "Личная задача",
        management_ids=[org["man_a"]["id"]], departments_ids=[a1], executor_ids=[org["deputy_a1"]["id"]],
    )
    whole_dep = await create_task(admin_ac, "Задача отделу", management_ids=[org["man_a"]["id"]], departments_ids=[a1])
    not_done = await create_task(
        admin_ac, "Не выполнена",
        management_ids=[org["man_a"]["id"]], departments_ids=[a1], executor_ids=[org["user_a1"]["id"]],
    )
    old = await create_task(
        admin_ac, "Старая задача",
        management_ids=[org["man_a"]["id"]], departments_ids=[a1], executor_ids=[org["user_a1"]["id"]],
    )

    for task_id in (shared, personal, old):
        await set_status(admin_ac, "/api/admin/tasks", task_id, "DONE")
    await set_status(admin_ac, "/api/admin/tasks", not_done, "PROGRESS")
    await login(admin_ac, "head-a1")
    await set_status(admin_ac, "/api/head/tasks", whole_dep, "DONE")

    async with engine_null_pool.begin() as conn:
        await conn.execute(text("UPDATE tasks SET done_at = now() - interval '40 days' WHERE id = :id"), {"id": old})

    text_ = report_text(await report(admin_ac, a1))
    assert "Отдел: Department A1" in text_
    assert "Управление: Management A" in text_
    assert f"Период: {TODAY:%d.%m.%Y} — {TODAY:%d.%m.%Y}" in text_

    assert "Общая задача" in section(text_, "user-a1 — Сотрудник")
    assert "Старая задача" not in text_  # вне периода
    assert "Не выполнена" not in text_
    assert "Личная задача" in section(text_, "deputy-a1 — Заместитель начальника отдела")
    # задача без исполнителей засчитана тому, кто её выполнил
    assert "Задача отделу" in section(text_, "head-a1 — Начальник отдела")
    # сотрудник другого отдела в отчёт не попадает
    assert "user-a2" not in text_
    assert "Итого | Итого | Итого | 3" in text_

    # за 60 дней видна и старая задача
    text_ = report_text(await report(admin_ac, a1, TODAY - timedelta(days=60)))
    assert "Старая задача" in section(text_, "user-a1 — Сотрудник")


async def test_done_at_is_set_and_cleared(admin_ac, org):
    task_id = await create_task(
        admin_ac, "t", management_ids=[org["man_a"]["id"]],
        departments_ids=[org["dep_a1"]["id"]], executor_ids=[org["user_a1"]["id"]],
    )
    await login(admin_ac, "user-a1")
    await set_status(admin_ac, "/api/tasks", task_id, "DONE")
    done_at, done_by = await db_done(task_id)
    assert done_at is not None and done_by == org["user_a1"]["id"]

    # повторное «Выполнено» не перезаписывает дату
    await set_status(admin_ac, "/api/tasks", task_id, "DONE")
    assert (await db_done(task_id))[0] == done_at

    await set_status(admin_ac, "/api/tasks", task_id, "PROGRESS")
    assert tuple(await db_done(task_id)) == (None, None)


async def test_report_access(admin_ac, org):
    a1, a2, b1 = org["dep_a1"]["id"], org["dep_a2"]["id"], org["dep_b1"]["id"]

    await login(admin_ac, "head-a1")
    assert (await report(admin_ac, a1)).status_code == 200
    assert (await report(admin_ac, a2)).status_code == 403

    await login(admin_ac, "deputy-a1")
    assert (await report(admin_ac, a1)).status_code == 200

    await login(admin_ac, "user-a1")
    assert (await report(admin_ac, a1)).status_code == 403

    await login(admin_ac, "mh-a")
    assert (await report(admin_ac, a2)).status_code == 200
    assert (await report(admin_ac, b1)).status_code == 403

    await login(admin_ac, "admin")
    assert (await report(admin_ac, b1)).status_code == 200
    assert (await report(admin_ac, 9999)).status_code == 404
    assert (await report(admin_ac, a1, TODAY, TODAY - timedelta(days=1))).status_code == 422
    assert (await report(admin_ac, a1, TODAY - timedelta(days=400))).status_code == 422


async def test_report_filename(admin_ac, org):
    response = await report(admin_ac, org["dep_a1"]["id"])
    assert response.status_code == 200
    assert response.headers["content-disposition"].startswith("attachment; filename*=UTF-8''")
    assert ".docx" in response.headers["content-disposition"]
