"""Режим «заместитель начальника управления» для текущего запроса.

Начальник отдела с флагом `can_act_as_management_head` может переключиться в этот режим:
в токене тогда лежит `status=MANAGEMENT_HEAD, acting=True`. `get_current_user` проверяет флаг
по БД и запоминает здесь id пользователя, а `UsersRepository.get_actor` подменяет ему роль на
MANAGEMENT_HEAD — так все существующие проверки прав работают без изменений.
"""
from contextvars import ContextVar

_acting_user_id: ContextVar[int | None] = ContextVar("acting_user_id", default=None)


def set_acting_user(user_id: int | None) -> None:
    _acting_user_id.set(user_id)


def is_acting_user(user_id: int) -> bool:
    return _acting_user_id.get() == user_id
