import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlmodel import Field, Relationship, SQLModel, UniqueConstraint, Column, JSON

from app.utils.timezone import now_utc

if TYPE_CHECKING:
    from app.models import ContentItem, User


class FavoriteBase(SQLModel):
    """Base model for favorites."""

    user_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    content_item_id: uuid.UUID = Field(foreign_key="contentitem.id", index=True)
    
    # 新增：支持块级收藏
    block_id: Optional[str] = Field(default=None, description="块ID，如果为空则表示收藏整个内容")
    block_type: Optional[str] = Field(default=None, description="块类型：h1, h2, h3, p, insight, concept, etc.")
    block_content: Optional[dict] = Field(default=None, sa_column=Column(JSON), description="块内容的JSON数据")
    
    # 收藏元数据
    title: Optional[str] = Field(default=None, description="收藏项的标题")
    description: Optional[str] = Field(default=None, description="收藏项的描述")
    tags: Optional[list[str]] = Field(default=None, sa_column=Column(JSON), description="用户自定义标签")
    
    created_at: datetime = Field(default_factory=now_utc, nullable=False)


class Favorite(FavoriteBase, table=True):
    """Represents a user's favorite content item or content block."""

    __tablename__ = "favorites"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True, index=True)

    # 添加唯一约束：用户不能重复收藏同一个内容项的同一个块
    __table_args__ = (
        UniqueConstraint(
            "user_id", "content_item_id", "block_id", name="unique_user_content_block_favorite"
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

    @property
    def is_block_favorite(self) -> bool:
        """判断是否为块级收藏"""
        return self.block_id is not None

    @property
    def is_content_favorite(self) -> bool:
        """判断是否为内容级收藏"""
        return self.block_id is None

    def get_display_title(self) -> str:
        """获取显示标题"""
        if self.title:
            return self.title
        if self.is_block_favorite and self.block_content:
            # 从块内容中提取标题
            block_data = self.block_content
            if isinstance(block_data, dict):
                return block_data.get('c', '')[:100] + ('...' if len(block_data.get('c', '')) > 100 else '')
        return self.content_item.title or "未命名收藏"

    def get_display_description(self) -> str:
        """获取显示描述"""
        if self.description:
            return self.description
        if self.is_block_favorite and self.block_content:
            # 从块内容中提取描述
            block_data = self.block_content
            if isinstance(block_data, dict):
                content = block_data.get('c', '')
                return content[:200] + ('...' if len(content) > 200 else '')
        return self.content_item.content_text[:200] if self.content_item.content_text else ""
