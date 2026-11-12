from pydantic import BaseModel
from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path
from typing import Literal

BASE_DIR = Path(__file__).resolve().parent.parent


class AdminUser(BaseModel):
    username: str
    surname: str


class Settings(BaseSettings):
    MODE: Literal["LOCAL", "DOCKER", "PROD", "TEST"]

    POSTGRES_DB: str
    POSTGRES_HOST: str
    POSTGRES_HOST_DOCKER: str
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_PORT: str

    REDIS_HOST: str
    REDIS_HOST_DOCKER: str
    REDIS_PORT: str

    @property
    def REDIS_URL(self):
        host = self.REDIS_HOST if self.MODE != "DOCKER" else self.REDIS_HOST_DOCKER
        return f"redis://{host}:{self.REDIS_PORT}"


    @property
    def DB_URL(self):
        host = [self.POSTGRES_HOST, self.POSTGRES_HOST_DOCKER][self.MODE == "DOCKER"]
        return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{host}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"


    SECRET_KEY: str
    ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int

    # Пользователи, которым всегда выдаётся статус ADMIN (при входе и при старте приложения).
    # JSON: ADMIN_USERS=[{"username": "Иван", "surname": "Иванов"}]
    ADMIN_USERS: list[AdminUser] = []

    def is_env_admin(self, username: str, last_name: str | None) -> bool:
        return any(
            a.username.strip() == username.strip() and a.surname.strip() == (last_name or "").strip()
            for a in self.ADMIN_USERS
        )

    # Логирование (см. src/logging_conf/logging_conf.py)
    LOG_LEVEL: str = "INFO"
    # куда писать логи приложения по умолчанию: console, file, db_logger (через запятую)
    LOG_HANDLERS: str = "console"
    # переопределение по типу лога, JSON: {"auth": "db_logger", "tasks": "db_logger,file"}
    LOG_ROUTES: dict[str, str] = {"auth": "db_logger", "tasks": "db_logger"}
    LOG_FILE: str = "logs/app.log"

    model_config = SettingsConfigDict(
        env_file=(BASE_DIR / ".env", BASE_DIR.parent / ".env_back"),
        extra="ignore",
    )

settings = Settings()