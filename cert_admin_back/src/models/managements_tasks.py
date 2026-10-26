from sqlalchemy.orm import mapped_column, Mapped
from sqlalchemy import DateTime, func, ForeignKey, UniqueConstraint
from src.database import Base
from datetime import datetime


class ManagementsTasks(Base):
    __tablename__ = "managements_tasks"
    __table_args__ = (
        UniqueConstraint("management_id", "task_id", name="uq_managements_tasks_management_id_task_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    management_id: Mapped[int] = mapped_column(ForeignKey("managements.id", ondelete="RESTRICT"))
    task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.timezone('Asia/Bishkek', func.now()))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.timezone('Asia/Bishkek', func.now()),
        onupdate=func.timezone('Asia/Bishkek', func.now())
    )
