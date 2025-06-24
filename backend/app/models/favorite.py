import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlmodel import Field, Relationship, SQLModel, UniqueConstraint

from app.utils.timezone import now_utc

if TYPE_CHECKING:
    from app.models import ContentItem, User


class FavoriteBase(SQLModel):
    """Base model for favorites."""

    user_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    content_item_id: uuid.UUID = Field(foreign_key="contentitem.id", index=True)
    created_at: datetime = Field(default_factory=now_utc, nullable=False)


class Favorite(FavoriteBase, table=True):
    """Represents a user's favorite content item."""

    __tablename__ = "favorites"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True, index=True)

    # Add unique constraint to prevent duplicate favorites
    __table_args__ = (
        UniqueConstraint(
            "user_id", "content_item_id", name="unique_user_content_favorite"
        ),
    )

    # Relationships
    user: "User" = Relationship(
        sa_relationship_kwargs={"primaryjoin": "foreign(Favorite.user_id) == User.id"}
    )

    content_item: "ContentItem" = Relationship(
        sa_relationship_kwargs={
            "primaryjoin": "foreign(Favorite.content_item_id) == ContentItem.id"
        }
    )
