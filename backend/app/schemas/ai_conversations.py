from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlmodel import Field, SQLModel

__all__ = [
    "AIConversationCreate",
    "AIConversationPublic",
    "AIConversationDetail",
]


class AIConversationCreate(SQLModel):
    """Schema for creating a new AI conversation."""

    content_item_id: uuid.UUID | None = None
    title: str | None = None
    ai_model_name: str = Field(default="gemini-2.5-flash-preview-05-20")
    # The first batch of messages that kick-off the conversation.
    # Stored exactly as a list of dicts compatible with OpenAI format, e.g.
    # [{"role": "user", "content": "Hello"}]
    messages: list[dict[str, Any]] = Field(default_factory=list)


class AIConversationPublic(SQLModel):
    """Light-weight schema for listing conversations."""

    id: uuid.UUID
    content_item_id: uuid.UUID | None = None
    title: str | None = None
    ai_model_name: str
    created_at: datetime
    updated_at: datetime


class AIConversationDetail(AIConversationPublic):
    """Full schema for a single conversation, including messages and meta info."""

    messages: list[dict[str, Any]] = Field(default_factory=list)
    meta_info: dict[str, Any] | None = None
