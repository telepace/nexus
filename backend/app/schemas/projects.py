"""Project schemas for API requests and responses."""

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class ProjectBase(BaseModel):
    """项目基础模型"""

    title: str = Field(max_length=255)
    description: str | None = None
    project_type: str = Field(default="general", max_length=50)
    is_active: bool = Field(default=True)
    ai_context: dict[str, Any] = Field(default_factory=dict)


class ProjectCreate(ProjectBase):
    """创建项目的请求模型"""

    pass


class ProjectUpdate(BaseModel):
    """更新项目的请求模型"""

    title: str | None = None
    description: str | None = None
    project_type: str | None = None
    is_active: bool | None = None
    ai_context: dict[str, Any] | None = None


class ProjectPublic(ProjectBase):
    """公开的项目信息"""

    id: uuid.UUID
    owner_id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class ProjectsPublic(BaseModel):
    """项目列表响应模型"""

    data: list[ProjectPublic]
    count: int
