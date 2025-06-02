import re  # For Markdown image processing
import secrets  # For generating unique tokens
import uuid
from collections.abc import Sequence
from typing import (
    Any,  # For optional fields
)

from sqlalchemy import func  # For count
from sqlalchemy.ext.asyncio import AsyncSession  # Changed from sqlmodel.Session
from sqlalchemy.future import select  # For async select
from sqlmodel import Session  # Add this for sync operations and specific select
from sqlmodel import select as sqlmodel_select

from app.core import security  # For password hashing
from app.core.storage import StorageInterface
from app.crud import crud_image  # crud_image module itself
from app.models.content import ContentAsset, ContentChunk, ContentItem, ContentShare

# Schema imports - assuming these exist
from app.schemas.content import ContentItemCreate, ContentItemUpdate, ContentShareCreate
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


# Synchronous versions for routes compatibility
def get_content_item_sync(session: Session, id: uuid.UUID) -> ContentItem | None:
    return session.get(ContentItem, id)


def get_content_items_sync(
    session: Session, skip: int = 0, limit: int = 100, user_id: uuid.UUID | None = None
) -> Sequence[ContentItem]:
    statement = sqlmodel_select(ContentItem)
    if user_id:
        statement = statement.where(ContentItem.user_id == user_id)
    statement = statement.offset(skip).limit(limit)
    result = session.exec(statement)
    return result.all()


def create_content_item_sync(
    session: Session,
    *,
    content_item_in: ContentItem,  # Accept ContentItem model directly
) -> ContentItem:
    session.add(content_item_in)
    session.commit()
    session.refresh(content_item_in)
    return content_item_in


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
    """
    Get content chunks with pagination, using correct SQLModel syntax.
    """
    # Get total count first
    total_count_statement = sqlmodel_select(func.count(ContentChunk.id)).where(ContentChunk.content_item_id == content_item_id)
    total_count = session.exec(total_count_statement).one() or 0

    # Calculate offset for pagination
    offset = (page - 1) * size
    
    # Get chunks with pagination using the same pattern as get_content_items_sync
    chunks_statement = sqlmodel_select(ContentChunk).where(ContentChunk.content_item_id == content_item_id).order_by(ContentChunk.chunk_index).offset(offset).limit(size)
    chunks_result = session.exec(chunks_statement)
    chunks = chunks_result.all()
    
    return list(chunks), int(total_count)


# Get content chunks summary
def get_content_chunks_summary(
    session: Session, content_item_id: uuid.UUID
) -> dict[str, Any]:
    """
    Get a summary of content chunks for a content item, including total count and metadata.

    Args:
        session: Database session
        content_item_id: ID of the content item

    Returns:
        Dictionary with summary information
    """
    # Get total count of chunks using SQLModel syntax
    total_chunks = (
        session.exec(select(func.count(ContentChunk.id)).where(ContentChunk.content_item_id == content_item_id)).scalar() or 0
    )

    # Calculate total word count and character count
    word_count_result = session.exec(
        select(func.sum(ContentChunk.word_count)).where(ContentChunk.content_item_id == content_item_id)
    ).scalar()
    total_word_count = word_count_result or 0

    char_count_result = session.exec(
        select(func.sum(ContentChunk.char_count)).where(ContentChunk.content_item_id == content_item_id)
    ).scalar()
    total_char_count = char_count_result or 0

    return {
        "total_chunks": total_chunks,
        "total_word_count": total_word_count,
        "total_char_count": total_char_count,
        "content_item_id": str(content_item_id),
    }


def update_content_item_sync(
    session: Session,
    *,
    db_content_item: ContentItem,
    content_item_in: dict | Any,  # Accept dict or Pydantic model
) -> ContentItem:
    if isinstance(content_item_in, dict):
        update_data = content_item_in
    else:
        update_data = content_item_in.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        setattr(db_content_item, key, value)

    session.add(db_content_item)
    session.commit()
    session.refresh(db_content_item)
    return db_content_item


def delete_content_item_sync(session: Session, id: uuid.UUID) -> ContentItem | None:
    db_content_item = get_content_item_sync(session, id)
    if db_content_item:
        session.delete(db_content_item)
        session.commit()
        return db_content_item
    return None


# print("CRUD functions for ContentItem and ContentAsset potentially modified for async and image processing.")


# CRUD for ContentShare (Synchronous)


def create_content_share(
    db: Session,
    *,
    content_share_in: ContentShareCreate,
    content_item_id: uuid.UUID,
    _user_id: uuid.UUID,
) -> ContentShare:
    """
    Create a new content share link.
    Note: _user_id is included for audit/ownership but not directly on ContentShare model currently.
    It's used to ensure the user creating the share owns the content_item (checked in API layer).
    """
    share_token = secrets.token_urlsafe(16)
    password_hash = None
    if content_share_in.password:
        password_hash = security.get_password_hash(content_share_in.password)

    db_content_share = ContentShare(
        content_item_id=content_item_id,
        share_token=share_token,
        expires_at=content_share_in.expires_at,
        max_access_count=content_share_in.max_access_count,
        password_hash=password_hash,
        # created_at is default_factory
        # access_count is default 0
        # is_active is default True
    )
    db.add(db_content_share)
    db.commit()
    db.refresh(db_content_share)
    return db_content_share


def get_content_share_by_token(db: Session, token: str) -> ContentShare | None:
    """Get a content share by its unique token."""
    statement = sqlmodel_select(ContentShare).where(ContentShare.share_token == token)
    return db.exec(statement).first()


def get_content_shares_by_content_id(
    db: Session, content_item_id: uuid.UUID
) -> Sequence[ContentShare]:
    """Get all active content shares for a specific content item."""
    statement = sqlmodel_select(ContentShare).where(
        ContentShare.content_item_id == content_item_id,
        ContentShare.is_active == True,  # noqa: E712
    )
    return db.exec(statement).all()


def update_content_share(
    db: Session, *, content_share: ContentShare, update_data: dict[str, Any]
) -> ContentShare:
    """Update a content share."""
    for field, value in update_data.items():
        if field == "password" and value is not None:
            content_share.password_hash = security.get_password_hash(value)
        elif hasattr(content_share, field):
            setattr(content_share, field, value)

    db.add(content_share)
    db.commit()
    db.refresh(content_share)
    return content_share


def increment_access_count(db: Session, *, content_share: ContentShare) -> ContentShare:
    """Increment the access count for a share link and deactivate if max count reached."""
    content_share.access_count += 1
    if (
        content_share.max_access_count is not None
        and content_share.access_count >= content_share.max_access_count
    ):
        content_share.is_active = False

    db.add(content_share)
    db.commit()
    db.refresh(content_share)
    return content_share


def deactivate_content_share(
    db: Session, *, content_share: ContentShare
) -> ContentShare:
    """Deactivate a content share link."""
    content_share.is_active = False
    db.add(content_share)
    db.commit()
    db.refresh(content_share)
    return content_share


def delete_content_share(db: Session, *, id: uuid.UUID) -> ContentShare | None:
    """Delete a content share by its ID."""
    content_share = db.get(ContentShare, id)
    if content_share:
        db.delete(content_share)
        db.commit()
    return content_share
