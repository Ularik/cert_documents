from src.repositories.users_repository import UsersRepository
from src.repositories.departments_repository import DepartmentsRepository
from src.repositories.managements_repository import ManagementsRepository
from src.repositories.tasks_repository import TasksRepository
from src.repositories.task_document_repository import TasksDocumentRepository
from src.repositories.tasks_users_repository import UsersTasksRepository
from src.repositories.task_departments_repository import DepartmentsTasksRepository
from src.repositories.reply_repository import ReplyRepository
from src.repositories.reply_documtns_repository import ReplyDocumentsRepository

class DbManager:
    def __init__(self, session_factory):
        self.session_factory = session_factory

    async def __aenter__(self):
        self.session = self.session_factory()
        self.users = UsersRepository(self.session)
        self.departments = DepartmentsRepository(self.session)
        self.managements = ManagementsRepository(self.session)
        self.tasks = TasksRepository(self.session)
        self.tasks_documents = TasksDocumentRepository(self.session)
        self.tasks_users = UsersTasksRepository(self.session)
        self.reply_tasks = ReplyRepository(self.session)
        self.reply_documents = ReplyDocumentsRepository(self.session)
        self.task_departments = DepartmentsTasksRepository(self.session)
        return self

    async def __aexit__(self, *args):
        await self.session.rollback()
        await self.session.close()

    async def save(self):
        await self.session.commit()