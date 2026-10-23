import urllib
from datetime import date
from fastapi import APIRouter, HTTPException, Response, Form, UploadFile
from src.routers.dependencies import AuthUserDep, DBDep, QueryParamsDep
from src.schemas.tasks import TaskPatchStatusSchema
from src.services.tasks_service import TasksService
from src.services.documents_service import DocumentService


router = APIRouter(prefix="/tasks", tags=["Ручки задач сортрудников"])


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
        attachments: list[UploadFile] = Form([]),
        executor_ids: list[int] = Form([])
):
    return await TasksService(db).create_task(
        user_id=user.user_id,
        title=title,
        description=description,
        deadlines=deadlines,
        note=note,
        management_id=management_id,
        departments_ids=departments_ids,
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


@router.get("/task-documents/{doc_id}/download")
async def download_task_document(doc_id: int, db: DBDep, user: AuthUserDep):
    doc = await DocumentService(db).download_task_document(
        document_id=doc_id,
        actor_id=user.user_id,
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Документ не найден")

    encoded_filename = urllib.parse.quote(doc.filename)

    return Response(
        content=doc.file_data,
        media_type=doc.mime_type,
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{encoded_filename}"
        }
    )


@router.get("/")
async def get_tasks(db: DBDep, user: AuthUserDep, query_params: QueryParamsDep):
    res = await TasksService(db).get_tasks(query_params, user_id=user.user_id)
    return res


@router.get("/{id}")
async def get_task_detail(db: DBDep, user: AuthUserDep, id: int):
    res = await TasksService(db).get_one(task_id=id, user_id=user.user_id)
    return res


@router.delete("/{id}")
async def delete_task(
        db: DBDep,
        id: int,
        user: AuthUserDep,
):
    # удалить только свою задач
    await TasksService(db).delete_task(task_id=id, user_id=user.user_id)
    return 200, {'status': 'delete success'}