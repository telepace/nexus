"""项目和智能路由相关的数据模型"""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import Column, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, Relationship, SQLModel

from app.utils.timezone import now_utc

if TYPE_CHECKING:
    from app.base import User


class ProjectBase(SQLModel):
    """项目基础模型"""

    title: str = Field(max_length=255)
    description: str | None = None
    project_type: str = Field(default="general", max_length=50)
    is_active: bool = Field(default=True)
    ai_context: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSONB))
    tag_id: uuid.UUID | None = Field(
        default=None, index=True
    )  # 1:n 关系，一个项目可以有一个标签


class Project(ProjectBase, table=True):
    """项目数据库模型 - 重构自原 Item 表"""

    __tablename__ = "projects"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True, index=True)
    owner_id: uuid.UUID = Field(index=True, nullable=False)
    created_at: datetime = Field(default_factory=now_utc, nullable=False)
    updated_at: datetime = Field(
        default_factory=now_utc, nullable=False, sa_column_kwargs={"onupdate": now_utc}
    )

    # Relationship with User
    owner: "User" = Relationship(
        back_populates="projects",
        sa_relationship_kwargs={
            "primaryjoin": "User.id == Project.owner_id",
            "foreign_keys": "[Project.owner_id]",
        },
    )


class ContentItemTag(SQLModel, table=True):
    """内容项标签关联表"""

    __tablename__ = "contentitem_tags"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    content_item_id: uuid.UUID = Field(index=True, nullable=False)
    tag_id: uuid.UUID = Field(index=True, nullable=False)
    relevance_score: float = Field(default=1.0)
    created_by_ai: bool = Field(default=False, index=True)
    created_at: datetime = Field(default_factory=now_utc, nullable=False)

    __table_args__ = (
        UniqueConstraint("content_item_id", "tag_id", name="uq_contentitem_tag"),
    )


class QueryRouteBase(SQLModel):
    """查询路由基础模型"""

    query_text: str
    confidence_score: float | None = None
    routing_context: dict[str, Any] = Field(
        default_factory=dict, sa_column=Column(JSONB)
    )
    user_confirmed: bool | None = None


class QueryRoute(QueryRouteBase, table=True):
    """查询路由记录表"""

    __tablename__ = "query_routes"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(index=True, nullable=False)
    routed_project_id: uuid.UUID | None = Field(default=None, index=True)
    routed_tag_id: uuid.UUID | None = Field(default=None, index=True)
    created_at: datetime = Field(default_factory=now_utc, nullable=False, index=True)


# Pydantic 模型用于 API 响应
class ProjectPublic(ProjectBase):
    """公开的项目信息"""

    id: uuid.UUID
    owner_id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class ProjectCreate(ProjectBase):
    """创建项目的请求模型"""

    pass


class ProjectUpdate(SQLModel):
    """更新项目的请求模型"""

    title: str | None = None
    description: str | None = None
    project_type: str | None = None
    is_active: bool | None = None
    ai_context: dict[str, Any] | None = None
    tag_id: uuid.UUID | None = None


class ProjectsPublic(SQLModel):
    """项目列表响应模型"""

    data: list[ProjectPublic]
    count: int


class QueryRoutePublic(QueryRouteBase):
    """公开的查询路由信息"""

    id: uuid.UUID
    user_id: uuid.UUID
    routed_project_id: uuid.UUID | None
    routed_tag_id: uuid.UUID | None
    created_at: datetime


class QueryRouteCreate(QueryRouteBase):
    """创建查询路由的请求模型"""

    routed_project_id: uuid.UUID | None = None
    routed_tag_id: uuid.UUID | None = None


class SmartRoutingRequest(SQLModel):
    """智能路由请求模型"""

    query_text: str
    context: dict[str, Any] | None = None


class SmartRoutingResponse(SQLModel):
    """智能路由响应模型"""

    recommended_project_id: uuid.UUID | None = None
    recommended_project_name: str | None = None
    confidence_score: float
    reasoning: str
    alternative_projects: list[dict[str, Any]] = Field(default_factory=list)
    should_create_new: bool = False
    suggested_project_name: str | None = None
