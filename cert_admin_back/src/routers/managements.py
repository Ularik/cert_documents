from fastapi import APIRouter

from src.routers.dependencies import AuthUserDep, DBDep
from src.services.management_service import ManagementService


router = APIRouter(prefix="/managements", tags=["Управления"])


@router.get("/")
async def get_managements(db: DBDep, user: AuthUserDep):
    return await ManagementService(db).get_managements(user_id=user.user_id)


@router.get("/{management_id}")
async def get_management(db: DBDep, management_id: int, user: AuthUserDep):
    return await ManagementService(db).get_one_management(
        management_id,
        user_id=user.user_id,
    )
