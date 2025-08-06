from __future__ import annotations

import json
import uuid
from collections.abc import Sequence

from sqlmodel import Session, select

from app.models.content import AIConversation
from app.schemas.ai_conversations import AIConversationCreate
from app.utils.timezone import now_utc

__all__ = [
    "create_ai_conversation",
    "create_ai_conversation_for_analysis",
    "update_ai_conversation_response",
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
        meta_info=json.dumps({}),
    )
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj


def create_ai_conversation_for_analysis(
    session: Session,
    user_id: uuid.UUID,
    content_item_id: uuid.UUID,
    content_item_title: str,
    analysis_instruction: str,
    content_to_analyze: str,
    model: str,
    temperature: float,
    max_tokens: int,
) -> AIConversation:
    """
    创建用于内容分析的AIConversation记录

    这是专门为内容分析场景设计的创建函数，包含完整的元数据和消息结构。
    """
    from app.utils.prompt_helpers import render_user_analysis_prompt

    # 使用用户分析模板渲染prompt
    user_prompt = render_user_analysis_prompt(analysis_instruction)

    # 准备对话消息
    conversation_messages = [
        {"role": "system", "content": content_to_analyze},
        {"role": "user", "content": user_prompt},
    ]

    # 创建AIConversation记录
    ai_conversation = AIConversation(
        user_id=user_id,
        content_item_id=content_item_id,
        title=f"AI分析: {content_item_title or '内容分析'}",
        ai_model_name=model,
        conversation_type="auto_analysis",  # 设置为自动分析类型
        messages=json.dumps(conversation_messages),
        summary=analysis_instruction[:200] + "..."
        if len(analysis_instruction) > 200
        else analysis_instruction,
        meta_info=json.dumps(
            {
                "temperature": temperature,
                "max_tokens": max_tokens,
                "analysis_type": "content_analysis",
                "content_length": len(content_to_analyze),
                "configured_model": model,
                "note": "模型名称为配置值，实际调用可能通过LiteLLM路由到不同后端",
            }
        ),
    )

    # 保存到数据库
    session.add(ai_conversation)
    session.commit()
    session.refresh(ai_conversation)

    return ai_conversation


def update_ai_conversation_response(
    session: Session,
    conversation_id: uuid.UUID,
    ai_response: str,
    status: str = "completed",
    error: str | None = None,
) -> bool:
    """
    更新AIConversation记录，添加AI响应

    Args:
        session: 数据库会话
        conversation_id: 对话ID
        ai_response: AI响应内容
        status: 状态（completed/failed）
        error: 错误信息（如果有）

    Returns:
        bool: 更新是否成功
    """
    import logging

    logger = logging.getLogger(__name__)

    try:
        # 获取对话记录
        conversation = session.get(AIConversation, conversation_id)
        if not conversation:
            logger.error(f"AIConversation not found: {conversation_id}")
            return False

        # 获取现有消息
        try:
            conversation_messages = (
                json.loads(conversation.messages) if conversation.messages else []
            )
        except (json.JSONDecodeError, TypeError):
            logger.warning(
                f"Failed to parse messages for conversation {conversation_id}, using empty list"
            )
            conversation_messages = []

        # 添加AI响应
        conversation_messages.append(
            {
                "role": "assistant",
                "content": ai_response,
                "timestamp": now_utc().isoformat(),
            }
        )

        # 更新记录
        conversation.messages = json.dumps(conversation_messages)

        # 更新元信息
        try:
            meta_info = (
                json.loads(conversation.meta_info) if conversation.meta_info else {}
            )
        except (json.JSONDecodeError, TypeError):
            logger.warning(
                f"Failed to parse meta_info for conversation {conversation_id}, using empty dict"
            )
            meta_info = {}

        meta_info.update(
            {
                "status": status,
                "response_length": len(ai_response),
                "updated_at": now_utc().isoformat(),
            }
        )

        if error:
            meta_info["error"] = error

        conversation.meta_info = json.dumps(meta_info)
        conversation.updated_at = now_utc()

        session.add(conversation)
        session.commit()

        logger.info(
            f"Successfully updated AIConversation {conversation_id} with response length {len(ai_response)}"
        )
        return True

    except Exception as e:
        logger.error(f"Failed to update AIConversation {conversation_id}: {e}")
        session.rollback()
        return False


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
    statement = (
        statement.order_by(AIConversation.created_at.desc()).offset(skip).limit(limit)
    )
    return session.exec(statement).all()
