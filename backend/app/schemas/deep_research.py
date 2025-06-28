"""
Deep Research API schemas
提供深度研究任务的请求和响应模型
"""

import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


class DeepResearchJobCreate(BaseModel):
    """创建深度研究任务的请求模型"""

    query: str = Field(..., min_length=5, max_length=2048, description="研究查询内容")
    depth: int = Field(default=3, ge=1, le=5, description="研究深度 (1-5)")
    breadth: int = Field(default=2, ge=1, le=5, description="研究广度 (1-5)")

    class Config:
        json_schema_extra = {
            "example": {
                "query": "人工智能在医疗领域的最新发展趋势",
                "depth": 3,
                "breadth": 2,
            }
        }


class DeepResearchJobResponse(BaseModel):
    """创建深度研究任务的响应模型"""

    job_id: uuid.UUID = Field(..., description="任务ID")
    status: str = Field(..., description="任务状态")
    message: str = Field(..., description="响应消息")

    class Config:
        json_schema_extra = {
            "example": {
                "job_id": "123e4567-e89b-12d3-a456-426614174000",
                "status": "pending",
                "message": "深度研究任务已创建，正在队列中等待处理",
            }
        }


class DeepResearchJobPublic(BaseModel):
    """深度研究任务的公开信息模型"""

    id: uuid.UUID
    user_id: uuid.UUID
    query: str
    status: Literal["pending", "processing", "completed", "failed"]
    depth: int
    breadth: int
    error_message: str | None = None
    created_at: datetime
    updated_at: datetime
    completed_at: datetime | None = None

    class Config:
        from_attributes = True


class DeepResearchJobResult(BaseModel):
    """深度研究任务结果模型"""

    status: Literal["pending", "processing", "completed", "failed"]
    markdown_content: str | None = Field(None, description="研究结果的markdown内容")
    research_meta: dict[str, Any] | None = Field(None, description="研究元数据")
    error_message: str | None = Field(None, description="错误信息")
    progress: int = Field(default=0, ge=0, le=100, description="处理进度 (0-100)")

    # 预处理结果 - 与现有markdown处理保持一致
    title: str | None = Field(None, description="自动生成的标题")
    summary: dict | None = Field(None, description="摘要")
    key_points: dict | None = Field(None, description="要点")
    labels: list[str] | None = Field(None, description="标签")
    reading_time_minutes: int | None = Field(None, description="预计阅读时间(分钟)")
    difficulty_level: str | None = Field(None, description="难度级别")
    content_quality_score: float | None = Field(None, description="内容质量分数")

    class Config:
        json_schema_extra = {
            "example": {
                "status": "completed",
                "markdown_content": "# 人工智能在医疗领域的发展趋势\n\n## 概述\n...",
                "research_meta": {
                    "sources_count": 15,
                    "research_duration_seconds": 180,
                    "topics_explored": ["AI诊断", "机器学习", "医疗图像分析"],
                },
                "progress": 100,
                "title": "人工智能在医疗领域的发展趋势",
                "summary": {"brief": "AI在医疗领域的应用正在快速发展..."},
                "key_points": {
                    "points": ["AI诊断准确性提升", "成本降低", "个性化治疗"]
                },
                "labels": ["人工智能", "医疗", "技术趋势"],
                "reading_time_minutes": 8,
                "difficulty_level": "intermediate",
                "content_quality_score": 0.85,
            }
        }
