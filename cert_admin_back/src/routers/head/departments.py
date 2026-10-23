from fastapi import APIRouter

from src.routers.dependencies import AuthUserDep, DBDep
from src.schemas.departments import DepartmentRequestCreateUpdateSchema
from src.services.department_service import DepartmentService


router = APIRouter(prefix="/departments")


@router.post("/")
@router.post("")
async def post_department(
    db: DBDep,
    user: AuthUserDep,
    data: DepartmentRequestCreateUpdateSchema,
):
    return await DepartmentService(db).add_department(data, user_id=user.user_id)
