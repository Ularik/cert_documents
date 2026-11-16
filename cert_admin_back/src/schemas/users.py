from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Literal


class UsersAuthSchema(BaseModel):
    username: str
    last_name: str
    status: Literal[
        "ADMIN",
        "DIVISION_HEAD",
        "MANAGEMENT_HEAD",
        "HEAD",
        "DEPUTY",
        "USER",
    ] = Field(default="USER")
    department_id: int | None = None
    management_id: int | None = None
    password: str


class UserLoginSchema(BaseModel):
    username: str
    last_name: str
    password: str


class UserInCookiesSchema(BaseModel):
    user_id: int
    # эффективная роль: в режиме заместителя начальника управления — MANAGEMENT_HEAD
    status: str
    # True — начальник отдела работает в режиме заместителя начальника управления
    acting: bool = False


class SwitchRoleSchema(BaseModel):
    """MANAGEMENT_HEAD — включить режим заместителя начальника управления, null — выйти из него."""
    role: Literal["MANAGEMENT_HEAD"] | None = None


class UserAddSchema(BaseModel):
    username: str
    last_name: str
    status: str
    department_id: int | None = None
    management_id: int | None = None
    hashed_password: bytes

    model_config = ConfigDict(from_attributes=True, extra='ignore')


class UserOutSchema(BaseModel):
    id: int
    username: str
    last_name: str
    status: str
    department_id: int | None
    management_id: int | None = None
    can_act_as_management_head: bool = False
    # служебный признак режима заместителя (выставляет get_actor), в ответы API не попадает
    is_acting: bool = Field(default=False, exclude=True)
    model_config = ConfigDict(from_attributes=True)


class UserWithDepartmentOut(BaseModel):
    id: int
    username: str
    last_name: str | None = None
    status: str
    department_id: int | None = None
    management_id: int | None = None
    department_title: str | None = None
    can_act_as_management_head: bool = False
    model_config = ConfigDict(from_attributes=True, extra="ignore")


class UserTasksStatsOut(UserWithDepartmentOut):
    total: int = 0
    new: int = 0
    progress: int = 0
    done: int = 0
    expired: int = 0
    first_login_at: datetime | None = None


class UserUpdateSchema(BaseModel):
    username: str | None = None
    last_name: str | None = None
    status: Literal[
        "USER",
        "DEPUTY",
        "HEAD",
        "MANAGEMENT_HEAD",
        "DIVISION_HEAD",
        "ADMIN",
        None,
    ] = None
    department_id: int | None = None
    management_id: int | None = None
    can_act_as_management_head: bool | None = None


class UserHashedPswdSchema(UserAddSchema):
    id: int
    model_config = ConfigDict(from_attributes=True)


class UserPasswordResetSchema(BaseModel):
    password: str = Field(min_length=8, max_length=72)


class UserPasswordUpdateSchema(BaseModel):
    hashed_password: bytes
