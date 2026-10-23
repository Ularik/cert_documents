from celery import Celery
from celery.schedules import crontab
from src.config import settings

celery_instance = Celery(
    "celery_app",
    broker=settings.REDIS_URL,
    backend=f"rpc://",
)

celery_instance.conf.include = ['celery_app.tasks']

# Конфигурация Celery Beat
celery_instance.conf.beat_schedule = {
    "set-expired-tasks-every-5-minutes": {
        "task": "tasks.set_expired_tasks",  # Имя, указанное в @shared_task(name=...)
        # "schedule": crontab(minute="*/1")
        "schedule": crontab(minute=0, hour=0),
    },
}
