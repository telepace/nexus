import uuid
from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel
from sqlalchemy import Column
from sqlalchemy.types import JSON, String
from sqlmodel import Field, Relationship, SQLModel


# 输入变量模型
class InputVariable(BaseModel):
    name: str
    description: str | None = None
    required: bool = False


# 标签链接模型
class PromptTagLink(SQLModel, table=True):
    __tablename__ = "prompt_tags"

    prompt_id: uuid.UUID = Field(foreign_key="prompts.id", primary_key=True)
    tag_id: uuid.UUID = Field(foreign_key="tags.id", primary_key=True)


# 标签响应模型
class TagResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None = None
    color: str | None = None
    created_at: datetime


# 标签模型
class Tag(SQLModel, table=True):
    __tablename__ = "tags"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str = Field(unique=True, index=True)
    description: str | None = None
    color: str | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # 关系
    prompts: list["Prompt"] = Relationship(
        back_populates="tags",
        link_model=PromptTagLink,
        sa_relationship_kwargs={"lazy": "selectin"},
    )

    class Config:
        from_attributes = True


# Prompt type Enum
class PromptType(str, Enum):
    SIMPLE = "simple"
    CHAT = "chat"
    TEMPLATE = "template"
    SYSTEM = "system"
    FUNCTION = "function"


# Visibility Enum
class Visibility(str, Enum):
    PUBLIC = "public"
    PRIVATE = "private"
    TEAM = "team"


# 提示词基础模型
class PromptBase(SQLModel):
    name: str = Field(...)
    description: str | None = None
    content: str = Field(...)
    type: PromptType = Field(..., sa_column=Column("type", String(), nullable=False))
    input_vars: list[InputVariable] | None = Field(default=None, sa_column=Column(JSON))
    visibility: Visibility = Field(
        ..., sa_column=Column("visibility", String(), nullable=False)
    )
    meta_data: dict[str, Any] | None = Field(default=None, sa_column=Column(JSON))
    version: int = Field(default=1)
    enabled: bool = Field(default=False, description="是否启用该提示词")

    # 移除team_id外键引用，使用普通字段
    team_id: uuid.UUID | None = Field(default=None, nullable=True)


# 提示词创建模型
class PromptCreate(PromptBase):
    tag_ids: list[uuid.UUID] | None = None


# 提示词更新模型
class PromptUpdate(SQLModel):
    name: str | None = None
    description: str | None = None
    content: str | None = None
    type: PromptType | None = None
    input_vars: list[InputVariable] | None = None
    visibility: Visibility | None = None
    team_id: uuid.UUID | None = None
    meta_data: dict[str, Any] | None = None
    enabled: bool | None = None
    tag_ids: list[uuid.UUID] | None = None


# 版本创建模型
class PromptVersionCreate(BaseModel):
    content: str
    input_vars: list[InputVariable] | None = None
    change_notes: str | None = None


# 版本数据库模型
class PromptVersion(SQLModel, table=True):
    __tablename__ = "prompt_versions"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    prompt_id: uuid.UUID = Field(..., foreign_key="prompts.id", index=True)
    version: int = Field(...)
    content: str = Field(...)
    input_vars: list[InputVariable] | None = Field(default=None, sa_column=Column(JSON))
    created_by: uuid.UUID = Field(...)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    change_notes: str | None = None

    # 关系
    prompt: "Prompt" = Relationship(back_populates="versions")

    class Config:
        from_attributes = True


# 提示词数据库模型
class Prompt(PromptBase, table=True):
    __tablename__ = "prompts"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    embedding: list[float] | None = Field(default=None, sa_column=Column(JSON))

    # 使用普通字段代替外键引用
    created_by: uuid.UUID = Field(...)

    # 关系
    versions: list[PromptVersion] = Relationship(
        back_populates="prompt",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )
    tags: list[Tag] = Relationship(back_populates="prompts", link_model=PromptTagLink)

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                "name": "Example Prompt",
                "description": "An example prompt",
                "content": "This is an example prompt content",
                "type": "simple",
                "visibility": "public",
                "created_at": "2023-01-01T00:00:00.000000",
                "tags": [],
            }
        }


# 提示词响应模型 - 明确包含标签
class PromptReadWithTags(PromptBase):
    id: uuid.UUID
    created_by: uuid.UUID
    created_at: datetime
    updated_at: datetime
    embedding: list[float] | None = None
    tags: list[Tag] = []  # 显式定义标签列表，默认为空列表

    class Config:
        from_attributes = True


# 标签创建模型
class TagCreate(BaseModel):
    name: str
    description: str | None = None
    color: str | None = None


# 标签更新模型
class TagUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    color: str | None = None
