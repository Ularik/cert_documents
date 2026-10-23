from typing import Optional

from sqlalchemy.orm import mapped_column, Mapped, relationship
from sqlalchemy import String, DateTime, func, ForeignKey, UniqueConstraint
from src.database import Base
from datetime import datetime
from enum import Enum


class UserStatus(Enum):
    ADMIN = "ADMIN"
    DIVISION_HEAD = "DIVISION_HEAD"
    MANAGEMENT_HEAD = "MANAGEMENT_HEAD"
    HEAD = "HEAD"
    DEPUTY = "DEPUTY"
    USER = "USER"


ADMIN_ACCESS_STATUSES = frozenset({
    UserStatus.ADMIN.value,
    UserStatus.DIVISION_HEAD.value,
    UserStatus.MANAGEMENT_HEAD.value,
})

MANAGEMENT_SCOPED_STATUSES = frozenset({
    UserStatus.MANAGEMENT_HEAD.value,
    UserStatus.USER.value,
})


class Users(Base):
    __tablename__ = "users"
    __table_args__ = (
        UniqueConstraint("username", "last_name", name="uq_users_username_last_name"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(50))
    last_name: Mapped[str | None] = mapped_column(String(50))
    hashed_password: Mapped[bytes]
    tasks: Mapped[list["Tasks"]] = relationship(secondary="users_tasks", back_populates="executors")
    status: Mapped[UserStatus] = mapped_column(default=UserStatus.USER, server_default=UserStatus.USER.value)
    department_id: Mapped[int | None] = mapped_column(
        ForeignKey("departments.id", ondelete="SET NULL"),
        comment="Отдел"
    )
    department: Mapped["Departments"] = relationship(back_populates="users")
    management_id: Mapped[int | None] = mapped_column(
        ForeignKey("managements.id", ondelete="SET NULL"),
        comment="Управление"
    )
    management: Mapped["Managements"] = relationship(back_populates="users")
    replies: Mapped[list["TaskReply"]] = relationship(back_populates="author")

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.timezone('Asia/Bishkek', func.now()))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.timezone('Asia/Bishkek', func.now()),
        onupdate=func.timezone('Asia/Bishkek', func.now())
    )
