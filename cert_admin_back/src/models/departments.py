from typing import Optional

from sqlalchemy.orm import mapped_column, Mapped, relationship
from sqlalchemy import String, DateTime, func, ForeignKey, and_, UniqueConstraint
from datetime import datetime
from src.database import Base
from src.models import Users, UserStatus


class Departments(Base):
    __tablename__ = "departments"
    __table_args__ = (
        UniqueConstraint(
            "management_id",
            "title",
            name="uq_departments_management_id_title",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(100))
    description: Mapped[str | None]
    management_id: Mapped[int] = mapped_column(
        ForeignKey("managements.id", ondelete="RESTRICT"),
        comment="Управление"
    )
    management: Mapped["Managements"] = relationship(back_populates="departments")
    users: Mapped[list["Users"]] = relationship(back_populates="department")
    head: Mapped["Users"] = relationship(
        "Users",
        primaryjoin=lambda: and_(
            Departments.id == Users.department_id,
            Users.status == UserStatus.HEAD,
        ),
        foreign_keys="Users.department_id",
        viewonly=True,
        uselist=False,
    )
    deputy_head: Mapped["Users"] = relationship(
        "Users",
        primaryjoin=lambda: and_(
            Departments.id == Users.department_id,
            Users.status == UserStatus.DEPUTY,
        ),
        foreign_keys="Users.department_id",
        viewonly=True,
        uselist=False,
    )
    tasks: Mapped[list["Tasks"]] = relationship(secondary="departments_tasks", back_populates="departments")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.timezone('Asia/Bishkek', func.now()))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.timezone('Asia/Bishkek', func.now()),
        onupdate=func.timezone('Asia/Bishkek', func.now())
    )