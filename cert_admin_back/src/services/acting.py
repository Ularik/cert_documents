"""Правила режима «заместитель начальника управления»."""
from src.models.users import UserStatus
from src.schemas.users import UserOutSchema

# Кому можно выдать флаг can_act_as_management_head
ACTING_ELIGIBLE_STATUSES = frozenset({UserStatus.HEAD.value})


def can_act_as_management_head(user: UserOutSchema) -> bool:
    """Флаг действует только пока пользователь — начальник отдела."""
    return user.status in ACTING_ELIGIBLE_STATUSES and user.can_act_as_management_head
