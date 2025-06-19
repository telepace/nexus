from __future__ import annotations

import json
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status, Body
from sqlmodel import Session

from app.api.deps import get_current_user, get_db
from app.crud import crud_ai_conversation as crud
from app.models import User
from app.schemas.ai_conversations import (
    AIConversationCreate,
    AIConversationPublic,
    AIConversationDetail,
)

router = APIRouter(tags=["ai-conversations"])


@router.get("/", response_model=list[AIConversationPublic])
def list_ai_conversations(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    content_item_id: uuid.UUID | None = Query(None),
):
    """Retrieve conversations of current user. Optionally filter by content_item_id."""

    conversations = crud.get_ai_conversations(
        db,
        user_id=current_user.id,
        skip=skip,
        limit=limit,
        content_item_id=content_item_id,
    )

    results: list[AIConversationPublic] = []
    for conv in conversations:
        results.append(
            AIConversationPublic(
                id=conv.id,
                content_item_id=conv.content_item_id,
                title=conv.title,
                ai_model_name=conv.ai_model_name,
                summary=conv.summary,
                created_at=conv.created_at,
                updated_at=conv.updated_at,
            )
        )
    return results


@router.post("/", response_model=AIConversationDetail, status_code=status.HTTP_201_CREATED)
def create_ai_conversation(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    conv_in: AIConversationCreate,
):
    """Create a new AI conversation."""

    db_obj = crud.create_ai_conversation(db, conversation_in=conv_in, user_id=current_user.id)

    return _to_detail_schema(db_obj)


@router.get("/{conversation_id}", response_model=AIConversationDetail)
def get_ai_conversation_detail(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    conversation_id: uuid.UUID,
):
    conv = crud.get_ai_conversation(db, user_id=current_user.id, conversation_id=conversation_id)
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    return _to_detail_schema(conv)


@router.get("/{conversation_id}/messages", response_model=list[dict])
def get_ai_conversation_messages(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    conversation_id: uuid.UUID,
):
    conv = crud.get_ai_conversation(db, user_id=current_user.id, conversation_id=conversation_id)
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    try:
        messages = json.loads(conv.messages) if isinstance(conv.messages, str) else conv.messages
    except json.JSONDecodeError:
        messages = []
    return messages


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _to_detail_schema(conv) -> AIConversationDetail:
    try:
        messages = json.loads(conv.messages) if isinstance(conv.messages, str) else conv.messages
    except json.JSONDecodeError:
        messages = []

    try:
        meta = json.loads(conv.meta_info) if isinstance(conv.meta_info, str) else conv.meta_info
    except json.JSONDecodeError:
        meta = None

    return AIConversationDetail(
        id=conv.id,
        content_item_id=conv.content_item_id,
        title=conv.title,
        ai_model_name=conv.ai_model_name,
        summary=conv.summary,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        messages=messages,
        meta_info=meta,
    ) 