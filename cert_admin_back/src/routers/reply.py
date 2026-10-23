from fastapi import APIRouter, HTTPException, Response, Form, UploadFile
from src.services.documents_service import DocumentService
import urllib
from src.routers.dependencies import DBDep, AuthUserDep
from src.services.reply_service import ReplyService


router = APIRouter(prefix="/tasks", tags=["Ответы на задачи"])


@router.get("/{id}/tasks_reply")
async def get_tasks_reply(
        db: DBDep,
        user: AuthUserDep,
        id: int,
):
    return await ReplyService(db).get_replies(task_id=id, actor_id=user.user_id)


@router.get("/tasks_reply/{doc_id}/download")
async def download_reply_document(doc_id: int, db: DBDep, user: AuthUserDep):
    doc = await DocumentService(db).download_reply_document(
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


@router.get("/tasks_reply/{id}")
async def get_tasks_reply(
        db: DBDep,
        user: AuthUserDep,
        id: int,
):
    return await ReplyService(db).get_one_reply(reply_id=id, actor_id=user.user_id)


@router.post("/{id}/tasks_reply")
async def response_on_task(
        db: DBDep,
        user: AuthUserDep,
        id: int,
        content: str = Form(...),
        attachments: list[UploadFile] = Form([]),
):
    return await ReplyService(db).create_reply(
        executor=user,
        task_id=id,
        content=content,
        attachments=attachments
    )


@router.put("/tasks_reply/{id}")
async def update_reply(
        db: DBDep,
        user: AuthUserDep,
        id: int,
        content: str = Form(...),
        attachments: list[UploadFile] = Form([]),
        old_attachments_ids: list[int] = Form([])
):
    return await ReplyService(db).update_reply(
        reply_id=id,
        content=content,
        attachments=attachments,
        old_attachments_ids=old_attachments_ids,
        actor_id=user.user_id,
    )

@router.delete("/tasks_reply/{id}")
async def delete_reply(
        db: DBDep,
        user: AuthUserDep,
        id: int
):
    await ReplyService(db).delete_reply(reply_id=id, actor_id=user.user_id)
    return 200, "delete success"