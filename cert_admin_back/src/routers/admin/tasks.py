from fastapi import APIRouter, UploadFile, Form, Body
from datetime import date
from src.schemas.tasks import TaskPatchStatusSchema
from src.services.tasks_service import TasksService
from src.routers.dependencies import DBDep, AuthUserDep

router = APIRouter(prefix="/tasks")


@router.post("/")
async def post_task(
        db: DBDep,
        user: AuthUserDep,
        title: str = Form(...),
        description: str | None = Form(None),
        deadlines: date | None = Form(None),
        note: str | None = Form(None),
        management_id: int | None = Form(None),
        departments_ids: list[int] = Form([]),
        executor_ids: list[int] = Form([]),
        attachments: list[UploadFile] = Form([])
    ):
    return await TasksService(db).create_task(
        user_id=user.user_id,
        title=title,
        description=description,
        departments_ids=departments_ids,
        deadlines=deadlines,
        note=note,
        management_id=management_id,
        attachments=attachments,
        executor_ids=executor_ids
    )


@router.put("/{id}")
async def put_task(
        id: int,
        db: DBDep,
        user: AuthUserDep,
        title: str = Form(...),
        description: str | None = Form(None),
        deadlines: date | None = Form(None),
        note: str | None = Form(None),
        management_id: int | None = Form(None),
        departments_ids: list[int] = Form([]),
        executor_ids: list[int] = Form([]),
        attachments: list[UploadFile] = Form([]),
        old_attachments_ids: list[int] = Form([])
):
    task = await TasksService(db).update_task(
        user_id=user.user_id,
        task_id=id,
        title=title,
        description=description,
        deadlines=deadlines,
        note=note,
        management_id=management_id,
        departments_ids=departments_ids,
        attachments=attachments,
        old_attachments_id_from_front=old_attachments_ids,
        executor_ids=executor_ids
    )
    return task


@router.patch("/{id}")
async def patch_task(
        db: DBDep,
        id: int,
        user: AuthUserDep,
        status: TaskPatchStatusSchema,
):
    await TasksService(db).change_status(data=status, task_id=id, user=user)
    # уведомить исполнителей

@router.delete("/{id}")
async def delete_task(
        db: DBDep,
        id: int,
        user: AuthUserDep,
):
    # удалить только свою задач
    await TasksService(db).delete_task_by_admin(task_id=id, user_id=user.user_id)
    return 200, {'status': 'delete success'}