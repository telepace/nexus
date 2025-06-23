import json
import logging
import re
import uuid
from collections.abc import AsyncGenerator
from datetime import datetime, timezone
from typing import Any, Literal  # Added Optional and Literal

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Body,
    Depends,
    HTTPException,
    Path,  # Added Path
    Query,
    Response,
    status,
)
from fastapi.responses import StreamingResponse
from sqlmodel import Session, select

from app.api.deps import CurrentUser, SessionDep, get_db
from app.core import security  # For password verification
from app.core.config import settings
from app.crud import crud_content as crud  # Alias for clarity
from app.crud.crud_content import (
    create_content_item_sync as crud_create_content_item,
)
from app.crud.crud_content import (
    get_content_chunks,
    get_content_chunks_summary,
)
from app.crud.crud_content import (
    get_content_item_sync as crud_get_content_item,
)
from app.crud.crud_content import (
    get_content_items_sync as crud_get_content_items,
)
from app.crud.crud_favorite import (
    create_favorite,
    delete_favorite,
    get_favorite,
)
from app.models import (
    AIConversation,
    AIResult,  # Added for AIResult storage
    ContentItem,  # For converting ContentItemCreate to ContentItem model for CRUD
    Segment,  # Added for chunks summary endpoint
)
from app.schemas.content import (  # Re-using ContentItemBaseSchema if public is just base + id and audit fields
    AIResultPublic,
    ContentAnalysisRequest,
    ContentItemCreate,
    ContentItemPublic,
    ContentShareCreate,
    ContentSharePublic,
)
from app.schemas.favorite import FavoriteStatusResponse
from app.schemas.llm import CompletionRequest, LLMMessage
from app.utils.background_tasks import background_task_manager
from app.utils.content_processors import ProcessingPipeline
from app.utils.events import content_event_manager, create_sse_generator
# from app.utils.cache import warm_article_cache  # 暂时注释掉避免redis依赖
from app.utils.streaming_processors import (
    StreamChunk,
    StreamingAIProcessor,
    StreamingKeyPointsProcessor,
    StreamingSummaryProcessor,
)
import asyncio

router = APIRouter()
logger = logging.getLogger(__name__)


def _extract_title_from_content(content_text: str | None) -> str:
    """
    Extract title from content text.
    
    Args:
        content_text: The content text to extract title from
        
    Returns:
        str: Extracted title or default title
    """
    if not content_text:
        return "Untitled Content"
    
    # Simple extraction: take first line or first 50 characters
    lines = content_text.strip().split('\n')
    first_line = lines[0].strip() if lines else ""
    
    if first_line:
        # Remove markdown headers if present
        title = first_line.lstrip('#').strip()
        # Limit length
        if len(title) > 50:
            title = title[:47] + "..."
        return title if title else "Untitled Content"
    
    return "Untitled Content"


def create_ai_conversation(
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
    创建AIConversation记录来存储AI分析对话

    Args:
        session: 数据库会话
        user_id: 用户ID
        content_item_id: 内容项ID
        content_item_title: 内容项标题
        analysis_instruction: 分析指令
        content_to_analyze: 要分析的内容
        model: AI模型名称
        temperature: 温度参数
        max_tokens: 最大token数

    Returns:
        AIConversation: 创建的对话记录
    """
    # 准备对话消息
    conversation_messages = [
        {"role": "system", "content": content_to_analyze},
        {"role": "user", "content": analysis_instruction},
    ]

    # 创建AIConversation记录
    ai_conversation = AIConversation(
        user_id=user_id,
        content_item_id=content_item_id,
        title=f"AI分析: {content_item_title or '内容分析'}",
        ai_model_name=model,
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
    ai_conversation: AIConversation,
    ai_response: str,
    status: str = "completed",
    error: str | None = None,
) -> None:
    """
    更新AIConversation记录，添加AI响应
    """
    try:
        # To avoid "Instance <...> is not bound to a Session" error, we must fetch
        # a "live" version of the object from the session we're about to use,
        # instead of trying to merge the detached instance from a closed session.
        live_conversation = session.get(AIConversation, ai_conversation.id)

        if not live_conversation:
            logger.error(f"Failed to find AIConversation {ai_conversation.id} for update.")
            return

        # 获取现有消息
        conversation_messages = json.loads(live_conversation.messages)

        # 添加AI响应
        conversation_messages.append({"role": "assistant", "content": ai_response})

        # 更新记录
        live_conversation.messages = json.dumps(conversation_messages)

        # 更新元信息
        meta_info = json.loads(live_conversation.meta_info)
        meta_info.update({"status": status, "response_length": len(ai_response)})

        if error:
            meta_info["error"] = error

        live_conversation.meta_info = json.dumps(meta_info)

        session.add(live_conversation)
        session.commit()
    except Exception as e:
        logger.error(f"Failed to update AIConversation {ai_conversation.id}: {e}")
        session.rollback()


@router.get(
    "/events",
    summary="Content Events Stream (SSE)",
    description="Server-Sent Events stream for real-time content processing status updates.",
)
async def content_events_endpoint(
    current_user: CurrentUser,
):
    """
    SSE endpoint for real-time content processing updates.
    """
    return StreamingResponse(
        create_sse_generator(str(current_user.id)),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Cache-Control",
        },
    )


@router.post(
    "/create",
    response_model=ContentItemPublic,
    status_code=status.HTTP_201_CREATED,
    summary="Create a New Content Item with Automatic Processing",
    description="Creates a new content item and automatically starts background processing. Returns immediately for seamless user experience.",
)
def create_content_item_endpoint(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    content_in: ContentItemCreate,
) -> ContentItemPublic:
    """
    Create new content item with automatic background processing.
    """
    # Set the user_id from the authenticated user
    content_item_data = content_in.model_dump()
    content_item_data["user_id"] = current_user.id

    # 自动从内容中解析标题（若未提供）
    if not content_in.title or content_in.title.strip() == "":
        content_item_data["title"] = _extract_title_from_content(
            content_in.content_text
        )

    # For text content, set status to completed since no processing needed
    # For URL and other types, set to processing and trigger background task
    if content_in.type == "text":
        content_item_data["processing_status"] = "completed"
    else:
        content_item_data["processing_status"] = "processing"

    # Create a ContentItem model instance
    db_content_item = ContentItem(**content_item_data)

    # The CRUD function will handle adding to session, commit, refresh
    created_item = crud_create_content_item(
        session=session, content_item_in=db_content_item
    )

    # Start background processing for non-text content
    if content_in.type != "text":
        background_task_manager.start_content_processing(
            content_id=str(created_item.id), user_id=str(current_user.id)
        )

    # Convert ContentItem to ContentItemPublic
    public_item = ContentItemPublic(
        id=created_item.id,
        user_id=created_item.user_id,
        type=created_item.type,
        source_uri=created_item.source_uri,
        title=created_item.title,
        content_text=created_item.content_text,
        processing_status=created_item.processing_status,
        created_at=created_item.created_at,
        updated_at=created_item.updated_at,
    )

    # 通知前端新内容已创建
    import asyncio
    import threading

    def send_sse_notification():
        """在新线程中发送SSE通知"""
        try:
            # 创建新的事件循环
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)

            # 运行异步任务
            loop.run_until_complete(
                content_event_manager.notify_content_created(
                    user_id=str(current_user.id), content_item=public_item.model_dump()
                )
            )
        except Exception as e:
            print(f"Failed to send SSE notification: {e}")
        finally:
            loop.close()

    # 在后台线程中发送通知
    threading.Thread(target=send_sse_notification, daemon=True).start()

    return public_item


@router.post(
    "/process/{id}",
    response_model=ContentItemPublic,
    summary="Process Content Item",
    description="Process a content item to convert it to Markdown format using appropriate processor.",
)
async def process_content_item_endpoint(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
    background_tasks: BackgroundTasks,
) -> ContentItemPublic:
    """
    Process content item to convert to Markdown format and perform AI analysis.
    """
    # Get the content item
    item = crud_get_content_item(session=session, id=id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="ContentItem not found"
        )

    # Check if the item belongs to the current user
    if item.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to access this content item",
        )

    # Check if already processed
    if item.processing_status == "completed":
        # Convert to ContentItemPublic and return
        public_item = ContentItemPublic(
            id=item.id,
            user_id=item.user_id,
            type=item.type,
            source_uri=item.source_uri,
            title=item.title,
            content_text=item.content_text,
            processing_status=item.processing_status,
            created_at=item.created_at,
            updated_at=item.updated_at,
        )
        return public_item

    # Use the new processing pipeline
    pipeline = ProcessingPipeline()

    # Process in background with new pipeline
    background_tasks.add_task(process_content_background_async, pipeline, item, session)

    # Update status to processing
    item.processing_status = "processing"
    session.add(item)
    session.commit()
    session.refresh(item)

    # Convert ContentItem to ContentItemPublic
    public_item = ContentItemPublic(
        id=item.id,
        user_id=item.user_id,
        type=item.type,
        source_uri=item.source_uri,
        title=item.title,
        content_text=item.content_text,
        processing_status=item.processing_status,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )

    return public_item


async def process_content_background_async(
    pipeline, content_item: ContentItem, session
):
    """异步后台任务处理内容，支持AI分析"""
    try:
        # 使用新的异步处理管道
        result = await pipeline.process_async(content_item, session)

        if result.success:
            logger.info(
                f"Content processing completed successfully for {content_item.id}"
            )

            # 检查是否有AI分析结果
            if result.metadata:
                ai_results = {}
                for key, value in result.metadata.items():
                    if key.endswith("_result"):
                        ai_results[key] = value

                if ai_results:
                    logger.info(
                        f"AI analysis results available for {content_item.id}: {list(ai_results.keys())}"
                    )
        else:
            logger.error(
                f"Content processing failed for {content_item.id}: {result.error_message}"
            )

    except Exception as e:
        logger.error(f"Background processing failed for {content_item.id}: {str(e)}")
        content_item.processing_status = "failed"
        content_item.error_message = str(e)
        session.add(content_item)
        session.commit()


def process_content_background(processor, content_item: ContentItem, session):
    """Legacy background task to process content (kept for backward compatibility)."""
    try:
        result = processor.process_content(content_item, session)
        if result.success:
            # Store the processed markdown content (sanitize to ensure no invalid bytes)
            from app.utils.content_processors import clean_content_for_db

            content_item.content_text = clean_content_for_db(result.markdown_content)
            if result.metadata:
                content_item.meta_info = result.metadata
                
            # 预热缓存（异步执行，不阻塞主流程）
            if content_item.content_text:
                try:
                    # 暂时注释掉缓存预热以避免redis依赖
                    # asyncio.create_task(
                    #     warm_article_cache(str(content_item.id), content_item.content_text)
                    # )
                    pass
                except Exception as e:
                    # 缓存预热失败不应该影响主流程
                    pass
        session.commit()
    except Exception as e:
        content_item.processing_status = "failed"
        content_item.error_message = str(e)
        session.add(content_item)
        session.commit()


@router.get(
    "/",
    response_model=list[ContentItemPublic],
    summary="List Content Items",
    description="Retrieves a list of content items for the authenticated user, with optional pagination.",
)
def list_content_items_endpoint(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = Query(0, ge=0, description="Number of items to skip for pagination."),
    limit: int = Query(
        100, ge=1, le=200, description="Maximum number of items to return."
    ),
) -> list[ContentItemPublic]:
    """
    Retrieve content items for the current user.
    """
    # Filter by current user's ID for security
    items = crud_get_content_items(
        session=session, skip=skip, limit=limit, user_id=current_user.id
    )

    # Convert ContentItem objects to ContentItemPublic objects with AI results
    public_items = []
    for item in items:
        # 获取AIResult数据（分数、标签等）
        from sqlmodel import select

        ai_result = session.exec(
            select(AIResult).where(AIResult.content_item_id == item.id)
        ).first()

        ai_result_data = None
        if ai_result:
            ai_result_data = AIResultPublic(
                summary=ai_result.summary,
                key_points=ai_result.key_points,
                labels=ai_result.labels,
                content_analysis=ai_result.content_analysis,
                reading_time_minutes=ai_result.reading_time_minutes,
                difficulty_level=ai_result.difficulty_level,
                content_quality_score=ai_result.content_quality_score,
            )
            # 添加调试日志
            print(f"DEBUG: Item {item.id} has AI result:")
            print(f"  - Labels: {ai_result.labels}")
            print(f"  - Quality Score: {ai_result.content_quality_score}")
            print(f"  - Reading Time: {ai_result.reading_time_minutes}")

        public_item = ContentItemPublic(
            id=item.id,
            user_id=item.user_id,
            type=item.type,
            source_uri=item.source_uri,
            title=item.title,
            content_text=item.content_text,
            processing_status=item.processing_status,
            error_message=item.error_message,  # 新增字段
            last_processed_at=item.last_processed_at,  # 新增字段
            created_at=item.created_at,
            updated_at=item.updated_at,
            ai_result=ai_result_data,
        )
        public_items.append(public_item)

    return public_items


@router.get(
    "/{id}",
    response_model=ContentItemPublic,
    summary="Get a Specific Content Item",
    description="Retrieves a single content item by its unique ID. User can only access their own content.",
)
def get_content_item_endpoint(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
) -> ContentItemPublic:
    """
    Get content item by ID.
    """
    item = crud_get_content_item(session=session, id=id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="ContentItem not found"
        )

    # Check if the item belongs to the current user
    if item.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to access this content item",
        )

    # 获取AIResult数据（分数、标签等）
    from sqlmodel import select

    ai_result = session.exec(
        select(AIResult).where(AIResult.content_item_id == item.id)
    ).first()

    ai_result_data = None
    if ai_result:
        ai_result_data = AIResultPublic(
            summary=ai_result.summary,
            key_points=ai_result.key_points,
            labels=ai_result.labels,
            content_analysis=ai_result.content_analysis,
            reading_time_minutes=ai_result.reading_time_minutes,
            difficulty_level=ai_result.difficulty_level,
            content_quality_score=ai_result.content_quality_score,
        )

    # Convert ContentItem to ContentItemPublic
    public_item = ContentItemPublic(
        id=item.id,
        user_id=item.user_id,
        type=item.type,
        source_uri=item.source_uri,
        title=item.title,
        content_text=item.content_text,
        processing_status=item.processing_status,
        error_message=item.error_message,  # 新增字段
        last_processed_at=item.last_processed_at,  # 新增字段
        created_at=item.created_at,
        updated_at=item.updated_at,
        ai_result=ai_result_data,
    )

    return public_item


@router.get(
    "/{id}/chunks",
    summary="Get Content Chunks",
    description="Retrieves content chunks for efficient rendering with pagination support.",
)
def get_content_chunks_endpoint(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID = Path(..., description="Content item ID"),
    page: int = Query(1, ge=1, description="Page number (1-based)"),
    size: int = Query(10, ge=1, le=50, description="Number of chunks per page"),
) -> dict[str, Any]:
    """Get content chunks with pagination."""
    
    # 验证内容项存在且属于当前用户
    content_item = crud_get_content_item(session=session, id=id)
    if not content_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Content item not found"
        )

    if content_item.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to access this content item"
        )
    
    try:
        # 获取分块数据
        chunks, total_count = get_content_chunks(
            session=session,
            content_item_id=id,
            page=page,
            size=size
        )

        # 转换为返回格式
        chunk_data = []
        max_index = 0
        total_words = 0
        total_chars = 0
        
        for chunk in chunks:
            chunk_data.append({
                "id": str(chunk.id),
                "index": chunk.segment_index,  # 前端期望的是 index 不是 segment_index
                "content": chunk.content,
                "type": chunk.segment_type,    # 前端期望的是 type 不是 segment_type
                "word_count": chunk.word_count,
                "char_count": chunk.char_count,
                "meta_info": {},               # 默认空对象
                "created_at": chunk.created_at.isoformat(),
            })
            max_index = max(max_index, chunk.segment_index)
            total_words += chunk.word_count or 0
            total_chars += chunk.char_count or 0
        
        return {
            "content_id": str(id),  # 前端期望的是 content_id
            "chunks": chunk_data,
        "pagination": {
            "page": page,
            "size": size,
                "total_chunks": total_count,  # 前端期望的是 total_chunks
                "total_pages": (total_count + size - 1) // size,
                "has_next": page * size < total_count,  # 添加前端期望的字段
                "has_prev": page > 1,
            },
            "summary": {  # 添加前端期望的 summary 字段
            "total_chunks": total_count,
                "total_words": total_words,
                "total_chars": total_chars,
                "max_index": max_index,
        },
            "content_info": {  # 添加前端期望的 content_info 字段
                "title": content_item.title or "",
                "processing_status": content_item.processing_status,
                "created_at": content_item.created_at.isoformat(),
                "updated_at": content_item.updated_at.isoformat(),
        },
    }
        
    except Exception as e:
        logger.error(f"Failed to get content chunks for {id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve content chunks"
        )


@router.get(
    "/{id}/chunks/summary",
    summary="Get Content Chunks Summary",
    description="Get summary information about content chunks without the actual content.",
)
def get_content_chunks_summary_endpoint(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID = Path(..., description="Content item ID"),
) -> dict[str, Any]:
    """Get content chunks summary."""
    
    # 验证内容项存在且属于当前用户
    content_item = crud_get_content_item(session=session, id=id)
    if not content_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Content item not found"
        )

    if content_item.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to access this content item"
        )

    try:
        # 获取分块摘要
        summary_data = get_content_chunks_summary(session=session, content_item_id=id)

        # 获取最大索引（需要额外查询）
        from sqlmodel import select, func
        max_index_result = session.exec(
            select(func.max(Segment.segment_index)).where(
                Segment.content_item_id == id
            )
        ).scalar()
        max_index = max_index_result or 0
        
        # 转换为前端期望的格式
        return {
            "content_id": str(id),  # 前端期望的是 content_id
            "summary": {
                "total_chunks": summary_data["total_chunks"],
                "total_words": summary_data["total_word_count"],  # 映射字段名
                "total_chars": summary_data["total_char_count"],  # 映射字段名
                "max_index": max_index,
            },
            "content_info": {  # 添加前端期望的 content_info 字段
                "title": content_item.title or "",
                "processing_status": content_item.processing_status,
                "created_at": content_item.created_at.isoformat(),
                "updated_at": content_item.updated_at.isoformat(),
            },
        }
        
    except Exception as e:
        logger.error(f"Failed to get content chunks summary for {id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve content chunks summary"
        )


@router.post(
    "/{id}/analyze-stream",
    summary="Stream Content Analysis",
    description="Perform streaming AI analysis of content using specified instruction.",
)
async def analyze_content_stream_endpoint(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID = Path(..., description="Content item ID"),
    request: ContentAnalysisRequest,
) -> StreamingResponse:
    """
    Perform streaming AI analysis of content.
    
    Returns a streaming response compatible with Vercel AI SDK Data Stream Protocol.
    """
    
    # 验证内容项存在且属于当前用户
    content_item = crud_get_content_item(session=session, id=id)
    if not content_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Content item not found"
        )
    
    if content_item.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to access this content item"
        )
    
    if not content_item.content_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Content item has no text content to analyze"
        )
                            
    # 统一使用内置默认模型，忽略前端传入的 model
    DEFAULT_MODEL = "or-gemini-2.5-flash-preview-05-20"
    resolved_model = DEFAULT_MODEL

    # 创建AIConversation记录
    ai_conversation = create_ai_conversation(
        session=session,
        user_id=current_user.id,
        content_item_id=content_item.id,
        content_item_title=content_item.title or "Untitled",
        analysis_instruction=request.analysis_instruction,
        content_to_analyze=content_item.content_text,
        model=resolved_model,
        temperature=request.temperature,
        max_tokens=request.max_tokens,
    )
    
    # 返回流式响应
    return StreamingResponse(
        _stream_content_analysis(
            content_item.id,  # 传递 ID 而不是对象
            content_item.content_text,  # 传递内容文本
            request,
            ai_conversation.id,  # 传递 conversation ID 而不是对象  
            resolved_model,
        ),
        media_type="text/plain",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Cache-Control",
            "X-Vercel-AI-Data-Stream": "v1",  # Vercel AI SDK 要求的头部
        },
    )


async def _stream_content_analysis(
    content_item_id: uuid.UUID,  # 使用 ID 而不是对象
    content_text: str,  # 直接传递内容文本
    request: ContentAnalysisRequest,
    ai_conversation_id: uuid.UUID,  # 使用 ID 而不是对象  
    resolved_model: str | None = None,
) -> AsyncGenerator[str, None]:
    """
    生成内容分析的流式响应，兼容 Vercel AI SDK Data Stream Protocol
    """
    try:
        import aiohttp
        from app.api.deps import get_db
        
        # 准备系统消息和用户消息
        messages = [
            {
                "role": "system", 
                "content": f"你是一个专业的内容分析助手。请根据用户的要求分析以下内容：\n\n{content_text}"
            },
            {
                "role": "user",
                "content": request.analysis_instruction
            }
        ]

        # LiteLLM 代理配置
        litellm_url = f"{settings.LITELLM_PROXY_URL}/v1/chat/completions"
        headers = {"Content-Type": "application/json"}

        if settings.LITELLM_MASTER_KEY:
            headers["Authorization"] = f"Bearer {settings.LITELLM_MASTER_KEY}"

        payload = {
            "model": resolved_model or request.model,
            "messages": messages,
            "stream": True,
            "temperature": request.temperature,
            "max_tokens": request.max_tokens,
        }

        timeout = aiohttp.ClientTimeout(total=120.0)  # 更长的超时时间用于分析
        accumulated_content = ""

        async with aiohttp.ClientSession(timeout=timeout) as session_client:
            async with session_client.post(
                litellm_url, json=payload, headers=headers
            ) as response:
                if response.status != 200:
                    error_msg = f"LiteLLM error: HTTP {response.status}"
                    try:
                        error_text = await response.text()
                        error_msg += f" - {error_text}"
                    except:
                        pass
                    yield f'9:[{{"error":"{error_msg}"}}]\n'
                    return

                # 处理流式响应
                async for chunk_bytes in response.content.iter_chunked(1024):
                    if not chunk_bytes:
                        continue

                    chunk_str = chunk_bytes.decode("utf-8", errors="ignore")
                    lines = chunk_str.split("\n")

                    for line in lines:
                        if line.startswith("data: "):
                            data = line[6:].strip()

                            if data == "[DONE]":
                                # 在新的数据库会话中保存完整的AI响应
                                if accumulated_content:
                                    try:
                                        with next(get_db()) as new_session:
                                            # 重新获取 AIConversation 对象
                                            ai_conversation = new_session.get(AIConversation, ai_conversation_id)
                                            if ai_conversation:
                                                update_ai_conversation_response(
                                                    new_session, ai_conversation, accumulated_content
                                                )
                                    except Exception as e:
                                        logger.error(f"Failed to save AI response: {e}")

                                # 发送完成信号
                                yield '8:[{"finishReason":"stop"}]\n'
                                return

                            try:
                                parsed = json.loads(data)

                                # 检查错误
                                if "error" in parsed:
                                    error_msg = parsed.get("message", "Unknown error")

                                    # 在新的数据库会话中保存错误
                                    try:
                                        with next(get_db()) as new_session:
                                            ai_conversation = new_session.get(AIConversation, ai_conversation_id)
                                            if ai_conversation:
                                                update_ai_conversation_response(
                                                    new_session, ai_conversation, accumulated_content, "failed", error_msg
                                                )
                                    except Exception as e:
                                        logger.error(f"Failed to save error: {e}")
                                    
                                    yield f'9:[{{"error":"{error_msg}"}}]\n'
                                    return

                                # 提取内容
                                if (
                                    parsed.get("choices")
                                    and len(parsed["choices"]) > 0
                                    and "delta" in parsed["choices"][0]
                                    and "content" in parsed["choices"][0]["delta"]
                                ):
                                    content = parsed["choices"][0]["delta"]["content"]
                                    if content:
                                        accumulated_content += content
                                        
                                        # 发送文本块 (类型 0)
                                        # 需要正确转义JSON内容
                                        escaped_content = json.dumps(content)
                                        yield f'0:{escaped_content}\n'

                            except json.JSONDecodeError:
                                # 忽略非JSON数据
                                continue

        # 确保保存最终内容和发送完成信号
        if accumulated_content:
            try:
                with next(get_db()) as new_session:
                    ai_conversation = new_session.get(AIConversation, ai_conversation_id)
                    if ai_conversation:
                        update_ai_conversation_response(
                            new_session, ai_conversation, accumulated_content
                        )
            except Exception as e:
                logger.error(f"Failed to save final response: {e}")
            yield '8:[{"finishReason":"stop"}]\n'
    
    except Exception as e:
        # 在新的数据库会话中保存错误
        try:
            with next(get_db()) as new_session:
                ai_conversation = new_session.get(AIConversation, ai_conversation_id)
                if ai_conversation:
                    update_ai_conversation_response(
                        new_session, ai_conversation, "", "failed", str(e)
                    )
        except Exception as save_error:
            logger.error(f"Failed to save stream error: {save_error}")
        
        # 发送错误信息
        error_msg = str(e).replace('"', '\\"')
        yield f'9:[{{"error":"Stream error: {error_msg}"}}]\n'


@router.get(
    "/{id}/markdown",
    summary="Get Content Markdown",
    description="Get the processed markdown content of a content item.",
)
def get_content_markdown_endpoint(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID = Path(..., description="Content item ID"),
) -> dict[str, Any]:
    """
    Get content item's markdown representation.
    """
    
    # 验证内容项存在且属于当前用户
    content_item = crud_get_content_item(session=session, id=id)
    if not content_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Content item not found"
        )

    if content_item.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to access this content item"
        )

    # 返回markdown内容
    return {
        "id": str(content_item.id),
        "markdown_content": content_item.content_text or "",
        "title": content_item.title or "Untitled",
        "processing_status": content_item.processing_status,
        "created_at": content_item.created_at.isoformat(),
        "updated_at": content_item.updated_at.isoformat(),
    }

# ================================
# Content Conversations Routes
# ================================

def convert_conversation_to_public(conversation: AIConversation) -> dict:
    """Convert AIConversation model to public schema."""
    try:
        messages_data = json.loads(conversation.messages) if conversation.messages else []
        messages = [
            {
                "role": msg.get("role", "user"),
                "content": msg.get("content", ""),
                "timestamp": msg.get("timestamp"),
                "metadata": msg.get("metadata"),
            }
            for msg in messages_data
        ]
    except (json.JSONDecodeError, ValueError) as e:
        logger.error(f"Failed to parse messages for conversation {conversation.id}: {e}")
        messages = []

    return {
        "id": str(conversation.id),
        "user_id": str(conversation.user_id),
        "content_item_id": str(conversation.content_item_id) if conversation.content_item_id else None,
        "title": conversation.title,
        "conversation_type": conversation.conversation_type,
        "ai_model_name": conversation.ai_model_name,
        "messages": messages,
        "summary": conversation.summary,
        "is_active": conversation.is_active,
        "created_at": conversation.created_at.isoformat(),
        "updated_at": conversation.updated_at.isoformat(),
    }


@router.get(
    "/{content_id}/conversations",
    summary="Get All Conversations for Content",
    description="获取指定内容的所有AI对话，包括自动分析和用户对话。",
)
def get_content_conversations(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    content_id: uuid.UUID,
    include_inactive: bool = Query(False, description="是否包含非激活状态的对话"),
) -> dict[str, Any]:
    """获取内容的所有AI对话。"""
    
    # 验证内容项存在且属于当前用户
    content_item = session.exec(
        select(ContentItem).where(
            ContentItem.id == content_id,
            ContentItem.user_id == current_user.id
        )
    ).first()
    
    if not content_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Content item not found"
        )
    
    # 查询对话
    query = select(AIConversation).where(
        AIConversation.content_item_id == content_id,
        AIConversation.user_id == current_user.id
    )
    
    if not include_inactive:
        query = query.where(AIConversation.is_active == True)
    
    conversations = session.exec(query.order_by(AIConversation.created_at)).all()
    
    # 转换为public schema
    public_conversations = [convert_conversation_to_public(conv) for conv in conversations]
    
    # 检查是否有自动分析对话
    has_auto_analysis = any(
        conv.conversation_type == "auto_analysis" for conv in conversations
    )
    
    return {
        "conversations": public_conversations,
        "total": len(public_conversations),
        "has_auto_analysis": has_auto_analysis,
    }


@router.post(
    "/{content_id}/conversations",
    status_code=status.HTTP_201_CREATED,
    summary="Create New Conversation",
    description="为指定内容创建新的AI对话。",
)
def create_conversation(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    content_id: uuid.UUID,
    conversation_data: dict = Body(...),
) -> dict[str, Any]:
    """创建新的AI对话。"""
    
    # 验证内容项存在且属于当前用户
    content_item = session.exec(
        select(ContentItem).where(
            ContentItem.id == content_id,
            ContentItem.user_id == current_user.id
        )
    ).first()
    
    if not content_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Content item not found"
        )
    
    # 创建对话
    conversation = AIConversation(
        user_id=current_user.id,
        content_item_id=content_id,
        title=conversation_data.get("title") or f"与《{content_item.title or '内容'}》的对话",
        conversation_type=conversation_data.get("conversation_type", "user_chat"),
        ai_model_name=conversation_data.get("ai_model_name", "gpt-3.5-turbo"),
        messages="[]",
        summary=None,
        is_active=True,
    )
    
    # 如果有初始消息，添加到对话中
    if conversation_data.get("initial_message"):
        from app.utils.timezone import now_utc
        messages = [{
            "role": "user",
            "content": conversation_data["initial_message"],
            "timestamp": now_utc().isoformat(),
            "metadata": {"initial_message": True}
        }]
        conversation.messages = json.dumps(messages)
    
    session.add(conversation)
    session.commit()
    session.refresh(conversation)
    
    return convert_conversation_to_public(conversation)
