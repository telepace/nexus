import uuid
from collections.abc import Sequence
from typing import Any

from sqlmodel import Session, select

from app.models.content import ContentAsset, ContentItem

# Placeholder schemas (can be replaced by actual schemas from app.schemas later)
# For simplicity in this task, we'll use the main model types for creation/update inputs.
# If ContentItemCreate, ContentItemUpdate etc. schemas were defined, they would be imported here.
# e.g. from app.schemas.content import ContentItemCreate, ContentItemUpdate

# CRUD for ContentItem


def get_content_item(session: Session, id: uuid.UUID) -> ContentItem | None:
    """
    Retrieves a ContentItem by its unique ID.

    Args:
        session: The database session.
        id: The UUID of the ContentItem to retrieve.

    Returns:
        The ContentItem object if found, otherwise None.
    """
    return session.get(ContentItem, id)


def get_content_items(
    session: Session, skip: int = 0, limit: int = 100, user_id: uuid.UUID | None = None
) -> Sequence[ContentItem]:
    """
    Retrieves a list of ContentItem objects, with optional pagination and user filtering.

    Args:
        session: The database session.
        skip: The number of items to skip (for pagination).
        limit: The maximum number of items to return (for pagination).
        user_id: Optional UUID of the user to filter ContentItems by.

    Returns:
        A sequence of ContentItem objects.
    """
    statement = select(ContentItem)
    if user_id:
        statement = statement.where(ContentItem.user_id == user_id)
    statement = statement.offset(skip).limit(limit)
    items = session.exec(statement).all()
    return items


def create_content_item(session: Session, content_item_in: ContentItem) -> ContentItem:
    """
    Creates a new ContentItem in the database.

    Args:
        session: The database session.
        content_item_in: The ContentItem model instance with data for the new item.
                         It's assumed that this instance has already been validated if created
                         from a schema (e.g., ContentItemCreate).

    Returns:
        The newly created and refreshed ContentItem object.
    """
    db_content_item = ContentItem.model_validate(
        content_item_in
    )  # Ensure it's a valid model instance
    session.add(db_content_item)
    session.commit()
    session.refresh(db_content_item)
    return db_content_item


def update_content_item(
    session: Session,
    db_content_item: ContentItem,
    content_item_in: Any,
    # content_item_in could be ContentItemUpdate schema or Dict[str, Any]
) -> ContentItem:
    """
    Updates an existing ContentItem in the database.

    Args:
        session: The database session.
        db_content_item: The existing ContentItem model instance to update.
        content_item_in: An object containing the fields to update. This can be a Pydantic
                         model (e.g., ContentItemUpdate) or a dictionary.

    Returns:
        The updated and refreshed ContentItem object.
    """
    if isinstance(content_item_in, dict):
        update_data = content_item_in
    else:  # Assumes Pydantic model
        update_data = content_item_in.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        setattr(db_content_item, key, value)

    session.add(db_content_item)
    session.commit()
    session.refresh(db_content_item)
    return db_content_item


def delete_content_item(session: Session, id: uuid.UUID) -> ContentItem | None:
    """
    Deletes a ContentItem from the database by its ID.

    Args:
        session: The database session.
        id: The UUID of the ContentItem to delete.

    Returns:
        The deleted ContentItem object if found and deleted, otherwise None.
    """
    db_content_item = session.get(ContentItem, id)
    if db_content_item:
        session.delete(db_content_item)
        session.commit()
        return db_content_item
    return None


# CRUD for ContentAsset


def get_content_asset(session: Session, id: uuid.UUID) -> ContentAsset | None:
    """
    Retrieves a ContentAsset by its unique ID.

    Args:
        session: The database session.
        id: The UUID of the ContentAsset to retrieve.

    Returns:
        The ContentAsset object if found, otherwise None.
    """
    return session.get(ContentAsset, id)


def get_content_assets_by_item_id(
    session: Session, content_item_id: uuid.UUID, skip: int = 0, limit: int = 100
) -> Sequence[ContentAsset]:
    """
    Retrieves a list of ContentAsset objects associated with a specific ContentItem,
    with optional pagination.

    Args:
        session: The database session.
        content_item_id: The UUID of the parent ContentItem.
        skip: The number of assets to skip (for pagination).
        limit: The maximum number of assets to return (for pagination).

    Returns:
        A sequence of ContentAsset objects.
    """
    statement = (
        select(ContentAsset)
        .where(ContentAsset.content_item_id == content_item_id)
        .offset(skip)
        .limit(limit)
    )
    assets = session.exec(statement).all()
    return assets


def create_content_asset(
    session: Session, content_asset_in: ContentAsset
) -> ContentAsset:
    """
    Creates a new ContentAsset in the database.

    Args:
        session: The database session.
        content_asset_in: The ContentAsset model instance with data for the new asset.

    Returns:
        The newly created and refreshed ContentAsset object.
    """
    db_content_asset = ContentAsset.model_validate(
        content_asset_in
    )  # Ensure valid model instance
    session.add(db_content_asset)
    session.commit()
    session.refresh(db_content_asset)
    return db_content_asset


def update_content_asset(
    session: Session,
    db_content_asset: ContentAsset,
    content_asset_in: Any,
    # content_asset_in could be ContentAssetUpdate schema or Dict[str, Any]
) -> ContentAsset:
    """
    Updates an existing ContentAsset in the database.

    Args:
        session: The database session.
        db_content_asset: The existing ContentAsset model instance to update.
        content_asset_in: An object containing the fields to update. This can be a Pydantic
                         model or a dictionary.

    Returns:
        The updated and refreshed ContentAsset object.
    """
    if isinstance(content_asset_in, dict):
        update_data = content_asset_in
    else:  # Assumes Pydantic model
        update_data = content_asset_in.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        setattr(db_content_asset, key, value)

    session.add(db_content_asset)
    session.commit()
    session.refresh(db_content_asset)
    return db_content_asset


def delete_content_asset(session: Session, id: uuid.UUID) -> ContentAsset | None:
    """
    Deletes a ContentAsset from the database by its ID.

    Args:
        session: The database session.
        id: The UUID of the ContentAsset to delete.

    Returns:
        The deleted ContentAsset object if found and deleted, otherwise None.
    """
    db_content_asset = session.get(ContentAsset, id)
    if db_content_asset:
        session.delete(db_content_asset)
        session.commit()
        return db_content_asset
    return None


print("CRUD functions for ContentItem and ContentAsset implemented.")
