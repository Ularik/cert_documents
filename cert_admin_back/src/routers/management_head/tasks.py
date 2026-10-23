import urllib

from fastapi import APIRouter, HTTPException, Response

from src.routers.dependencies import AuthUserDep, DBDep, QueryParamsDep
from src.services.documents_service import DocumentService
from src.services.tasks_service import TasksService

router = APIRouter(prefix="/tasks", tags=["Задачи начальника управления"])


@router.get("/")
async def get_tasks(db: DBDep, user: AuthUserDep, query_params: QueryParamsDep):
    return await TasksService(db).get_tasks(query_params, user_id=user.user_id)


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
        },
    )


@router.get("/{id}")
async def get_task_detail(db: DBDep, user: AuthUserDep, id: int):
    return await TasksService(db).get_one(task_id=id, user_id=user.user_id)
