import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import JSON, Column, Field, Relationship, SQLModel

# 导入时区工具
from app.utils.timezone import now_utc


class ContentItemBase(SQLModel):
    """Base model for content items, containing common fields."""

    user_id: uuid.UUID = Field(index=True)
    project_id: uuid.UUID | None = Field(default=None, index=True)
    type: str = Field(
        sa_column_args=[
            CheckConstraint("type IN ('url', 'pdf', 'docx', 'text', 'plugin')")
        ],
        max_length=50,
        index=True,
    )
    source_uri: str | None = Field(default=None, max_length=2048)
    title: str | None = Field(default=None, max_length=255)
    summary: str | None = Field(default=None)
    content_text: str | None = Field(default=None)
    content_vector: list[float] | None = Field(default=None, sa_column=Column(JSONB))
    meta_info: str | None = Field(default=None, sa_column=Column(JSON))
    processing_status: str = Field(
        default="pending",
        sa_column_args=[
            CheckConstraint(
                "processing_status IN ('pending', 'processing', 'completed', 'failed')"
            )
        ],
        max_length=50,
        index=True,
    )
    error_message: str | None = Field(default=None)
    created_at: datetime = Field(default_factory=now_utc, nullable=False)
    updated_at: datetime = Field(
        default_factory=now_utc,
        nullable=False,
        sa_column_kwargs={"onupdate": now_utc},
    )


class ContentItem(ContentItemBase, table=True):
    """Represents a piece of content ingested into the system, linking to its assets and processing state."""

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True, index=True)

    assets: list["ContentAsset"] = Relationship(
        back_populates="content_item",
        sa_relationship_kwargs={
            "primaryjoin": "ContentItem.id == foreign(ContentAsset.content_item_id)"
        },
    )
    processing_jobs: list["ProcessingJob"] = Relationship(
        back_populates="content_item",
        sa_relationship_kwargs={
            "primaryjoin": "ContentItem.id == foreign(ProcessingJob.content_item_id)"
        },
    )
    ai_conversations: list["AIConversation"] = Relationship(
        back_populates="content_item",
        sa_relationship_kwargs={
            "primaryjoin": "ContentItem.id == foreign(AIConversation.content_item_id)"
        },
    )
    chunks: list["ContentChunk"] = Relationship(
        back_populates="content_item",
        sa_relationship_kwargs={
            "primaryjoin": "ContentItem.id == foreign(ContentChunk.content_item_id)"
        },
    )
    shares: list["ContentShare"] = Relationship(
        back_populates="content_item",
        sa_relationship_kwargs={
            "primaryjoin": "ContentItem.id == foreign(ContentShare.content_item_id)"
        },
    )


class ContentAssetBase(SQLModel):
    content_item_id: uuid.UUID = Field(index=True)
    type: str = Field(
        sa_column_args=[
            CheckConstraint(
                "type IN ('raw', 'processed_text', 'image', 'audio', 'video', 'metadata_json')"
            )
        ],
        max_length=50,
        index=True,
    )
    file_path: str | None = Field(default=None, max_length=1024)  # S3 key or local path
    s3_bucket: str | None = Field(default=None, max_length=255)
    s3_key: str | None = Field(default=None, max_length=1024)
    local_path: str | None = Field(
        default=None, max_length=1024
    )  # For assets stored locally before S3 upload
    mime_type: str | None = Field(default=None, max_length=100)
    size_bytes: int | None = Field(default=None)
    meta_info: str | None = Field(default=None, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=now_utc, nullable=False)
    updated_at: datetime = Field(
        default_factory=now_utc,
        nullable=False,
        sa_column_kwargs={"onupdate": now_utc},
    )


class ContentAsset(ContentAssetBase, table=True):
    """Represents a file or data asset associated with a ContentItem, e.g., raw file, processed text, image."""

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True, index=True)

    content_item: ContentItem | None = Relationship(
        back_populates="assets",
        sa_relationship_kwargs={
            "primaryjoin": "foreign(ContentAsset.content_item_id) == ContentItem.id"
        },
    )


class ProcessingJobBase(SQLModel):
    """Base model for tracking processing jobs performed on content items."""

    content_item_id: uuid.UUID = Field(index=True)
    processor_name: str = Field(
        max_length=100, index=True
    )  # e.g., 'summarizer', 'vectorizer', 'ocr'
    status: str = Field(
        default="pending",
        sa_column_args=[
            CheckConstraint(
                "status IN ('pending', 'in_progress', 'completed', 'failed', 'skipped')"
            )
        ],
        max_length=50,
        index=True,
    )
    parameters: str | None = Field(default=None, sa_column=Column(JSON))
    result: str | None = Field(default=None, sa_column=Column(JSON))
    error_message: str | None = Field(default=None)
    started_at: datetime | None = Field(default=None)
    completed_at: datetime | None = Field(default=None)
    created_at: datetime = Field(default_factory=now_utc, nullable=False)
    updated_at: datetime = Field(
        default_factory=now_utc,
        nullable=False,
        sa_column_kwargs={"onupdate": now_utc},
    )


class ProcessingJob(ProcessingJobBase, table=True):
    """Represents a specific processing task (e.g., OCR, summarization) applied to a ContentItem."""

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True, index=True)

    content_item: ContentItem | None = Relationship(
        back_populates="processing_jobs",
        sa_relationship_kwargs={
            "primaryjoin": "foreign(ProcessingJob.content_item_id) == ContentItem.id"
        },
    )


class AIConversationBase(SQLModel):
    """Base model for AI conversations, which may or may not be linked to a specific ContentItem."""

    user_id: uuid.UUID = Field(index=True)
    content_item_id: uuid.UUID | None = Field(
        default=None, index=True
    )  # Optional link to a content item
    title: str | None = Field(default=None, max_length=255)
    ai_model_name: str = Field(max_length=100)  # e.g., 'gpt-4', 'claude-2'
    messages: str = Field(
        default="[]", sa_column=Column(JSON, nullable=False, server_default="[]")
    )
    summary: str | None = Field(default=None)
    meta_info: str | None = Field(default=None, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=now_utc, nullable=False)
    updated_at: datetime = Field(
        default_factory=now_utc,
        nullable=False,
        sa_column_kwargs={"onupdate": now_utc},
    )


class AIConversation(AIConversationBase, table=True):
    """Represents a sequence of messages exchanged with an AI model, potentially related to a ContentItem."""

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True, index=True)

    content_item: ContentItem | None = Relationship(
        back_populates="ai_conversations",
        sa_relationship_kwargs={
            "primaryjoin": "foreign(AIConversation.content_item_id) == ContentItem.id"
        },
    )


class ContentChunkBase(SQLModel):
    """Base model for content chunks, storing segmented content for efficient rendering."""

    content_item_id: uuid.UUID = Field(index=True)
    chunk_index: int = Field(index=True)  # Order of the chunk in the content
    chunk_content: str = Field()  # The actual content segment
    chunk_type: str = Field(
        default="paragraph",
        sa_column_args=[
            CheckConstraint(
                "chunk_type IN ('heading', 'paragraph', 'code_block', 'table', 'list')"
            )
        ],
        max_length=50,
        index=True,
    )
    word_count: int = Field(default=0)  # Number of words in this chunk
    char_count: int = Field(default=0)  # Number of characters in this chunk
    meta_info: str | None = Field(
        default=None, sa_column=Column(JSON)
    )  # Additional metadata
    created_at: datetime = Field(default_factory=now_utc, nullable=False)


class ContentChunk(ContentChunkBase, table=True):
    """Represents a segment of content for efficient loading and rendering."""

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True, index=True)

    content_item: ContentItem | None = Relationship(
        back_populates="chunks",
        sa_relationship_kwargs={
            "primaryjoin": "foreign(ContentChunk.content_item_id) == ContentItem.id"
        },
    )


class ContentShareBase(SQLModel):
    """Base model for content shares."""

    content_item_id: uuid.UUID = Field(
        default=None, foreign_key="contentitem.id", index=True
    )
    share_token: str = Field(max_length=255, unique=True, index=True)
    created_at: datetime = Field(default_factory=now_utc, nullable=False)
    expires_at: datetime | None = Field(default=None)
    access_count: int = Field(default=0)
    max_access_count: int | None = Field(default=None)
    password_hash: str | None = Field(default=None, max_length=255)
    is_active: bool = Field(default=True, index=True)


class ContentShare(ContentShareBase, table=True):
    """Represents a shareable link for a ContentItem."""

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True, index=True)

    content_item: ContentItem | None = Relationship(back_populates="shares")


# Ensure User model is defined elsewhere and imported if needed for relationships
# For example, if User model is in backend/app/models/user.py:
# from .user import User
# And ensure User model has corresponding relationships:
# assets: List["ContentAsset"] = Relationship(back_populates="user") # If user owns assets directly
# ai_conversations: List["AIConversation"] = Relationship(back_populates="user") # If user has direct convos not tied to content items
# content_items: List["ContentItem"] = Relationship(back_populates="user")
# The current schema has user_id in ContentItem and AIConversation, so the User model would need:
# content_items: List["ContentItem"] = Relationship(back_populates="user_owner") # or a suitable name
# ai_conversations: List["AIConversation"] = Relationship(back_populates="user_owner") # or a suitable name
# However, the relationships are defined from the perspective of these new models to the User model.
# The User model would need to be updated separately to reflect these relationships if bidirectional access is needed.
# For now, the foreign keys are defined, which is sufficient for these models.
