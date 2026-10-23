class NoResultException(Exception):
    detail = "Ошибка"
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

class ObjectNotFoundException(NoResultException):
    detail = "Объект не найден"

class DepartmentNotFoundException(ObjectNotFoundException):
    detail = "Отдел не найден"

class TaskNotFoundException(ObjectNotFoundException):
    detail = "Задача не найден"

class ReplyNotFoundException(ObjectNotFoundException):
    detail = "Ответ не найден"

class UserNotFoundException(NoResultException):
    detail = "Сотрудник не найден"

class UniqueObjIsExistException(Exception):
    detail = 'Такой объект уже существует'
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)


class TaskAlreadyExistException(UniqueObjIsExistException):
    detail = 'Такая задача уже существует, поменяйте название title'

class DepartmentAlreadyExistException(UniqueObjIsExistException):
    detail = 'Отдел с таким названием уже существует в этом управлении'


class UserAlreadyExistException(UniqueObjIsExistException):
    detail = "Пользователь с таким именем и фамилией уже существует"

class HasNotRightsException(Exception):
    detail = 'У вас недостаточно прав'
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)


class DependsDepartmentException(HasNotRightsException):
    detail = 'Сначал нужно определить свой отдел'

class HasNoRightsToUpdateDepartment(HasNotRightsException):
    detail = "У вас недостаточно прав для изменения отдела"

class HasNotRightsToTaskException(HasNotRightsException):
    detail = 'У вас недостаточно прав для этой задачи'