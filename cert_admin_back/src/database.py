from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from src.config import settings
from sqlalchemy import NullPool


DB_URL = settings.DB_URL

db_params = {}
if settings.MODE == "TEST":
    db_params = {"poolclass": NullPool}

engine = create_async_engine(settings.DB_URL, echo=False, **db_params)  # по умолчанию держит 15 соединений

engine_null_pool = create_async_engine(
    DB_URL, poolclass=NullPool
)  # не содержит соединений, открыл - сразу закрыл

AsyncSessionMaker = async_sessionmaker(
    engine, expire_on_commit=False
)

AsyncSessionNullPool = async_sessionmaker(engine_null_pool, expire_on_commit=False)


class Base(DeclarativeBase):
    pass