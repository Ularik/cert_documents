from pydantic import BaseModel, ConfigDict


class DepartmentsConnectTaskSchema(BaseModel):
    department_id: int
    task_id: int
    model_config = ConfigDict(from_attributes=True, extra="ignore")
