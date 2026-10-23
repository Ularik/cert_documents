from sqlalchemy.orm import mapped_column, Mapped
from sqlalchemy import DateTime, func, ForeignKey, UniqueConstraint
from src.database import Base
from datetime import datetime


class DepartmentsTasks(Base):
    __tablename__ = "departments_tasks"
    __table_args__ = (
        UniqueConstraint("department_id", "task_id", name="uq_departments_tasks_department_id_task_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    department_id: Mapped[int] = mapped_column(ForeignKey("departments.id", ondelete="CASCADE"))
    task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.timezone('Asia/Bishkek', func.now()))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.timezone('Asia/Bishkek', func.now()),
        onupdate=func.timezone('Asia/Bishkek', func.now())
    )