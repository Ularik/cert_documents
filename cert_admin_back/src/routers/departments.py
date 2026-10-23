from fastapi import APIRouter
from src.routers.dependencies import AuthUserDep, DBDep
from src.services.department_service import DepartmentService


router = APIRouter(prefix="/departments", tags=["Отделы"])


@router.get("/")
async def get_departments(db: DBDep, user: AuthUserDep):
    return await DepartmentService(db).get_department(user_id=user.user_id)


@router.get("/{id}")
async def get_departments(
        db: DBDep,
        user: AuthUserDep,
        id: int
):
    return await DepartmentService(db).get_one_department(
        department_id=id,
        user_id=user.user_id,
    )
