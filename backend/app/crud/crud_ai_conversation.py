from __future__ import annotations

import json
import uuid
from typing import Sequence, Any

from sqlmodel import Session, select

from app.models.content import AIConversation
from app.schemas.ai_conversations import AIConversationCreate

__all__ = [
    "create_ai_conversation",
    "get_ai_conversation",
    "get_ai_conversations",
]


def create_ai_conversation(
    session: Session,
    *,
    conversation_in: AIConversationCreate,
    user_id: uuid.UUID,
) -> AIConversation:
    """Create a new conversation owned by *user_id*"""

    db_obj = AIConversation(
        user_id=user_id,
        content_item_id=conversation_in.content_item_id,
        title=conversation_in.title,
        ai_model_name=conversation_in.ai_model_name,
        messages=json.dumps(conversation_in.messages or []),
        summary=conversation_in.summary,
        meta_info=json.dumps({}),
    )
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj


def get_ai_conversation(
    session: Session, *, user_id: uuid.UUID, conversation_id: uuid.UUID
) -> AIConversation | None:
    statement = (
        select(AIConversation)
        .where(AIConversation.id == conversation_id, AIConversation.user_id == user_id)
        .limit(1)
    )
    return session.exec(statement).first()


def get_ai_conversations(
    session: Session,
    *,
    user_id: uuid.UUID,
    skip: int = 0,
    limit: int = 20,
    content_item_id: uuid.UUID | None = None,
) -> Sequence[AIConversation]:
    statement = select(AIConversation).where(AIConversation.user_id == user_id)
    if content_item_id:
        statement = statement.where(AIConversation.content_item_id == content_item_id)
    statement = statement.order_by(AIConversation.created_at.desc()).offset(skip).limit(limit)
    return session.exec(statement).all() 