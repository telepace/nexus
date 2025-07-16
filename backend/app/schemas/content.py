import uuid
from datetime import datetime

from pydantic import BaseModel
from sqlmodel import Field, SQLModel


# New schema for AI results
class AIResultPublic(SQLModel):
    optimized_title: str | None = None
    brief_description: str | None = None
    summary: dict | None = None
    key_points: dict | None = None
    labels: list[str] | None = None
    content_analysis: dict | None = None
    reading_time_minutes: int | None = None
    difficulty_level: str | None = None
    content_quality_score: float | None = None


# Schemas for ContentItem


class ContentItemBaseSchema(SQLModel):
    type: str
    source_uri: str | None = None
    title: str | None = None


class ContentItemCreate(ContentItemBaseSchema):
    # Add any fields specific to creation that are not in base or are optional in base but required here
    content_text: str | None = None
    # user_id is set from authentication, not from client request


class ContentItemUpdate(SQLModel):
    # All fields are optional for update
    type: str | None = None
    source_uri: str | None = None
    title: str | None = None
    content_text: str | None = None
    # user_id is typically not updatable, or handled via different auth/logic
    # processing_status is also typically not updated directly by user


class ContentItemPublic(ContentItemBaseSchema):
    id: uuid.UUID
    user_id: uuid.UUID  # Include user_id in public response for reference
    processing_status: str
    content_text: str | None = None
    error_message: str | None = None
    last_processed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
    ai_result: AIResultPublic | None = None


class ContentItemDetail(ContentItemPublic):
    """Extended schema for detailed content view with processed content."""

    processed_content: str | None = None
    meta_info: str | None = None


# Schemas for ContentAsset (can be added later if needed for API endpoints)
# For this task, only ContentItem schemas are explicitly required for the endpoints.


# Schemas for ContentShare
class ContentShareBase(SQLModel):
    expires_at: datetime | None = Field(default=None)
    max_access_count: int | None = Field(default=None)
    password: str | None = Field(
        default=None, sa_column_kwargs={"exclude": True}
    )  # Write-only


class ContentShareCreate(ContentShareBase):
    # content_item_id will be provided via URL path parameter, not request body
    pass


class ContentSharePublic(
    SQLModel
):  # Intentionally not inheriting from ContentShareBase to select fields
    id: uuid.UUID
    share_token: str
    created_at: datetime
    expires_at: datetime | None = None
    is_active: bool
    # content_item_id could be exposed if needed, but not in this version for simplicity


print(
    "Schemas for ContentItem and ContentShare created in backend/app/schemas/content.py"
)


class ContentAnalysisRequest(BaseModel):
    """内容分析请求schema"""

    analysis_instruction: str = Field(..., description="用户的分析指令")
    model: str | None = Field(
        default=None,
        description="要使用的AI模型（可选，后端会自动选择默认模型）",
    )
    template_name: str | None = Field(
        default="user_analysis.j2",
        description="要使用的分析模板（可选，默认为user_analysis.j2）",
    )
    selected_point: str | None = Field(
        default=None,
        description="选中的要点内容（用于expand_discussion模板）",
    )
    temperature: float = Field(default=0.7, description="温度参数")
    max_tokens: int = Field(default=8000, description="最大token数")
