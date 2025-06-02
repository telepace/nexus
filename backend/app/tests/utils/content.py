import uuid
from datetime import datetime, timezone

from sqlmodel import Session

from app.crud import (
    crud_content,  # Assuming sync create_content_item_sync is aliased or directly used
)
from app.models.content import ContentItem


def create_random_content_item(db: Session, *, user_id: uuid.UUID) -> ContentItem:
    """
    Create a random content item for testing.
    """
    # Minimal data for a ContentItem
    item_data = ContentItem(
        user_id=user_id,
        type="text",  # Default type
        title=f"Test Content {uuid.uuid4()}",
        content_text="This is some test content.",
        processing_status="completed",  # Assume completed for simplicity in tests not focusing on processing
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    # Use the synchronous CRUD function if available and appropriate for test setup
    # If your main create function is async, you might need an async test setup or a sync helper.
    # For CRUD tests using a sync session, a sync creator is fine.

    # Re-checking crud_content.py, create_content_item_sync takes ContentItem directly.
    created_item = crud_content.create_content_item_sync(
        session=db, content_item_in=item_data
    )
    return created_item
