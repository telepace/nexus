import uuid
from datetime import datetime
from typing import Optional

from sqlmodel import SQLModel, Field

# Schemas for ContentItem


class ContentItemBaseSchema(SQLModel):
    type: str
    source_uri: str | None = None
    title: str | None = None
    summary: str | None = None


class ContentItemCreate(ContentItemBaseSchema):
    # Add any fields specific to creation that are not in base or are optional in base but required here
    content_text: str | None = None
    # user_id is set from authentication, not from client request


class ContentItemUpdate(SQLModel):
    # All fields are optional for update
    type: str | None = None
    source_uri: str | None = None
    title: str | None = None
    summary: str | None = None
    content_text: str | None = None
    # user_id is typically not updatable, or handled via different auth/logic
    # processing_status is also typically not updated directly by user


class ContentItemPublic(ContentItemBaseSchema):
    id: uuid.UUID
    user_id: uuid.UUID  # Include user_id in public response for reference
    processing_status: str
    content_text: str | None = None
    created_at: datetime
    updated_at: datetime


class ContentItemDetail(ContentItemPublic):
    """Extended schema for detailed content view with processed content."""

    processed_content: str | None = None
    meta_info: str | None = None


# Schemas for ContentAsset (can be added later if needed for API endpoints)
# For this task, only ContentItem schemas are explicitly required for the endpoints.


# Schemas for ContentShare
class ContentShareBase(SQLModel):
    expires_at: Optional[datetime] = Field(default=None)
    max_access_count: Optional[int] = Field(default=None)
    password: Optional[str] = Field(default=None, sa_column_kwargs={"exclude": True}) # Write-only


class ContentShareCreate(ContentShareBase):
    content_item_id: uuid.UUID # Required when creating a share


class ContentSharePublic(SQLModel): # Intentionally not inheriting from ContentShareBase to select fields
    id: uuid.UUID
    share_token: str
    created_at: datetime
    expires_at: Optional[datetime] = None
    is_active: bool
    # content_item_id could be exposed if needed, but not in this version for simplicity


print("Schemas for ContentItem and ContentShare created in backend/app/schemas/content.py")
