from pydantic import BaseModel
from sqlalchemy import insert, select, update
from sqlalchemy.exc import IntegrityError, NoResultFound
from sqlalchemy.orm import joinedload, selectinload

from asyncpg.exceptions import ForeignKeyViolationError, UniqueViolationError

from src.exceptions.exceptions import ObjectNotFoundException, UniqueObjIsExistException
from src.models.departments import Departments
from src.models.managements import Managements
from src.repositories.base import BaseRepository
from src.schemas.managements import ManagementOutSchema


class ManagementsRepository(BaseRepository):
    model = Managements
    schema = ManagementOutSchema

    async def add_obj(self, data: BaseModel) -> ManagementOutSchema:
        query = insert(self.model).values(**data.model_dump(exclude_unset=True)).returning(self.model.id)
        try:
            result = await self.session.execute(query)
        except IntegrityError as err:
            if isinstance(err.orig.__cause__, UniqueViolationError):
                raise UniqueObjIsExistException from err
            if isinstance(err.orig.__cause__, ForeignKeyViolationError):
                raise ObjectNotFoundException from err
            raise
        return (await self.get_managements(id=result.scalar_one()))[0]

    async def edit(self, data: BaseModel, exclude_unset: bool = True, **filters) -> ManagementOutSchema:
        query = (
            update(self.model)
            .filter_by(**filters)
            .values(**data.model_dump(exclude_unset=exclude_unset))
            .returning(self.model.id)
        )
        try:
            result = await self.session.execute(query)
        except IntegrityError as err:
            if isinstance(err.orig.__cause__, ForeignKeyViolationError):
                raise ObjectNotFoundException from err
            if isinstance(err.orig.__cause__, UniqueViolationError):
                raise UniqueObjIsExistException from err
            raise
        try:
            management_id = result.scalar_one()
        except NoResultFound as err:
            raise ObjectNotFoundException from err
        return (await self.get_managements(id=management_id))[0]

    async def get_managements(self, **filters) -> list[ManagementOutSchema]:
        query = (
            select(self.model)
            .options(
                joinedload(Managements.head),
                selectinload(Managements.departments),
            )
            .filter_by(**filters)
            .order_by(Managements.id)
        )
        result = await self.session.execute(query)
        return [
            ManagementOutSchema.model_validate(management)
            for management in result.unique().scalars().all()
        ]

    async def has_departments(self, management_id: int) -> bool:
        query = select(Departments.id).where(Departments.management_id == management_id).limit(1)
        result = await self.session.execute(query)
        return result.first() is not None
