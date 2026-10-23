from fastapi import APIRouter, Response

from fastapi import HTTPException
from src.routers.dependencies import AuthUserDep, DBDep
from src.schemas.managements import ManagementRequestSchema
from src.services.management_service import ManagementService


router = APIRouter(prefix="/managements", tags=["Управления"])


@router.post("/")
async def post_management(db: DBDep, user: AuthUserDep, data: ManagementRequestSchema):
    if user.status == "MANAGEMENT_HEAD":
        raise HTTPException(status_code=403, detail="Недостаточно прав")
    return await ManagementService(db).add_management(data)


@router.put("/{management_id}")
async def put_management(
    db: DBDep,
    user: AuthUserDep,
    management_id: int,
    data: ManagementRequestSchema,
):
    if user.status == "MANAGEMENT_HEAD":
        raise HTTPException(status_code=403, detail="Недостаточно прав")
    return await ManagementService(db).update_management(management_id, data)


@router.delete("/{management_id}")
async def delete_management(db: DBDep, user: AuthUserDep, management_id: int):
    if user.status == "MANAGEMENT_HEAD":
        raise HTTPException(status_code=403, detail="Недостаточно прав")
    await ManagementService(db).delete_management(management_id)
    return Response(status_code=204)
