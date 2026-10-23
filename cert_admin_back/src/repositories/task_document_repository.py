from fastapi import UploadFile
from sqlalchemy.orm import undefer

from src.models.tasks import TaskDocuments
from src.repositories.base import BaseRepository
from src.schemas.tasks import DocumentLiteSchema, DocumentOutSchema
from sqlalchemy import insert, select


class TasksDocumentRepository(BaseRepository):
    model = TaskDocuments
    schema = DocumentLiteSchema

    async def get_existing_filenames(
            self,
            **kwargs
    ) -> set[str]:
        query = select(self.model.filename).filter_by(**kwargs)
        result = await self.session.execute(query)

        existing_filenames = set(result.scalars().all())
        return existing_filenames

    async def add_documents(
            self,
            documents_files: list[UploadFile],
            **kwargs
        ) -> list[DocumentLiteSchema]:
        if not documents_files:
            return []

        existing_filenames: set[str] = await self.get_existing_filenames(**kwargs)

        # отфильтровываем от существующих файлов
        docs_to_insert = []
        for file in documents_files:
            if file.filename in existing_filenames:
                continue

            file_bytes = await file.read()
            docs_to_insert.append({
                "filename": file.filename,
                "mime_type": file.content_type or "application/octet-stream",
                "file_data": file_bytes,
                **kwargs,
            })
            existing_filenames.add(file.filename)

        if docs_to_insert:
            stmt = (insert(self.model)
                    .values(docs_to_insert)
                    .returning(self.model.id, self.model.filename)
                    )
            result = await self.session.execute(stmt)
            return [self.schema.model_validate(d) for d in result.all()]

        return []

    async def update_documents(
            self,
            old_docs_id_from_front: list[int],
            new_documents: list[UploadFile],
            **kwargs
    ) -> list[DocumentLiteSchema]:
        actual_old_docs: list[DocumentLiteSchema] = await self.get_filtered_objects(**kwargs)

        actual_old_ids = set(map(lambda x: x.id, actual_old_docs))
        delete_old_docs_ds = (
                actual_old_ids
                -
                set(old_docs_id_from_front)
        )
        keep_ids = actual_old_ids & set(old_docs_id_from_front)
        remaining_old_docs = [doc for doc in actual_old_docs if doc.id in keep_ids]

        if delete_old_docs_ds:
            filter = self.model.id.in_([*delete_old_docs_ds])
            await self.delete_bulk(filter, **kwargs)

        new_docs = await self.add_documents(new_documents, **kwargs)
        return [*remaining_old_docs, *new_docs]

    async def download_document(self, document_id: int):
        query = (
            select(self.model)
            .options(undefer(self.model.file_data))
            .filter_by(id=document_id)
        )
        result = await self.session.execute(query)
        document = result.scalar_one_or_none()
        return DocumentOutSchema.model_validate(document)

    async def get_task_id(self, document_id: int) -> int | None:
        query = select(self.model.task_id).where(self.model.id == document_id)
        result = await self.session.execute(query)
        return result.scalar_one_or_none()