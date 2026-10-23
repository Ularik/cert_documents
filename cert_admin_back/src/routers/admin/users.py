from fastapi import APIRouter
from src.routers.dependencies import AuthUserDep, DBDep
from src.schemas.users import UsersAuthSchema, UserUpdateSchema
from src.services.user_service import UserService


router = APIRouter(prefix="/users")


@router.post("/")
async def add_user(
        db: DBDep,
        user: AuthUserDep,
        data: UsersAuthSchema,
):
    return await UserService(db).create_managed_user(data, actor_id=user.user_id)


@router.delete("/{id}")
async def delete_user(
        db: DBDep,
        id: int,
        user: AuthUserDep,
):
    await UserService(db).delete_user(id, actor_id=user.user_id)
    return 200, "deleted"


@router.patch("/{id}")
async def update_user(
        db: DBDep,
        user: AuthUserDep,
        id: int,
        data: UserUpdateSchema
):
    res = await UserService(db).update_admin_user(
        data=data,
        user_id=id,
        actor_id=user.user_id,
    )
    return res