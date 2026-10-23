from src.models.users_tasks import UsersTasks
from src.schemas.users_tasks import UsersConnectTaskSchema
from src.repositories.base import BaseRepository


class UsersTasksRepository(BaseRepository):
    model = UsersTasks
    schema = UsersConnectTaskSchema

    async def connect_user_task(self, task_id: int, executor_ids: list[int]):
        tasks_executors_data_list = [
            UsersConnectTaskSchema(user_id=user_id, task_id=task_id)
            for user_id in executor_ids
        ]
        await super().add_bulk(tasks_executors_data_list)

    async def set_user_task(self, task_id: int, executors_ids: list[int]):
        old_users_tasks: list[UsersConnectTaskSchema] = await self.get_filtered_objects(task_id=task_id)
        old_users_ids = [res.user_id for res in old_users_tasks]

        new_user_ids = set(executors_ids) - set(old_users_ids)
        delete_user_ids = set(old_users_ids) - set(executors_ids)

        if delete_user_ids:
            filter = self.model.user_id.in_(delete_user_ids)
            await self.delete_bulk(filter, task_id=task_id)

        if new_user_ids:
            new_users_tasks = [UsersConnectTaskSchema(user_id=user_id, task_id=task_id) for user_id in new_user_ids]
            await self.add_bulk(new_users_tasks)
