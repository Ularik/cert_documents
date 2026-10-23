from pydantic import BaseModel, ConfigDict


class UsersConnectTaskSchema(BaseModel):
    user_id: int
    task_id: int
    model_config = ConfigDict(from_attributes=True, extra="ignore")
