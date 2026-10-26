"""Правила: кто может менять задачу и кто может с ней работать (статус)."""
from src.models.tasks import TaskTargetType
from src.models.users import UserStatus
from src.schemas.tasks import TaskFullOutSchema
from src.schemas.users import UserOutSchema

# Чем выше число, тем выше роль. Нижестоящий не меняет задачи вышестоящего.
ROLE_RANK: dict[str, int] = {
    UserStatus.ADMIN.value: 60,
    UserStatus.DIVISION_HEAD.value: 50,
    UserStatus.MANAGEMENT_HEAD.value: 40,
    UserStatus.HEAD.value: 30,
    UserStatus.DEPUTY.value: 20,
    UserStatus.USER.value: 10,
}

ADMIN_TIER = frozenset({UserStatus.ADMIN.value, UserStatus.DIVISION_HEAD.value})
DEPARTMENT_TIER = frozenset({UserStatus.HEAD.value, UserStatus.DEPUTY.value})


def can_modify_task(
    actor: UserOutSchema,
    actor_management_id: int | None,
    task: TaskFullOutSchema,
) -> bool:
    """Править и удалять задачу можно, если:

    - вы её автор; или
    - задача поручена конкретным сотрудникам, автор ниже вас по роли и задача целиком
      в вашей зоне (админы — везде, начальник управления — свои управления,
      начальник отдела / заместитель — свой отдел); или
    - у задачи нет автора (его удалили) и вы ADMIN / DIVISION_HEAD.

    Задачи, поручённые управлениям или отделам целиком, меняет только автор.
    """
    if task.author_id is not None and task.author_id == actor.id:
        return True
    if task.author_id is None:
        return actor.status in ADMIN_TIER
    if task.target_type != TaskTargetType.EXECUTORS:
        return False

    author_rank = ROLE_RANK.get(task.author.status, 0) if task.author else 0
    if ROLE_RANK.get(actor.status, 0) <= author_rank:
        return False

    if actor.status in ADMIN_TIER:
        return True
    if actor.status == UserStatus.MANAGEMENT_HEAD.value:
        return actor_management_id is not None and {m.id for m in task.managements} == {actor_management_id}
    if actor.status in DEPARTMENT_TIER:
        return actor.department_id is not None and {d.id for d in task.departments} == {actor.department_id}
    return False


def can_work_with_task(
    actor: UserOutSchema,
    actor_management_id: int | None,
    task: TaskFullOutSchema,
) -> bool:
    """Менять статус задачи может тот, кому она поручена (или админ)."""
    if actor.status in ADMIN_TIER:
        return True
    if any(executor.id == actor.id for executor in task.executors):
        return True
    if actor.status == UserStatus.MANAGEMENT_HEAD.value:
        return actor_management_id in {m.id for m in task.managements}
    if task.departments:
        return actor.department_id in {d.id for d in task.departments}
    return actor_management_id in {m.id for m in task.managements}
