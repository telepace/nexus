from __future__ import annotations

import json
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session

from app.api.deps import get_current_user, get_db
from app.crud import crud_ai_conversation as crud
from app.models import User
from app.schemas.ai_conversations import (
    AIConversationCreate,
    AIConversationDetail,
    AIConversationPublic,
)
from app.services.ai.segment_aware_chat import SegmentAwareChatService
from app.utils.timezone import now_utc

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
                created_at=conv.created_at,
                updated_at=conv.updated_at,
            )
        )
    return results


@router.post(
    "/", response_model=AIConversationDetail, status_code=status.HTTP_201_CREATED
)
def create_ai_conversation(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    conv_in: AIConversationCreate,
):
    """Create a new AI conversation."""

    db_obj = crud.create_ai_conversation(
        db, conversation_in=conv_in, user_id=current_user.id
    )

    return _to_detail_schema(db_obj)


@router.get("/{conversation_id}", response_model=AIConversationDetail)
def get_ai_conversation_detail(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    conversation_id: uuid.UUID,
):
    conv = crud.get_ai_conversation(
        db, user_id=current_user.id, conversation_id=conversation_id
    )
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found"
        )

    return _to_detail_schema(conv)


@router.get("/{conversation_id}/messages", response_model=list[dict])
def get_ai_conversation_messages(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    conversation_id: uuid.UUID,
):
    conv = crud.get_ai_conversation(
        db, user_id=current_user.id, conversation_id=conversation_id
    )
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found"
        )

    try:
        messages = (
            json.loads(conv.messages)
            if isinstance(conv.messages, str)
            else conv.messages
        )
    except json.JSONDecodeError:
        messages = []
    return messages


@router.post("/{conversation_id}/chat-with-segments")
async def chat_with_segments(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    conversation_id: uuid.UUID,
    message: str,
    content_item_id: uuid.UUID | None = None,
    max_segments: int = Query(8, ge=1, le=20),
    model: str = Query("gpt-4o-mini"),
):
    """
    Send a message and get AI response with segment references.

    This endpoint provides enhanced AI responses that include references to
    specific content segments, enabling traceability of information sources.
    """
    # Verify conversation exists and belongs to user
    conv = crud.get_ai_conversation(
        db, user_id=current_user.id, conversation_id=conversation_id
    )
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found"
        )

    # Initialize segment-aware chat service
    chat_service = SegmentAwareChatService(db)

    try:
        # Get AI response with segment references
        result = await chat_service.chat_with_segments(
            user_message=message,
            conversation_id=conversation_id,
            content_item_id=content_item_id or conv.content_item_id,
            max_segments=max_segments,
            model=model,
        )

        # Update conversation with new messages
        current_messages = json.loads(conv.messages) if conv.messages else []

        # Add user message
        current_messages.append(
            {"role": "user", "content": message, "timestamp": now_utc().isoformat()}
        )

        # Add AI response with segment references
        ai_message = {
            "role": "assistant",
            "content": result["response"],
            "timestamp": now_utc().isoformat(),
            "segment_references": result.get("segment_references", []),
            "segments_used": result.get("segments_used", []),
        }
        current_messages.append(ai_message)

        # Update conversation
        conv.messages = json.dumps(current_messages)
        db.add(conv)
        db.commit()
        db.refresh(conv)

        return {
            "conversation_id": conversation_id,
            "response": result["response"],
            "segment_references": result.get("segment_references", []),
            "segments_used": result.get("segments_used", []),
            "message_index": len(current_messages) - 1,
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate response: {str(e)}",
        )


@router.get("/{conversation_id}/segment-references")
async def get_conversation_segment_references(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    conversation_id: uuid.UUID,
):
    """Get all segment references for a conversation."""
    # Verify conversation exists and belongs to user
    conv = crud.get_ai_conversation(
        db, user_id=current_user.id, conversation_id=conversation_id
    )
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found"
        )

    # Get segment references
    chat_service = SegmentAwareChatService(db)
    references = await chat_service.get_conversation_segment_references(conversation_id)

    return {"conversation_id": conversation_id, "segment_references": references}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _to_detail_schema(conv) -> AIConversationDetail:
    try:
        messages = (
            json.loads(conv.messages)
            if isinstance(conv.messages, str)
            else conv.messages
        )
    except json.JSONDecodeError:
        messages = []

    try:
        meta = (
            json.loads(conv.meta_info)
            if isinstance(conv.meta_info, str)
            else conv.meta_info
        )
    except json.JSONDecodeError:
        meta = None

    return AIConversationDetail(
        id=conv.id,
        content_item_id=conv.content_item_id,
        title=conv.title,
        ai_model_name=conv.ai_model_name,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        messages=messages,
        meta_info=meta,
    )
