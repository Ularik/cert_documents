"""Handler'ы и форматтеры логов приложения.

Дополнительные поля передаются через `extra`:
    logger.info("Создана задача", extra={"user_id": 1, "data": {"task_id": 5}})
"""
import asyncio
import json
import logging
import sys
from datetime import datetime, timezone
from enum import Enum
from typing import Any

from sqlalchemy import insert

from src.utils.request_context import get_request_info


def _json_default(value: Any):
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, Enum):
        return value.value
    return str(value)


def _to_json(value: Any) -> Any:
    """Приводит data к JSON-совместимому виду (datetime, Enum и т.п. -> строки)."""
    return json.loads(json.dumps(value, ensure_ascii=False, default=_json_default))


class RequestContextFilter(logging.Filter):
    """Добавляет к записи IP и User-Agent текущего HTTP-запроса (если он есть)."""

    def filter(self, record: logging.LogRecord) -> bool:
        info = get_request_info()
        if not hasattr(record, "ip_address"):
            record.ip_address = info.ip_address
        if not hasattr(record, "user_agent"):
            record.user_agent = info.user_agent
        return True


def _context(record: logging.LogRecord) -> dict[str, Any]:
    context = {
        "user_id": getattr(record, "user_id", None),
        "ip": getattr(record, "ip_address", None),
        "data": getattr(record, "data", None),
    }
    return {key: value for key, value in context.items() if value is not None}


class TextFormatter(logging.Formatter):
    """`время УРОВЕНЬ логгер сообщение | user_id=1 ip=... data={...}`"""

    def __init__(self):
        super().__init__("%(asctime)s %(levelname)s %(name)s %(message)s")

    def format(self, record: logging.LogRecord) -> str:
        line = super().format(record)
        context = _context(record)
        if context:
            parts = [
                f"{key}={json.dumps(value, ensure_ascii=False, default=_json_default) if key == 'data' else value}"
                for key, value in context.items()
            ]
            line = f"{line} | {' '.join(parts)}"
        return line


class JsonFormatter(logging.Formatter):
    """Одна JSON-строка на запись — для PROD/DOCKER (удобно собирать в ELK/Loki)."""

    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "time": self.formatTime(record),
            "level": record.levelname,
            "logger": record.name,
            "msg": record.getMessage(),
            **_context(record),
        }
        if record.exc_info:
            payload["exc"] = self.formatException(record.exc_info)
        return json.dumps(payload, ensure_ascii=False, default=_json_default)


class DatabaseHandler(logging.Handler):
    """Пишет записи в таблицу `logs`.

    Запись делается отдельной сессией в фоне, чтобы не блокировать запрос и не зависеть
    от его транзакции. Без запущенного event loop (CLI, Celery) пишет синхронно через asyncio.run.
    """

    _pending: set[asyncio.Task] = set()

    def emit(self, record: logging.LogRecord) -> None:
        try:
            row = self._to_row(record)
        except Exception:
            self.handleError(record)
            return

        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            loop = None

        if loop is None:
            asyncio.run(self._write(row, null_pool=True))
            return

        task = loop.create_task(self._write(row, null_pool=False))
        self._pending.add(task)
        task.add_done_callback(self._pending.discard)

    def _to_row(self, record: logging.LogRecord) -> dict[str, Any]:
        message = record.getMessage()
        if record.exc_info:
            message = f"{message}\n{logging.Formatter().formatException(record.exc_info)}"
        data = getattr(record, "data", None)
        return {
            "created_at": datetime.fromtimestamp(record.created, tz=timezone.utc),
            "level": record.levelname,
            "logger": record.name[:100],
            "message": message,
            "user_id": getattr(record, "user_id", None),
            "ip_address": getattr(record, "ip_address", None),
            "user_agent": getattr(record, "user_agent", None),
            "data": _to_json(data) if data is not None else None,
        }

    @staticmethod
    async def _write(row: dict[str, Any], null_pool: bool) -> None:
        # импорт здесь, чтобы настройка логирования не тянула за собой БД при импорте
        from src.database import AsyncSessionMaker, AsyncSessionNullPool
        from src.models.logs import Logs

        session_factory = AsyncSessionNullPool if null_pool else AsyncSessionMaker
        try:
            async with session_factory() as session:
                await session.execute(insert(Logs).values(**row))
                await session.commit()
        except Exception as err:
            # не через logging, иначе ошибка записи лога снова попадёт в этот handler
            print(f"Не удалось записать лог в БД: {err!r}; запись: {row}", file=sys.stderr)

    @classmethod
    async def flush_pending(cls) -> None:
        """Дождаться записи всех логов (при остановке приложения и в тестах)."""
        while cls._pending:
            await asyncio.gather(*list(cls._pending), return_exceptions=True)
