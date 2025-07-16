import json
import logging
import uuid
from datetime import datetime
from typing import Any

from fastapi import APIRouter, HTTPException, Query, status
from sqlmodel import select

from app.api.deps import CurrentUser, SessionDep
from app.core.config import settings
from app.models import AIConversation, ContentItem
from app.schemas.conversation import (
    ANALYSIS_PROMPTS,
    AddMessageRequest,
    AIConversationCreate,
    AIConversationPublic,
    AIMessageSchema,
    AnalysisPromptRequest,
    ConversationListResponse,
)
from app.services.ai.llm_service import LLMService
from app.services.ai.chat_service import ChatService
from app.utils.timezone import now_utc

router = APIRouter()
logger = logging.getLogger(__name__)


def convert_conversation_to_public(
    conversation: AIConversation,
) -> AIConversationPublic:
    """Convert AIConversation model to public schema."""
    try:
        messages_data = (
            json.loads(conversation.messages) if conversation.messages else []
        )
        messages = [
            AIMessageSchema(
                role=msg.get("role", "user"),
                content=msg.get("content", ""),
                timestamp=datetime.fromisoformat(msg["timestamp"])
                if msg.get("timestamp")
                else None,
                metadata=msg.get("metadata"),
            )
            for msg in messages_data
        ]
    except (json.JSONDecodeError, ValueError) as e:
        logger.error(
            f"Failed to parse messages for conversation {conversation.id}: {e}"
        )
        messages = []

    return AIConversationPublic(
        id=conversation.id,
        user_id=conversation.user_id,
        content_item_id=conversation.content_item_id,
        title=conversation.title,
        conversation_type=conversation.conversation_type,
        ai_model_name=conversation.ai_model_name,
        messages=messages,
        summary=conversation.summary,
        is_active=conversation.is_active,
        created_at=conversation.created_at,
        updated_at=conversation.updated_at,
    )


@router.get(
    "/content/{content_id}/conversations",
    response_model=ConversationListResponse,
    summary="Get All Conversations for Content",
    description="获取指定内容的所有AI对话，包括自动分析和用户对话。",
)
def get_content_conversations(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    content_id: uuid.UUID,
    include_inactive: bool = Query(False, description="是否包含非激活状态的对话"),
) -> ConversationListResponse:
    """获取内容的所有AI对话。"""

    # 验证内容项存在且属于当前用户
    content_item = session.exec(
        select(ContentItem).where(
            ContentItem.id == content_id, ContentItem.user_id == current_user.id
        )
    ).first()

    if not content_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Content item not found"
        )

    # 查询对话
    query = select(AIConversation).where(
        AIConversation.content_item_id == content_id,
        AIConversation.user_id == current_user.id,
    )

    if not include_inactive:
        query = query.where(AIConversation.is_active)

    conversations = session.exec(query.order_by(AIConversation.created_at)).all()

    # 转换为public schema
    public_conversations = [
        convert_conversation_to_public(conv) for conv in conversations
    ]

    # 检查是否有自动分析对话
    has_auto_analysis = any(
        conv.conversation_type == "auto_analysis" for conv in conversations
    )

    return ConversationListResponse(
        conversations=public_conversations,
        total=len(public_conversations),
        has_auto_analysis=has_auto_analysis,
    )


@router.post(
    "/content/{content_id}/conversations",
    response_model=AIConversationPublic,
    status_code=status.HTTP_201_CREATED,
    summary="Create New Conversation",
    description="为指定内容创建新的AI对话。",
)
def create_conversation(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    content_id: uuid.UUID,
    conversation_in: AIConversationCreate,
) -> AIConversationPublic:
    """创建新的AI对话。"""

    # 验证内容项存在且属于当前用户
    content_item = session.exec(
        select(ContentItem).where(
            ContentItem.id == content_id, ContentItem.user_id == current_user.id
        )
    ).first()

    if not content_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Content item not found"
        )

    # 创建对话
    conversation = AIConversation(
        user_id=current_user.id,
        content_item_id=content_id,
        title=conversation_in.title or f"与《{content_item.title or '内容'}》的对话",
        conversation_type=conversation_in.conversation_type,
        ai_model_name=conversation_in.ai_model_name,
        messages="[]",
        summary=None,
        is_active=True,
    )

    # 如果有初始消息，添加到对话中
    if conversation_in.initial_message:
        messages = [
            {
                "role": "user",
                "content": conversation_in.initial_message,
                "timestamp": now_utc().isoformat(),
                "message_metadata": {"initial_message": True},
            }
        ]
        conversation.messages = json.dumps(messages)

    session.add(conversation)
    session.commit()

    # 重新获取conversation以确保session绑定，避免refresh错误
    refreshed_conversation = session.get(AIConversation, conversation.id)
    if refreshed_conversation:
        conversation = refreshed_conversation

    return convert_conversation_to_public(conversation)


@router.post(
    "/conversations/{conversation_id}/messages",
    response_model=AIConversationPublic,
    summary="Add Message to Conversation",
    description="向指定对话添加新消息并获取AI响应。",
)
async def add_message_to_conversation(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    conversation_id: uuid.UUID,
    message_request: AddMessageRequest,
) -> AIConversationPublic:
    """向对话添加消息并获取AI响应。"""

    # 获取对话
    conversation = session.exec(
        select(AIConversation).where(
            AIConversation.id == conversation_id,
            AIConversation.user_id == current_user.id,
            AIConversation.is_active,
        )
    ).first()

    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found"
        )

    # 获取内容项以提供上下文
    content_item = None
    if conversation.content_item_id:
        content_item = session.exec(
            select(ContentItem).where(ContentItem.id == conversation.content_item_id)
        ).first()

    try:
        # 解析现有消息
        messages = json.loads(conversation.messages) if conversation.messages else []

        # 添加用户消息
        user_message = {
            "role": message_request.role,
            "content": message_request.content,
            "timestamp": now_utc().isoformat(),
            "message_metadata": {},
        }
        messages.append(user_message)

        # 准备AI服务调用
        llm_service = LLMService()

        # 构建消息上下文，包含内容文本（如果有）
        context_messages = []

        if content_item and content_item.content_text:
            context_messages.append(
                {
                    "role": "system",
                    "content": f"以下是用户正在讨论的内容：\n\n{content_item.content_text[:4000]}...",  # 限制长度
                }
            )

        # 添加对话历史（最近几条消息）
        recent_messages = messages[-10:]  # 最近10条消息
        for msg in recent_messages:
            context_messages.append({"role": msg["role"], "content": msg["content"]})

        # 调用AI服务
        response = await llm_service.chat_completion(
            messages=context_messages,
            model=conversation.ai_model_name,
            temperature=0.7,
            max_tokens=8000,
        )

        ai_response_content = response.choices[0].message.content

        # 添加AI响应
        ai_message = {
            "role": "assistant",
            "content": ai_response_content,
            "timestamp": now_utc().isoformat(),
            "message_metadata": {
                "configured_model": conversation.ai_model_name,  # 记录配置的模型名称
                "tokens_used": response.usage.total_tokens if response.usage else 0,
                "note": "configured_model为配置值，实际调用可能路由到不同后端"
            },
        }
        messages.append(ai_message)

        # 更新对话
        conversation.messages = json.dumps(messages)
        conversation.updated_at = now_utc()

        # 更新对话摘要（如果是新对话）
        if len(messages) <= 4 and not conversation.summary:
            conversation.summary = (
                message_request.content[:100] + "..."
                if len(message_request.content) > 100
                else message_request.content
            )

        session.add(conversation)
        session.commit()

        # 重新获取conversation以确保session绑定，避免refresh错误
        refreshed_conversation = session.get(AIConversation, conversation.id)
        if refreshed_conversation:
            conversation = refreshed_conversation

        return convert_conversation_to_public(conversation)

    except Exception as e:
        logger.error(f"Failed to add message to conversation {conversation_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process message",
        )


@router.post(
    "/content/{content_id}/analysis",
    response_model=AIConversationPublic,
    summary="Trigger Analysis with Predefined Prompt",
    description="使用预设模板对内容进行AI分析。",
)
async def trigger_analysis(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    content_id: uuid.UUID,
    analysis_request: AnalysisPromptRequest,
) -> AIConversationPublic:
    """使用预设Prompt触发内容分析。"""

    # 验证内容项存在且属于当前用户
    content_item = session.exec(
        select(ContentItem).where(
            ContentItem.id == content_id, ContentItem.user_id == current_user.id
        )
    ).first()

    if not content_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Content item not found"
        )

    if not content_item.content_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Content has no text to analyze",
        )

    # 验证prompt类型
    if analysis_request.prompt_type not in ANALYSIS_PROMPTS:
        available_types = ", ".join(ANALYSIS_PROMPTS.keys())
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid prompt type. Available types: {available_types}",
        )

    prompt_config = ANALYSIS_PROMPTS[analysis_request.prompt_type]

    try:
        # 检查是否已有相同类型的分析对话
        existing_conversation = session.exec(
            select(AIConversation).where(
                AIConversation.content_item_id == content_id,
                AIConversation.user_id == current_user.id,
                AIConversation.conversation_type == "prompt_analysis",
                AIConversation.title == prompt_config["title"],
                AIConversation.is_active,
            )
        ).first()

        if existing_conversation:
            # 返回现有对话
            return convert_conversation_to_public(existing_conversation)

        # 创建新的分析对话
        chat_service = ChatService()
        conversation = AIConversation(
            user_id=current_user.id,
            content_item_id=content_id,
            title=prompt_config["title"],
            conversation_type="prompt_analysis",
            ai_model_name=chat_service.get_model_for_template("user_analysis.j2"),  # 使用正确的分析模型
            messages="[]",
            summary=f"对《{content_item.title or '内容'}》进行{prompt_config['title']}",
            is_active=True,
        )

        session.add(conversation)
        session.commit()

        # 重新获取conversation以确保session绑定，避免refresh错误
        refreshed_conversation = session.get(AIConversation, conversation.id)
        if refreshed_conversation:
            conversation = refreshed_conversation

        # 构建分析消息
        system_message = {
            "role": "system",
            "content": prompt_config["system_message"],
            "timestamp": now_utc().isoformat(),
            "message_metadata": {"prompt_type": analysis_request.prompt_type},
        }

        # 构建用户消息，包含内容和指令
        user_content = (
            f"内容：\n{content_item.content_text}\n\n指令：{prompt_config['prompt']}"
        )
        if analysis_request.custom_instruction:
            user_content += f"\n\n补充要求：{analysis_request.custom_instruction}"

        user_message = {
            "role": "user",
            "content": user_content,
            "timestamp": now_utc().isoformat(),
            "message_metadata": {
                "prompt_type": analysis_request.prompt_type,
                "auto_generated": True,
            },
        }

        messages = [system_message, user_message]

        # 调用AI服务
        llm_service = LLMService()
        response = await llm_service.chat_completion(
            messages=[
                {"role": str(msg["role"]), "content": str(msg["content"])}
                for msg in messages
            ],
            model=settings.DEFAULT_LLM_MODEL,
            temperature=0.3,  # 分析类任务使用较低温度
            max_tokens=8000,
        )

        ai_response_content = response.choices[0].message.content

        # 添加AI响应
        ai_message = {
            "role": "assistant",
            "content": ai_response_content,
            "timestamp": now_utc().isoformat(),
            "message_metadata": {
                "configured_model": settings.DEFAULT_LLM_MODEL,  # 记录配置的模型名称
                "prompt_type": analysis_request.prompt_type,
                "tokens_used": response.usage.total_tokens if response.usage else 0,
                "note": "configured_model为配置值，实际调用可能路由到不同后端"
            },
        }

        messages.append(ai_message)

        # 更新对话
        conversation.messages = json.dumps(messages)
        conversation.updated_at = now_utc()

        session.add(conversation)
        session.commit()

        # 重新获取conversation以确保session绑定，避免refresh错误
        final_conversation = session.get(AIConversation, conversation.id)
        if final_conversation:
            conversation = final_conversation

        return convert_conversation_to_public(conversation)

    except Exception as e:
        logger.error(f"Failed to trigger analysis for content {content_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to perform analysis",
        )


@router.delete(
    "/conversations/{conversation_id}",
    summary="Deactivate Conversation",
    description="停用指定的对话（软删除）。",
)
def deactivate_conversation(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    conversation_id: uuid.UUID,
) -> dict[str, str]:
    """停用对话。"""

    conversation = session.exec(
        select(AIConversation).where(
            AIConversation.id == conversation_id,
            AIConversation.user_id == current_user.id,
        )
    ).first()

    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found"
        )

    conversation.is_active = False
    conversation.updated_at = now_utc()

    session.add(conversation)
    session.commit()

    return {"message": "Conversation deactivated successfully"}


@router.get(
    "/analysis-prompts",
    summary="Get Available Analysis Prompts",
    description="获取所有可用的预设分析Prompt模板。",
)
def get_analysis_prompts() -> dict[str, Any]:
    """获取预设分析Prompt模板。"""

    return {
        "prompts": {
            key: {
                "title": config["title"],
                "description": config["prompt"][:100] + "..."
                if len(config["prompt"]) > 100
                else config["prompt"],
            }
            for key, config in ANALYSIS_PROMPTS.items()
        }
    }
