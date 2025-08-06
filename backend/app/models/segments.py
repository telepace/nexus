import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Column, Index, Text, UniqueConstraint
from sqlmodel import Field, Relationship, SQLModel

from app.utils.timezone import now_utc

if TYPE_CHECKING:
    from app.models.content import ContentItem


class ContentSegmentBase(SQLModel):
    """内容段落基础模型"""

    content_item_id: uuid.UUID = Field(foreign_key="contentitem.id", index=True)
    display_number: int = Field(index=True, description="段落显示序号（1-based）")
    content: str = Field(sa_column=Column(Text), description="段落内容")
    start_offset: int | None = Field(default=None, description="在原文中的起始字符位置")
    end_offset: int | None = Field(default=None, description="在原文中的结束字符位置")
    created_at: datetime = Field(default_factory=now_utc, nullable=False)
    updated_at: datetime = Field(
        default_factory=now_utc,
        nullable=False,
        sa_column_kwargs={"onupdate": now_utc},
    )


class ContentSegment(ContentSegmentBase, table=True):
    """内容段落模型 - 用于快速检索原文段落"""

    __tablename__ = "content_segments"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True, index=True)

    # 优化查询性能的索引和唯一约束
    __table_args__ = (
        Index("idx_segments_item_number", "content_item_id", "display_number"),
        Index("idx_segments_item_created", "content_item_id", "created_at"),
        UniqueConstraint(
            "content_item_id", "display_number", name="uq_content_segments_item_number"
        ),
    )

    # 关联关系
    content_item: "ContentItem" = Relationship(
        sa_relationship_kwargs={
            "primaryjoin": "foreign(ContentSegment.content_item_id) == ContentItem.id"
        }
    )
