"""Настройка логирования.

Логи приложения пишутся в логгеры `app.<тип>` (например `app.auth`, `app.tasks`).
Куда они попадают, задаётся в настройках (.env_back):

    LOG_HANDLERS=console               # по умолчанию для всех типов: console, file, db_logger (через запятую)
    LOG_ROUTES={"auth": "db_logger", "tasks": "db_logger,file"}   # переопределение по типу лога
    LOG_FILE=logs/app.log              # путь для handler'а file (относительно cert_admin_back/)
    LOG_LEVEL=INFO
"""
import logging
import sys
from logging.handlers import RotatingFileHandler
from pathlib import Path

from src.config import settings, BASE_DIR
from src.logging_conf.handlers import DatabaseHandler, JsonFormatter, RequestContextFilter, TextFormatter

APP_LOGGER = "app"
HANDLER_NAMES = ("console", "file", "db_logger")

# логгеры типов, настроенные прошлым вызовом setup_logging (чтобы сбросить их при повторной настройке)
_routed_loggers: set[str] = set()


def _parse_names(value: str | list[str]) -> list[str]:
    names = value.split(",") if isinstance(value, str) else value
    names = [name.strip() for name in names if name.strip()]
    unknown = [name for name in names if name not in HANDLER_NAMES]
    if unknown:
        raise ValueError(f"Неизвестный handler логов: {', '.join(unknown)}. Доступны: {', '.join(HANDLER_NAMES)}")
    return list(dict.fromkeys(names))


def _formatter() -> logging.Formatter:
    if settings.MODE in ("PROD", "DOCKER"):
        return JsonFormatter()
    return TextFormatter()


def _build_handler(name: str, log_file: str) -> logging.Handler:
    if name == "console":
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(_formatter())
    elif name == "file":
        path = Path(log_file)
        if not path.is_absolute():
            path = BASE_DIR / path
        path.parent.mkdir(parents=True, exist_ok=True)
        handler = RotatingFileHandler(path, maxBytes=10 * 1024 * 1024, backupCount=5, encoding="utf-8")
        handler.setFormatter(_formatter())
    else:  # db_logger
        handler = DatabaseHandler()
    handler.addFilter(RequestContextFilter())
    return handler


def setup_logging(
    handlers: str | list[str] | None = None,
    routes: dict[str, str | list[str]] | None = None,
    log_file: str | None = None,
) -> None:
    """Аргументы переопределяют настройки (удобно для тестов)."""
    handlers = settings.LOG_HANDLERS if handlers is None else handlers
    routes = settings.LOG_ROUTES if routes is None else routes
    log_file = log_file or settings.LOG_FILE
    level = settings.LOG_LEVEL.upper()

    # корневой логгер — системные логи (uvicorn, sqlalchemy и т.п.) только в консоль
    root_handler = logging.StreamHandler(sys.stdout)
    root_handler.setFormatter(_formatter())
    root = logging.getLogger()
    root.handlers = [root_handler]
    root.setLevel(logging.INFO)

    # один экземпляр handler'а на имя, чтобы file не открывался дважды
    built: dict[str, logging.Handler] = {}

    def get_handlers(value: str | list[str]) -> list[logging.Handler]:
        result = []
        for name in _parse_names(value):
            if name not in built:
                built[name] = _build_handler(name, log_file)
            result.append(built[name])
        return result

    app_logger = logging.getLogger(APP_LOGGER)
    _close_handlers(app_logger)
    app_logger.handlers = get_handlers(handlers)
    app_logger.setLevel(level)
    app_logger.propagate = False

    for name in _routed_loggers:
        _close_handlers(logging.getLogger(name))
        logging.getLogger(name).propagate = True
    _routed_loggers.clear()

    for log_type, names in routes.items():
        name = log_type if log_type.startswith(f"{APP_LOGGER}.") else f"{APP_LOGGER}.{log_type}"
        type_logger = logging.getLogger(name)
        type_logger.handlers = get_handlers(names)
        type_logger.propagate = False
        _routed_loggers.add(name)


def _close_handlers(logger: logging.Logger) -> None:
    for handler in logger.handlers:
        handler.close()
    logger.handlers = []
