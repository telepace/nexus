import re  # For Markdown image processing
import uuid
from collections.abc import Sequence
from typing import Any

from sqlalchemy import func  # For count
from sqlalchemy.ext.asyncio import AsyncSession  # Changed from sqlmodel.Session
from sqlalchemy.future import select  # For async select
from sqlmodel import Session  # Add this for sync operations

from app.core.storage import StorageInterface
from app.crud import crud_image  # crud_image module itself
from app.models.content import ContentAsset, ContentChunk, ContentItem

# Schema imports - assuming these exist
from app.schemas.content import ContentItemCreate, ContentItemUpdate
from app.schemas.image import ImageCreate

# Image processing imports
from app.utils.image_processor import process_base64_image, process_web_image


# Helper function to process images in Markdown
async def _process_markdown_images(
    db: AsyncSession,
    content_markdown: str,
    owner_id: uuid.UUID,
    storage_service: StorageInterface,
) -> str:
    """
    Finds all Markdown image links, processes them (stores if base64 or new web URL if strategy requires),
    creates Image records, and updates the Markdown with new URLs if applicable.
    """
    if not content_markdown:
        return ""

    # Regex to find Markdown images: ![alt_text](url)
    # Using finditer to handle replacements carefully, especially with async calls
    image_pattern = re.compile(r"!\[(?P<alt_text>.*?)\]\((?P<url>.*?)\)")

    processed_parts = []
    last_end = 0

    for match in image_pattern.finditer(content_markdown):
        alt_text = match.group("alt_text")
        url = match.group("url")
        original_markdown_image = match.group(0)

        # Add the text part before this match
        processed_parts.append(content_markdown[last_end : match.start()])

        new_image_markdown = (
            original_markdown_image  # Default to original if processing fails
        )

        try:
            image_schema: ImageCreate | None = None
            if url.startswith("data:image"):
                image_schema = await process_base64_image(
                    base64_string=url, user_id=owner_id, storage=storage_service
                )
            elif url.startswith("http://") or url.startswith("https://"):
                # Check if URL is already one of our own public URLs to avoid reprocessing
                # This check is basic; might need refinement based on actual public URL structure
                if storage_service.public_url and url.startswith(
                    storage_service.public_url
                ):  # type: ignore
                    # Already a processed image, try to find its record or just keep it
                    # For now, just keep it to prevent loops. A more robust check would be needed.
                    pass  # Keep new_image_markdown = original_markdown_image
                else:
                    image_schema = await process_web_image(
                        image_url=url,
                        strategy="keep_link",  # Default strategy as per subtask focus
                        user_id=owner_id,
                        storage=storage_service,
                    )

            if image_schema:
                # Create the Image DB record
                # Ensure s3_key is set if it's None and type demands it (e.g. stored_base64)
                # The process_base64_image and process_web_image (download strategy) should set s3_key.
                # For "keep_link", s3_key is None, which is now allowed by ImageCreate.
                db_image = await crud_image.create_image(
                    db=db, obj_in=image_schema, owner_id=owner_id
                )

                if db_image.s3_key:  # Image was stored (base64 or downloaded web image)
                    final_url = await storage_service.get_public_url(db_image.s3_key)
                    new_image_markdown = f"![{alt_text}]({final_url})"
                elif (
                    db_image.source_url
                ):  # Image is linked (web image with keep_link strategy)
                    new_image_markdown = f"![{alt_text}]({db_image.source_url})"
                # If somehow no URL, it defaults to original_markdown_image
        except Exception:
            # Log error: print(f"Error processing image {url}: {e}")
            # Keep original markdown for this image if processing fails
            pass  # new_image_markdown remains original_markdown_image

        processed_parts.append(new_image_markdown)
        last_end = match.end()

    # Add the remaining part of the markdown string
    processed_parts.append(content_markdown[last_end:])

    return "".join(processed_parts)


# CRUD for ContentItem (now async)


async def get_content_item(db: AsyncSession, id: uuid.UUID) -> ContentItem | None:
    result = await db.execute(select(ContentItem).where(ContentItem.id == id))
    return result.scalar_one_or_none()


async def get_content_items(
    db: AsyncSession, skip: int = 0, limit: int = 100, user_id: uuid.UUID | None = None
) -> Sequence[ContentItem]:
    statement = select(ContentItem)
    if user_id:
        statement = statement.where(ContentItem.user_id == user_id)
    statement = statement.offset(skip).limit(limit)
    result = await db.execute(statement)
    return result.scalars().all()


async def create_content_item(
    db: AsyncSession,
    *,
    content_item_in: ContentItemCreate,  # Use Pydantic schema for creation
    owner_id: uuid.UUID,  # Explicitly pass owner_id
    storage_service: StorageInterface,
) -> ContentItem:
    processed_markdown = ""
    # Use content_text as confirmed from schema and model
    if content_item_in.content_text:
        processed_markdown = await _process_markdown_images(
            db=db,
            content_markdown=content_item_in.content_text,
            owner_id=owner_id,
            storage_service=storage_service,
        )

    # Create a dictionary for ContentItem creation, excluding fields not in the model
    content_data = content_item_in.model_dump(exclude_unset=True)
    content_data["content_text"] = processed_markdown  # Use processed markdown
    content_data["user_id"] = owner_id  # Set user_id (owner_id)

    # Ensure all required fields for ContentItem are present
    # Example: title might be required by ContentItem but optional in ContentItemCreate
    if "title" not in content_data or content_data["title"] is None:
        content_data["title"] = (
            "Untitled Content"  # Provide a default or handle as error
        )

    db_content_item = ContentItem(**content_data)

    db.add(db_content_item)
    await db.commit()
    await db.refresh(db_content_item)
    return db_content_item


async def update_content_item(
    db: AsyncSession,
    *,
    db_content_item: ContentItem,
    content_item_in: ContentItemUpdate,  # Use Pydantic schema for update
    owner_id: uuid.UUID,  # Needed for _process_markdown_images if content changes
    storage_service: StorageInterface,
) -> ContentItem:
    update_data = content_item_in.model_dump(exclude_unset=True)

    # Use content_text as confirmed from schema and model
    if "content_text" in update_data and update_data["content_text"] is not None:
        processed_markdown = await _process_markdown_images(
            db=db,
            content_markdown=update_data["content_text"],
            owner_id=owner_id,  # Assuming owner_id of content item doesn't change
            storage_service=storage_service,
        )
        update_data["content_text"] = processed_markdown

    for key, value in update_data.items():
        setattr(db_content_item, key, value)

    db.add(db_content_item)
    await db.commit()
    await db.refresh(db_content_item)
    return db_content_item


async def delete_content_item(db: AsyncSession, id: uuid.UUID) -> ContentItem | None:
    db_content_item = await get_content_item(db, id)  # Use async version
    if db_content_item:
        await db.delete(db_content_item)
        await db.commit()
        return db_content_item
    return None


# CRUD for ContentAsset (keeping sync for now, unless required to be async)
# If ContentAsset operations need to be part of the same transaction or involve async calls,
# they should also be converted to async. For this subtask, focus is on ContentItem.


def get_content_asset(session: Session, id: uuid.UUID) -> ContentAsset | None:
    return session.get(ContentAsset, id)


def get_content_assets_by_item_id(
    session: Session, content_item_id: uuid.UUID, skip: int = 0, limit: int = 100
) -> Sequence[ContentAsset]:
    statement = (
        select(
            ContentAsset
        )  # This select is sqlalchemy.future.select, might need adjustment if session is not AsyncSession
        .where(ContentAsset.content_item_id == content_item_id)
        .offset(skip)
        .limit(limit)
    )
    # If session is sqlmodel.Session, session.exec(statement).all() is correct.
    # If this part were async with AsyncSession, it'd be await session.execute(statement)
    assets = session.exec(statement).all()  # type: ignore
    return assets


def create_content_asset(
    session: Session, content_asset_in: ContentAsset
) -> ContentAsset:
    db_content_asset = ContentAsset.model_validate(content_asset_in)
    session.add(db_content_asset)
    session.commit()
    session.refresh(db_content_asset)
    return db_content_asset


def update_content_asset(
    session: Session,
    db_content_asset: ContentAsset,
    content_asset_in: Any,
) -> ContentAsset:
    if isinstance(content_asset_in, dict):
        update_data = content_asset_in
    else:
        update_data = content_asset_in.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        setattr(db_content_asset, key, value)

    session.add(db_content_asset)
    session.commit()
    session.refresh(db_content_asset)
    return db_content_asset


def delete_content_asset(session: Session, id: uuid.UUID) -> ContentAsset | None:
    db_content_asset = session.get(ContentAsset, id)
    if db_content_asset:
        session.delete(db_content_asset)
        session.commit()
        return db_content_asset
    return None


# ContentChunk functions are more complex and might require separate async conversion
# For now, keeping them as synchronous, assuming they are called in a context
# that can bridge sync/async if needed, or they are not directly affected by this change.


def get_content_chunks(
    session: Session, content_item_id: uuid.UUID, page: int = 1, size: int = 10
) -> tuple[list[ContentChunk], int]:
    offset = (page - 1) * size
    total_count_statement = (
        select(func.count())  # type: ignore
        .select_from(ContentChunk)
        .where(ContentChunk.content_item_id == content_item_id)
    )
    total_count = session.exec(total_count_statement).one()  # type: ignore

    chunks_statement = (
        select(ContentChunk)  # type: ignore
        .where(ContentChunk.content_item_id == content_item_id)
        .order_by(ContentChunk.chunk_index)  # type: ignore[arg-type]
        .offset(offset)
        .limit(size)
    )
    chunks = session.exec(chunks_statement).all()  # type: ignore
    return list(chunks), total_count  # type: ignore


# ... (other ContentChunk functions remain synchronous for now) ...

# print("CRUD functions for ContentItem and ContentAsset potentially modified for async and image processing.")
