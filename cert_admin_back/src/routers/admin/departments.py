from fastapi import APIRouter, Response
from src.routers.dependencies import AuthUserDep, DBDep
from src.schemas.departments import DepartmentRequestCreateUpdateSchema
from src.services.department_service import DepartmentService


router = APIRouter(prefix="/departments")


@router.post("/")
async def post_departments(
        db: DBDep,
        user: AuthUserDep,
        data: DepartmentRequestCreateUpdateSchema
):
    res = await DepartmentService(db).add_department(data, user_id=user.user_id)
    return res


@router.put("/{id}")
async def put_department(
        db: DBDep,
        id: int,
        user: AuthUserDep,
        data: DepartmentRequestCreateUpdateSchema
):
    res = await DepartmentService(db).update_department(dep_id=id, data=data, user_id=user.user_id)
    return res


@router.delete("/{id}", status_code=204)
async def delete_department(
        db: DBDep,
        id: int,
        user: AuthUserDep,
):
    await DepartmentService(db).delete_department(dep_id=id, user_id=user.user_id)
    return Response(status_code=204)