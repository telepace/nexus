import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.image import Image
from app.schemas.image import ImageCreate, ImageUpdate


async def create_image(
    db: AsyncSession, *, obj_in: ImageCreate, owner_id: uuid.UUID
) -> Image:
    """
    Create a new image record in the database.
    s3_key is mandatory from obj_in.
    """
    db_obj = Image(
        **obj_in.model_dump(exclude_unset=True),  # Use model_dump for Pydantic v2
        owner_id=owner_id,
    )
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return db_obj


async def get_image(db: AsyncSession, *, image_id: uuid.UUID) -> Image | None:
    """
    Get a single image by its ID.
    """
    statement = select(Image).where(Image.id == image_id)
    result = await db.execute(statement)
    return result.scalar_one_or_none()


async def get_multi_images_by_owner(
    db: AsyncSession, *, owner_id: uuid.UUID, skip: int = 0, limit: int = 100
) -> list[Image]:
    """
    Get multiple images for a specific owner.
    """
    statement = (
        select(Image)
        .where(Image.owner_id == owner_id)
        .offset(skip)
        .limit(limit)
        .order_by(Image.created_at.desc())  # Optional: order by creation date
    )
    result = await db.execute(statement)
    return list(result.scalars().all())


async def update_image(
    db: AsyncSession, *, db_obj: Image, obj_in: ImageUpdate | dict[str, Any]
) -> Image:
    """
    Update an existing image record.
    """
    if isinstance(obj_in, dict):
        update_data = obj_in
    else:
        update_data = obj_in.model_dump(
            exclude_unset=True
        )  # Use model_dump for Pydantic v2

    for field, value in update_data.items():
        setattr(db_obj, field, value)

    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return db_obj


async def remove_image(db: AsyncSession, *, image_id: uuid.UUID) -> Image | None:
    """
    Delete an image record from the database by its ID.
    Returns the deleted image object if found, otherwise None.
    """
    db_obj = await get_image(db, image_id=image_id)
    if db_obj:
        await db.delete(db_obj)
        await db.commit()
    return db_obj


# Example of a more generic CRUD base if you decide to abstract it later
# from app.crud.base import CRUDBase
# class CRUDImage(CRUDBase[Image, ImageCreate, ImageUpdate]):
#     pass
# crud_image = CRUDImage(Image)
