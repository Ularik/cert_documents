from fastapi import UploadFile
from sqlalchemy import select, insert
from sqlalchemy.ext.asyncio import AsyncSession
from src.schemas.tasks import DocumentLiteSchema


async def prepare_files_and_insert(
        session: AsyncSession,
        model_name,
        files: list[UploadFile],
        *,
        defined_schema,
        **unique_fields,
):

    query = select(model_name.filename).filter_by(**unique_fields)
    result = await session.execute(query)
    existing_filenames = set(result.scalars().all())

    docs_to_insert = []

    for file in files:
        if file.filename in existing_filenames:
            continue

        file_bytes = await file.read()

        docs_to_insert.append(
            defined_schema(
                filename=file.filename,
                mime_type=file.content_type or "application/octet-stream",
                file_data=file_bytes,
                **unique_fields
            )
        )

        existing_filenames.add(file.filename)

    if docs_to_insert:
        stmt = (insert(model_name)
                .values([d.model_dump() for d in docs_to_insert])
                .returning(model_name.id, model_name.filename)
                )
        result = await session.execute(stmt)
        return [DocumentLiteSchema.model_validate(d) for d in result.all()]

    return []