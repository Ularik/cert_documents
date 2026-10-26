from pydantic import BaseModel, ConfigDict


class ManagementsConnectTaskSchema(BaseModel):
    management_id: int
    task_id: int
    model_config = ConfigDict(from_attributes=True, extra="ignore")
