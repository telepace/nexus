import uuid
from datetime import datetime
from typing import Any

from sqlmodel import Field, SQLModel


class AIMessageSchema(SQLModel):
    """Single message in an AI conversation."""

    model_config = {"extra": "allow"}

    role: str = Field(description="Message role: system, user, or assistant")
    content: str = Field(description="Message content")
    timestamp: datetime | None = Field(default=None, description="Message timestamp")
    message_metadata: dict[str, Any] | None = Field(
        default=None, description="Additional metadata", alias="metadata"
    )


class AIConversationCreate(SQLModel):
    """Schema for creating a new AI conversation."""

    title: str | None = None
    conversation_type: str = Field(
        default="user_chat", description="Type of conversation"
    )
    ai_model_name: str = Field(default="gpt-4", description="AI model to use")
    initial_message: str | None = Field(
        default=None, description="Initial user message"
    )


class AIConversationPublic(SQLModel):
    """Public schema for AI conversation."""

    id: uuid.UUID
    user_id: uuid.UUID
    content_item_id: uuid.UUID | None
    title: str | None
    conversation_type: str
    ai_model_name: str
    messages: list[AIMessageSchema]
    summary: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class AddMessageRequest(SQLModel):
    """Schema for adding a message to an existing conversation."""

    content: str = Field(description="Message content")
    role: str = Field(default="user", description="Message role")


class AnalysisPromptRequest(SQLModel):
    """Schema for triggering analysis with predefined prompts."""

    prompt_type: str = Field(
        description="Type of analysis: summary, key_points, questions, insights"
    )
    custom_instruction: str | None = Field(
        default=None, description="Custom instruction to add to the prompt"
    )


# 预设分析Prompt模板
ANALYSIS_PROMPTS = {
    "summary": {
        "title": "内容摘要",
        "prompt": "请为这篇内容写一个简洁的摘要，突出主要观点和核心信息。摘要应该帮助读者快速了解文章的主要内容。",
        "system_message": "你是一个专业的内容分析师，擅长提取和总结文章的核心信息。",
    },
    "key_points": {
        "title": "关键要点",
        "prompt": "请提取这篇内容的关键要点，以结构化的方式列出。每个要点应该简洁明了，突出重要信息。",
        "system_message": "你是一个专业的内容分析师，擅长识别和提取文章的关键信息点。",
    },
    "questions": {
        "title": "思考问题",
        "prompt": "基于这篇内容，生成一些有深度的思考问题来加深读者对内容的理解。问题应该促进批判性思维。",
        "system_message": "你是一个教育专家，擅长设计促进深度思考的问题。",
    },
    "insights": {
        "title": "深度见解",
        "prompt": "请分析这篇内容的深层见解、潜在影响和可能的应用场景。提供你的专业分析和观点。",
        "system_message": "你是一个资深分析师，擅长从多个角度分析内容的深层含义和价值。",
    },
    "action_items": {
        "title": "行动建议",
        "prompt": "基于这篇内容，提供具体的行动建议或实施步骤。帮助读者将理论转化为实践。",
        "system_message": "你是一个实践导向的顾问，擅长将知识转化为可执行的行动计划。",
    },
}


class ConversationListResponse(SQLModel):
    """Response schema for conversation list."""

    conversations: list[AIConversationPublic]
    total: int
    has_auto_analysis: bool = Field(
        description="Whether auto analysis conversation exists"
    )
