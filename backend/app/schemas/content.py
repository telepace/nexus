import uuid
from datetime import datetime

from sqlmodel import SQLModel

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

print("Schemas for ContentItem created in backend/app/schemas/content.py")
