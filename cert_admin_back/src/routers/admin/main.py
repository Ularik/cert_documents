from fastapi import APIRouter
from src.routers.admin.departments import router as department_router
from src.routers.admin.tasks import router as tasks_router
from src.routers.admin.users import router as users_router
from src.routers.admin.managements import router as managements_router

router = APIRouter()

router.include_router(department_router)
router.include_router(tasks_router)
router.include_router(users_router)
router.include_router(managements_router)