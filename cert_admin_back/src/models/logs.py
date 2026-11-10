from datetime import datetime
from typing import Any, Optional

from sqlalchemy import DateTime, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from src.database import Base


class Logs(Base):
    """Записи логов приложения (пишет handler `db_logger`, см. src/logging_conf)."""
    __tablename__ = "logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.timezone('Asia/Bishkek', func.now()),
        index=True,
    )
    level: Mapped[str] = mapped_column(String(16), index=True)
    # имя логгера = тип лога, например app.auth, app.tasks
    logger: Mapped[str] = mapped_column(String(100), index=True)
    message: Mapped[str] = mapped_column(Text)
    # без внешнего ключа: лог не должен зависеть от удаления пользователя
    user_id: Mapped[Optional[int]] = mapped_column(index=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(64))
    user_agent: Mapped[Optional[str]] = mapped_column(String(512))
    data: Mapped[Optional[dict[str, Any]]] = mapped_column(JSONB)
