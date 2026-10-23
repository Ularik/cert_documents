from fastapi import APIRouter, Response, Body
from src.schemas.users import UsersAuthSchema, UserLoginSchema, UserUpdateSchema
from src.services.user_service import UserService
from src.routers.dependencies import DBDep, AuthUserDep
from src.models.users import UserStatus


router = APIRouter(prefix="/users", tags=["Пользователи"])


@router.post("/login")
async def login_user(db: DBDep, data: UserLoginSchema, response: Response):
    access_token = await UserService(db).login_user(data)
    response.set_cookie("access_token", access_token, secure=False)
    return {"access_token": access_token}


@router.post("/", summary="Добавление нового пользователя")
async def add_user(db: DBDep, data: UsersAuthSchema):
    res = await UserService(db).create_user(data)
    return res


@router.get("/")
async def get_users(
    db: DBDep,
    user: AuthUserDep,
    department_id: int | None = None,
):
    return await UserService(db).get_users(
        department_id=department_id,
        actor_id=user.user_id,
    )


@router.get("/roles")
async def get_users_statuses_list():
    return [status.value for status in UserStatus]


@router.get("/me")
async def get_me(db: DBDep, user: AuthUserDep):
    user = await UserService(db).get_user(
        id=user.user_id,
        actor_id=user.user_id,
    )
    return user


@router.get("/{id}")
async def get_me(db: DBDep, id: int, user: AuthUserDep):
    user = await UserService(db).get_user(id=id, actor_id=user.user_id)
    return user


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("access_token")
    return {"success": "Вы вышли из аккаунта"}
