from fastapi import FastAPI
from src.routers.api import router
from src.logging_conf.logging_conf import setup_logging
from src.exceptions.exception_handlers import register_exception_handlers
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware

@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    yield

app = FastAPI(lifespan=lifespan)

app.include_router(router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Точный адрес фронтенда
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)