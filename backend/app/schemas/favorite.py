import uuid
from datetime import datetime

from pydantic import BaseModel

from app.schemas.content import ContentItemPublic


class FavoritePublic(BaseModel):
    """Public schema for favorite."""

    id: uuid.UUID
    user_id: uuid.UUID
    content_item_id: uuid.UUID
    created_at: datetime


class FavoriteWithContent(BaseModel):
    """Favorite with embedded content item details."""

    id: uuid.UUID
    user_id: uuid.UUID
    content_item_id: uuid.UUID
    created_at: datetime
    content_item: ContentItemPublic


class FavoriteListResponse(BaseModel):
    """Response schema for favorites list."""

    items: list[FavoriteWithContent]
    total: int
    skip: int
    limit: int


class FavoriteStatusResponse(BaseModel):
    """Response schema for favorite status operations."""

    status: str
