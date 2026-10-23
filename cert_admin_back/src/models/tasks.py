from datetime import datetime, date
from typing import List, Optional
from sqlalchemy import DateTime, ForeignKey, String, LargeBinary, func
from sqlalchemy.orm import Mapped, mapped_column, relationship, deferred
from src.database import Base
from enum import Enum


class TasksStatus(Enum):
    NEW = "NEW"
    PROGRESS = "PROGRESS"
    DONE = "DONE"


class Tasks(Base):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(primary_key=True)
    author_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    author: Mapped["Users"] = relationship()
    management_id: Mapped[int] = mapped_column(ForeignKey("managements.id", ondelete="RESTRICT"))
    management: Mapped["Managements"] = relationship()
    title: Mapped[str] = mapped_column(String(255), unique=True)
    description: Mapped[Optional[str]]
    deadlines: Mapped[date | None]
    is_expired: Mapped[bool | None]
    status: Mapped[TasksStatus] = mapped_column(default=TasksStatus.NEW, server_default=TasksStatus.NEW.value)
    note: Mapped[str | None]
    departments: Mapped[list["Departments"]] = relationship(secondary="departments_tasks", back_populates="tasks")
    executors: Mapped[list["Users"]] = relationship(secondary="users_tasks", back_populates="tasks")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.timezone('Asia/Bishkek', func.now())
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.timezone('Asia/Bishkek', func.now()),
        onupdate=func.timezone('Asia/Bishkek', func.now())
    )
    # Связи
    attachments: Mapped[list["TaskDocuments"]] = relationship(
        back_populates="task", cascade="all, delete-orphan"
    )
    replies: Mapped[list["TaskReply"]] = relationship(
        back_populates="task", cascade="all, delete-orphan"
    )


class TaskDocuments(Base):
    """Документы, прикрепленные к самой задаче"""
    __tablename__ = "task_documents"

    id: Mapped[int] = mapped_column(primary_key=True)
    filename: Mapped[str] = mapped_column(String(255))  # Пример: "report.pdf"
    mime_type: Mapped[str] = mapped_column(String(100))  # Пример: "application/pdf"

    # deferred() гарантирует, что тяжелые бинарные данные не будут загружаться из БД,
    # пока вы явно не обратитесь к полю document.file_data
    file_data: Mapped[bytes] = deferred(mapped_column(LargeBinary))

    task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"))
    task: Mapped["Tasks"] = relationship(back_populates="attachments")


class TaskReply(Base):
    """Ответы/комментарии к задаче"""
    __tablename__ = "task_replies"

    id: Mapped[int] = mapped_column(primary_key=True)
    content: Mapped[str | None]  # Текст ответа
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.timezone('Asia/Bishkek', func.now())
    )

    task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"))
    task: Mapped["Tasks"] = relationship(back_populates="replies")

    attachments: Mapped[List["ReplyDocument"]] = relationship(
        back_populates="reply", cascade="all, delete-orphan"
    )
    author_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    author: Mapped["Users"] = relationship(back_populates="replies")


class ReplyDocument(Base):
    """Документы, прикрепленные к ответу"""
    __tablename__ = "reply_documents"

    id: Mapped[int] = mapped_column(primary_key=True)
    filename: Mapped[str] = mapped_column(String(255))
    mime_type: Mapped[str] = mapped_column(String(100))
    # Тоже отложенная загрузка
    file_data: Mapped[bytes] = deferred(mapped_column(LargeBinary))

    reply_id: Mapped[int] = mapped_column(ForeignKey("task_replies.id", ondelete="CASCADE"))
    reply: Mapped["TaskReply"] = relationship(back_populates="attachments")