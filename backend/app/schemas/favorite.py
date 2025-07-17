import uuid
from datetime import datetime
from typing import Optional

from sqlmodel import SQLModel

from app.schemas.content import ContentItemPublic


class FavoriteBase(SQLModel):
    """Base favorite schema."""
    
    user_id: uuid.UUID
    content_item_id: uuid.UUID
    
    # 块级收藏支持
    block_id: Optional[str] = None
    block_type: Optional[str] = None
    block_content: Optional[dict] = None
    
    # 收藏元数据
    title: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[list[str]] = None
    
    created_at: datetime


class FavoriteCreate(SQLModel):
    """Create favorite schema."""
    
    content_item_id: uuid.UUID
    
    # 块级收藏支持
    block_id: Optional[str] = None
    block_type: Optional[str] = None
    block_content: Optional[dict] = None
    
    # 收藏元数据
    title: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[list[str]] = None


class FavoriteUpdate(SQLModel):
    """Update favorite schema."""
    
    title: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[list[str]] = None


class FavoritePublic(FavoriteBase):
    """Public favorite schema."""
    
    id: uuid.UUID


class FavoriteWithContent(FavoritePublic):
    """Favorite with content item information."""
    
    content_item: ContentItemPublic


class FavoriteListResponse(SQLModel):
    """Favorite list response schema."""
    
    items: list[FavoriteWithContent]
    total: int
    skip: int
    limit: int


class FavoriteBlockCreate(SQLModel):
    """Create block favorite schema."""
    
    content_item_id: uuid.UUID
    block_id: str
    block_type: str
    block_content: dict
    
    # 可选的用户自定义信息
    title: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[list[str]] = None


class FavoriteBlockPublic(SQLModel):
    """Public block favorite schema."""
    
    id: uuid.UUID
    user_id: uuid.UUID
    content_item_id: uuid.UUID
    block_id: str
    block_type: str
    block_content: dict
    
    title: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[list[str]] = None
    
    created_at: datetime
    
    # 计算属性
    display_title: str
    display_description: str


class FavoriteBlockWithContent(FavoriteBlockPublic):
    """Block favorite with content item information."""
    
    content_item: ContentItemPublic


class FavoriteBlockListResponse(SQLModel):
    """Block favorite list response schema."""
    
    items: list[FavoriteBlockWithContent]
    total: int
    skip: int
    limit: int
