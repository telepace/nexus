"""Dashboard schemas for smart routing and analytics."""

import uuid
from typing import Any

from pydantic import BaseModel, Field


class SmartRoutingRequest(BaseModel):
    """智能路由请求模型"""

    query_text: str
    context: dict[str, Any] | None = None


class SmartRoutingResponse(BaseModel):
    """智能路由响应模型"""

    recommended_project_id: uuid.UUID | None = None
    recommended_project_name: str | None = None
    confidence_score: float
    reasoning: str
    alternative_projects: list[dict[str, Any]] = Field(default_factory=list)
    should_create_new: bool = False
    suggested_project_name: str | None = None


class DashboardMetrics(BaseModel):
    """Dashboard指标模型"""

    projects_count: int
    content_items_count: int
    processed_content_count: int
    routing_count: int
    growth_indicators: dict[str, int]
    recent_active_projects: list[dict[str, Any]]


class ActivityItem(BaseModel):
    """活动项模型"""

    type: str
    title: str
    description: str
    timestamp: str
    confidence: float | None = None
    status: str | None = None
