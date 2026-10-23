from fastapi import APIRouter
from src.routers.admin.departments import router as departments_router
from src.routers.admin.users import router as users_router
from src.routers.head.tasks import router as task_write_router
from src.routers.management_head.tasks import router as task_read_router

router = APIRouter()

router.include_router(task_write_router)
router.include_router(task_read_router)
router.include_router(departments_router)
router.include_router(users_router)
