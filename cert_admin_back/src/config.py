from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path
from typing import Literal

BASE_DIR = Path(__file__).resolve().parent.parent


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

    model_config = SettingsConfigDict(env_file=BASE_DIR / ".env", extra="ignore")

settings = Settings()