from datetime import datetime
from enum import Enum

from sqlalchemy import DateTime, ForeignKey, Index, func
from sqlalchemy.orm import Mapped, mapped_column

from src.database import Base


class NotificationKind(Enum):
    TASK_ASSIGNED = "TASK_ASSIGNED"  # сотрудника назначили исполнителем задачи


class Notifications(Base):
    """Уведомление сотрудника внутри системы."""
    __tablename__ = "notifications"
    __table_args__ = (
        Index("ix_notifications_user_unread", "user_id", "read_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"))
    author_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        comment="Кто назначил",
    )
    kind: Mapped[NotificationKind] = mapped_column(default=NotificationKind.TASK_ASSIGNED)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
