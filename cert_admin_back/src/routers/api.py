from fastapi import Depends, APIRouter
from src.routers.dependencies import get_admin_user, get_head_user
from src.routers.admin.main import router as admin_router
from src.routers.head.main import router as head_router
from src.routers.management_head.main import router as management_head_router
from src.routers.dependencies import get_management_head_user, get_general_task_user
from src.routers.users import router as user_router
from src.routers.tasks import router as router_tasks
from src.routers.reply import router as reply_router
from src.routers.departments import router as departments_router
from src.routers.managements import router as managements_router



router = APIRouter(prefix="/api")

router.include_router(admin_router,
                   prefix="/admin",
                   tags=["Ручки Главного начальника"],
                   dependencies=[Depends(get_admin_user)],
                   responses={403: {"description": "Forbidden"}},
                   )

router.include_router(head_router,
                   prefix="/head",
                   tags=["Ручки начальников"],
                   dependencies=[Depends(get_head_user)],
                   responses={403: {"description": "Forbidden"}},
                   )

router.include_router(management_head_router,
                   prefix="/management-head",
                   tags=["Ручки начальника управления"],
                   dependencies=[Depends(get_management_head_user)],
                   responses={403: {"description": "Forbidden"}},
                   )

router.include_router(user_router)
router.include_router(departments_router)
router.include_router(managements_router)
router.include_router(router_tasks, dependencies=[Depends(get_general_task_user)])
router.include_router(reply_router)
