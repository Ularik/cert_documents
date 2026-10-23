from datetime import datetime

from sqlalchemy import DateTime, String, and_, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base
from src.models.users import UserStatus, Users


class Managements(Base):
    __tablename__ = "managements"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(100), unique=True)
    description: Mapped[str | None]
    departments: Mapped[list["Departments"]] = relationship(back_populates="management")
    users: Mapped[list["Users"]] = relationship(back_populates="management")
    head: Mapped["Users | None"] = relationship(
        "Users",
        primaryjoin=lambda: and_(
            Managements.id == Users.management_id,
            Users.status == UserStatus.MANAGEMENT_HEAD,
        ),
        foreign_keys="Users.management_id",
        viewonly=True,
        uselist=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.timezone("Asia/Bishkek", func.now()),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.timezone("Asia/Bishkek", func.now()),
        onupdate=func.timezone("Asia/Bishkek", func.now()),
    )
