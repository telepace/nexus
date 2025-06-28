import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import JSON, Column, Field, Relationship, SQLModel

from app.utils.timezone import now_utc


class ContentItemBase(SQLModel):
    """Base model for content items, containing common fields."""

    user_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    project_id: uuid.UUID | None = Field(
        default=None, foreign_key="projects.id", index=True
    )
    type: str = Field(
        sa_column_args=[
            CheckConstraint("type IN ('url', 'pdf', 'docx', 'text', 'plugin')")
        ],
        max_length=50,
        index=True,
    )
    source_uri: str | None = Field(default=None, max_length=2048)
    title: str | None = Field(default=None, max_length=255)
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
    last_processed_at: datetime | None = Field(default=None)
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
    ai_conversations: list["AIConversation"] = Relationship(
        back_populates="content_item",
        sa_relationship_kwargs={
            "primaryjoin": "ContentItem.id == foreign(AIConversation.content_item_id)"
        },
    )
    segments: list["Segment"] = Relationship(
        back_populates="content_item",
        sa_relationship_kwargs={
            "primaryjoin": "ContentItem.id == foreign(Segment.content_item_id)"
        },
    )
    shares: list["ContentShare"] = Relationship(
        back_populates="content_item",
        sa_relationship_kwargs={
            "primaryjoin": "ContentItem.id == foreign(ContentShare.content_item_id)"
        },
    )
    ai_result: "AIResult" = Relationship(
        back_populates="content_item",
        sa_relationship_kwargs={
            "primaryjoin": "ContentItem.id == foreign(AIResult.content_item_id)",
            "uselist": False,
        },
    )


class AIResultBase(SQLModel):
    """Base model for AI analysis results."""

    content_item_id: uuid.UUID = Field(
        foreign_key="contentitem.id", index=True, unique=True
    )
    # AI-optimized title and description
    optimized_title: str | None = Field(default=None, max_length=255)
    brief_description: str | None = Field(default=None, max_length=500)

    # Existing fields
    summary: dict | None = Field(default=None, sa_column=Column(JSONB))
    key_points: dict | None = Field(default=None, sa_column=Column(JSONB))
    labels: list[str] | None = Field(default=None, sa_column=Column(JSONB))
    content_analysis: dict | None = Field(default=None, sa_column=Column(JSONB))
    reading_time_minutes: int | None = Field(default=None)
    difficulty_level: str | None = Field(
        default=None,
        sa_column_args=[
            CheckConstraint(
                "difficulty_level IN ('beginner', 'intermediate', 'advanced')"
            )
        ],
        max_length=20,
    )
    content_quality_score: float | None = Field(default=None)
    created_at: datetime = Field(default_factory=now_utc, nullable=False)
    updated_at: datetime = Field(
        default_factory=now_utc,
        nullable=False,
        sa_column_kwargs={"onupdate": now_utc},
    )


class AIResult(AIResultBase, table=True):
    """Represents AI analysis results for a ContentItem."""

    __tablename__ = "ai_results"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True, index=True)

    content_item: ContentItem | None = Relationship(
        back_populates="ai_result",
        sa_relationship_kwargs={
            "primaryjoin": "foreign(AIResult.content_item_id) == ContentItem.id"
        },
    )


class ContentAssetBase(SQLModel):
    content_item_id: uuid.UUID = Field(foreign_key="contentitem.id", index=True)
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


class AIConversationBase(SQLModel):
    """Base model for AI conversations, which may or may not be linked to a specific ContentItem."""

    user_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    content_item_id: uuid.UUID | None = Field(
        default=None, foreign_key="contentitem.id", index=True
    )  # Optional link to a content item
    title: str | None = Field(default=None, max_length=255)
    conversation_type: str = Field(
        default="user_chat",
        sa_column_args=[
            CheckConstraint(
                "conversation_type IN ('auto_analysis', 'user_chat', 'prompt_analysis')"
            )
        ],
        max_length=50,
        index=True,
    )  # 对话类型：自动分析、用户聊天、Prompt分析
    ai_model_name: str = Field(max_length=100)  # e.g., 'gpt-4', 'claude-2'
    messages: str = Field(
        default="[]", sa_column=Column(JSON, nullable=False, server_default="[]")
    )
    summary: str | None = Field(default=None, max_length=500)  # 对话的简短总结
    meta_info: str | None = Field(default=None, sa_column=Column(JSON))
    is_active: bool = Field(default=True, index=True)  # 是否激活状态
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


class SegmentBase(SQLModel):
    """Base model for content segments, storing segmented content for efficient rendering."""

    content_item_id: uuid.UUID = Field(foreign_key="contentitem.id", index=True)
    segment_index: int = Field(index=True)  # Order of the segment in the content
    content: str = Field()  # The actual content segment
    content_vector: list[float] | None = Field(
        default=None, sa_column=Column(JSONB)
    )  # Vector embedding for semantic search
    segment_type: str = Field(
        default="paragraph",
        sa_column_args=[
            CheckConstraint(
                "segment_type IN ('heading', 'paragraph', 'code_block', 'table', 'list')"
            )
        ],
        max_length=50,
        index=True,
    )
    word_count: int = Field(default=0)  # Number of words in this segment
    char_count: int = Field(default=0)  # Number of characters in this segment
    meta_info: str | None = Field(
        default=None, sa_column=Column(JSON)
    )  # Additional metadata
    created_at: datetime = Field(default_factory=now_utc, nullable=False)


class Segment(SegmentBase, table=True):
    """Represents a segment of content for efficient loading and rendering."""

    __tablename__ = "segments"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True, index=True)

    # 添加唯一约束防止重复
    __table_args__ = (
        UniqueConstraint(
            "content_item_id",
            "segment_index",
            name="uix_content_segment_idx",
        ),
    )

    content_item: ContentItem | None = Relationship(
        back_populates="segments",
        sa_relationship_kwargs={
            "primaryjoin": "foreign(Segment.content_item_id) == ContentItem.id"
        },
    )


# 保持向后兼容的别名
ContentChunkBase = SegmentBase
ContentChunk = Segment


class ContentShareBase(SQLModel):
    """Base model for content shares."""

    content_item_id: uuid.UUID = Field(
        default=None, foreign_key="contentitem.id", index=True
    )
    share_token: str = Field(max_length=255, unique=True, index=True)
    access_count: int = Field(default=0, nullable=False)
    created_at: datetime = Field(default_factory=now_utc, nullable=False)
    expires_at: datetime | None = Field(default=None)
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


class MessageSegmentReferenceBase(SQLModel):
    """Base model for tracking which segments are referenced in AI conversation messages."""

    conversation_id: uuid.UUID = Field(foreign_key="aiconversation.id", index=True)
    message_index: int = Field(index=True)  # Index of the message in the conversation
    segment_id: uuid.UUID = Field(foreign_key="segments.id", index=True)
    sentence_index: int | None = Field(
        default=None
    )  # Which sentence in the message references this segment
    relevance_score: float | None = Field(
        default=None
    )  # How relevant this segment is to the message
    created_at: datetime = Field(default_factory=now_utc, nullable=False)


class MessageSegmentReference(MessageSegmentReferenceBase, table=True):
    """Represents the relationship between AI conversation messages and referenced segments."""

    __tablename__ = "message_segment_references"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True, index=True)

    # Add unique constraint to prevent duplicate references
    __table_args__ = (
        {"schema": None},  # Use default schema
    )

    conversation: "AIConversation" = Relationship(
        sa_relationship_kwargs={
            "primaryjoin": "foreign(MessageSegmentReference.conversation_id) == AIConversation.id"
        }
    )

    segment: "Segment" = Relationship(
        sa_relationship_kwargs={
            "primaryjoin": "foreign(MessageSegmentReference.segment_id) == Segment.id"
        }
    )


class DeepResearchJobBase(SQLModel):
    """Base model for deep research jobs."""

    user_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    query: str = Field(max_length=2048, description="Research query")
    status: str = Field(
        default="pending",
        sa_column_args=[
            CheckConstraint(
                "status IN ('pending', 'processing', 'completed', 'failed')"
            )
        ],
        max_length=20,
        index=True,
    )
    markdown_path: str | None = Field(default=None, max_length=1024)
    error_message: str | None = Field(default=None)

    # Research configuration
    depth: int = Field(default=3, ge=1, le=5, description="Research depth")
    breadth: int = Field(default=2, ge=1, le=5, description="Research breadth")

    # Results metadata
    research_meta: dict | None = Field(default=None, sa_column=Column(JSONB))

    created_at: datetime = Field(default_factory=now_utc, nullable=False)
    updated_at: datetime = Field(
        default_factory=now_utc,
        nullable=False,
        sa_column_kwargs={"onupdate": now_utc},
    )
    completed_at: datetime | None = Field(default=None)


class DeepResearchJob(DeepResearchJobBase, table=True):
    """Represents a deep research job that processes queries using GPT Researcher."""

    __tablename__ = "deep_research_jobs"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True, index=True)
