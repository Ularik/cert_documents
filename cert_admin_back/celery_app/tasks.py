import asyncio
from celery import shared_task

from src.database import AsyncSessionNullPool
from src.db_manager.db_manager import DbManager


async def set_status_async():
    async with DbManager(session_factory=AsyncSessionNullPool) as db:
        await db.tasks.set_expired_status()
        await db.save()


@shared_task(name="tasks.set_expired_tasks")
def set_expired_tasks():
    asyncio.run(set_status_async())