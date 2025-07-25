import asyncio
import json
import logging
import uuid
from collections.abc import AsyncGenerator
from datetime import datetime, timezone
from typing import Any  # Added Optional and Literal
from typing import Annotated

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Body,
    HTTPException,
    Path,  # Added Path
    Query,
    status,
    Depends,
)
from fastapi.responses import StreamingResponse
from sqlmodel import Session, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import and_, or_, desc, func
from typing import List, Optional

from app.api.deps import CurrentUser, SessionDep
from app.core.config import settings
from app.core.db_factory import engine  # 修复导入路径：从db_factory导入engine
from app.core.security import verify_password
from app.crud.crud_content import (
    create_content_item_sync,
    create_content_share,
    deactivate_content_share,
    delete_content_item_sync,
    get_all_content_chunks,
    get_content_chunks,
    get_content_chunks_summary,
    get_content_items_sync,
    get_content_share_by_token,
    get_content_shares_by_content_id,
    increment_access_count,
)
from app.crud.crud_content import (
    get_content_item_sync as crud_get_content_item,
)
# 🎯 导入统一的AI对话CRUD操作
from app.crud.crud_ai_conversation import (
    create_ai_conversation_for_analysis,
    update_ai_conversation_response,
)
from app.models import (
    AIConversation,
    AIResult,  # Added for AIResult storage
    ContentItem,  # For converting ContentItemCreate to ContentItem model for CRUD
    Segment,  # Added for chunks summary endpoint
    ContentSegment,  # 新增
)
from app.models.segments import ContentSegment  # 新增
from app.models.content import (
    ContentItem,
)
from app.schemas.content import (  # Re-using ContentItemBaseSchema if public is just base + id and audit fields
    AIResultPublic,
    ContentAnalysisRequest,
    ContentItemCreate,
    ContentItemPublic,
    ContentShareCreate,
    ContentSharePublic,
    ContentItemUpdate, 
    ContentSegmentOut,
    ContentSegmentBulkResponse,  # 新增
)
from app.services.ai.chat_service import ChatService
from app.utils.background_tasks import background_task_manager
from app.utils.content_processors import ProcessingPipeline
from app.utils.events import content_event_manager, create_sse_generator
from app.utils.prompt_helpers import render_user_analysis_prompt
from app.utils.realtime_jsonl_processor import create_realtime_jsonl_processor
from app.utils.streaming_jsonl_extractor import create_streaming_jsonl_extractor
from app.api.deps import get_current_user, get_db, get_async_db

# from app.utils.cache import warm_article_cache  # 暂时注释掉避免redis依赖

from app.utils.token_manager import get_token_limit, get_recommended_settings, validate_token_request

router = APIRouter()
logger = logging.getLogger(__name__)

# 添加异步数据库依赖类型
AsyncSessionDep = Annotated[AsyncSession, Depends(get_async_db)]


def _extract_title_from_content(content_text: str | None) -> str:
    """
    Extract title from content text.

    Args:
        content_text: The content text to extract title from

    Returns:
        str: Extracted title or default title
    """
    if not content_text:
        return "新内容"

    # Simple extraction: take first line or first 50 characters
    lines = content_text.strip().split("\n")
    first_line = lines[0].strip() if lines else ""

    if first_line:
        # Remove markdown headers if present
        title = first_line.lstrip("#").strip()
        # Limit length
        if len(title) > 50:
            title = title[:47] + "..."
        return title if title else "新内容"

    return "新内容"


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

    # 所有类型的内容都需要经过后台处理以获得LLM分析
    # 包括文本内容的AI分析、摘要生成、关键要点提取等
    content_item_data["processing_status"] = "processing"

    # Create a ContentItem model instance
    db_content_item = ContentItem(**content_item_data)

    # The CRUD function will handle adding to session, commit, refresh
    created_item = create_content_item_sync(
        session=session, content_item_in=db_content_item, user_id=current_user.id
    )

    # 启动后台处理，包括文本内容的LLM分析
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
    background_tasks.add_task(process_content_background_async, pipeline, id, session)

    # Update status to processing
    item.processing_status = "processing"
    session.add(item)
    session.commit()

    # 重新获取item以确保session绑定，避免refresh错误
    refreshed_item = session.get(ContentItem, item.id)
    if refreshed_item:
        item = refreshed_item

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
    pipeline, content_item_id: uuid.UUID, _session_config
):
    """异步后台任务处理内容，支持AI分析"""
    # 创建新的session以避免绑定问题
    from sqlmodel import Session

    from app.core.db_factory import engine

    try:
        with Session(engine) as session:
            # 重新查询ContentItem对象以确保正确绑定到session
            content_item = session.get(ContentItem, content_item_id)
            if not content_item:
                logger.error(f"ContentItem not found: {content_item_id}")
                return

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
        logger.error(f"Background processing failed for {content_item_id}: {str(e)}")
        # 在新的session中更新错误状态
        try:
            with Session(engine) as session:
                content_item = session.get(ContentItem, content_item_id)
                if content_item:
                    content_item.processing_status = "failed"
                    content_item.error_message = str(e)
                    session.add(content_item)
                    session.commit()
        except Exception as update_err:
            logger.error(f"Failed to update error status: {update_err}")


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
                except Exception:
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
    items = get_content_items_sync(
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
                optimized_title=ai_result.optimized_title,
                brief_description=ai_result.brief_description,
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
            optimized_title=ai_result.optimized_title,
            brief_description=ai_result.brief_description,
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
    all: bool = Query(False, description="Get all chunks at once, ignoring pagination"),
) -> dict[str, Any]:
    """Get content chunks with pagination or all at once."""

    # 验证内容项存在且属于当前用户
    content_item = crud_get_content_item(session=session, id=id)
    if not content_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Content item not found"
        )

    if content_item.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to access this content item",
        )

    try:
        if all:
            # 获取所有分块数据，忽略分页参数
            chunks, total_count = get_all_content_chunks(
                session=session, content_item_id=id
            )
            # 设置分页信息表示已获取全部
            pagination_info = {
                "page": 1,
                "size": total_count,
                "total_chunks": total_count,
                "total_pages": 1,
                "has_next": False,
                "has_prev": False,
            }
        else:
            # 使用原有的分页逻辑
            chunks, total_count = get_content_chunks(
                session=session, content_item_id=id, page=page, size=size
            )
            pagination_info = {
                "page": page,
                "size": size,
                "total_chunks": total_count,
                "total_pages": (total_count + size - 1) // size,
                "has_next": page * size < total_count,
                "has_prev": page > 1,
            }

        # 转换为返回格式
        chunk_data = []
        max_index = 0
        total_words = 0
        total_chars = 0

        for chunk in chunks:
            chunk_data.append(
                {
                    "id": str(chunk.id),
                    "index": chunk.segment_index,  # 前端期望的是 index 不是 segment_index
                    "content": chunk.content,
                    "type": chunk.segment_type,  # 前端期望的是 type 不是 segment_type
                    "word_count": chunk.word_count,
                    "char_count": chunk.char_count,
                    "meta_info": {},  # 默认空对象
                    "created_at": chunk.created_at.isoformat(),
                }
            )
            max_index = max(max_index, chunk.segment_index)
            total_words += chunk.word_count or 0
            total_chars += chunk.char_count or 0

        return {
            "content_id": str(id),  # 前端期望的是 content_id
            "chunks": chunk_data,
            "pagination": pagination_info,
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
            detail="Failed to retrieve content chunks",
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
            status_code=status.HTTP_404_NOT_FOUND, detail="Content item not found"
        )

    if content_item.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to access this content item",
        )

    try:
        # 获取分块摘要
        summary_data = get_content_chunks_summary(session=session, content_item_id=id)

        # 获取最大索引（需要额外查询）
        from sqlmodel import func, select

        max_index_result = session.exec(
            select(func.max(Segment.segment_index)).where(Segment.content_item_id == id)
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
            detail="Failed to retrieve content chunks summary",
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
            status_code=status.HTTP_404_NOT_FOUND, detail="Content item not found"
        )

    if content_item.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to access this content item",
        )

    if not content_item.content_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Content item has no text content to analyze",
        )

    # 使用配置的模型，支持任务特定的模型选择
    # 对于内容分析，使用 analysis 任务对应的模型
    resolved_model = settings.resolved_ai_task_models.get(
        "analysis", settings.DEFAULT_LLM_MODEL
    )

    # 创建AIConversation记录
    ai_conversation = create_ai_conversation_for_analysis(
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
            _content_item_id=content_item.id,  # 使用 ID 而不是对象
            content_text=content_item.content_text,  # 传递内容文本
            request=request,
            ai_conversation_id=ai_conversation.id,  # 传递 conversation ID 而不是对象
            resolved_model=resolved_model,
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
    _content_item_id: uuid.UUID,  # 使用 ID 而不是对象
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
                "content": f"你是一个专业的内容分析助手。请根据用户的要求分析以下内容：\n\n{content_text}",
            },
            {"role": "user", "content": request.analysis_instruction},
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
                    except Exception:
                        pass
                    yield f'{{"t":"error","c":"{error_msg}"}}]\n'
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
                                            # 🎯 使用新的CRUD接口
                                            success = update_ai_conversation_response(
                                                new_session,
                                                ai_conversation_id,
                                                accumulated_content,
                                            )
                                            if not success:
                                                logger.error(f"Failed to save AI response for conversation {ai_conversation_id}")
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

                                    # 保存错误
                                    try:
                                        with next(get_db()) as new_session:
                                            # 🎯 使用新的CRUD接口
                                            success = update_ai_conversation_response(
                                                new_session,
                                                ai_conversation_id,
                                                accumulated_content,
                                                "failed",
                                                error_msg,
                                            )
                                            if not success:
                                                logger.error(f"Failed to save error for conversation {ai_conversation_id}")
                                    except Exception as e:
                                        logger.error(f"Failed to save error: {e}")

                                    yield f'{{"t":"error","c":"{error_msg}"}}]\n'
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
                                        yield f"{escaped_content}\n"

                            except json.JSONDecodeError:
                                # 忽略非JSON数据
                                continue

        # 确保保存最终内容和发送完成信号
        if accumulated_content:
            try:
                with next(get_db()) as new_session:
                    # 🎯 使用新的CRUD接口
                    success = update_ai_conversation_response(
                        new_session, ai_conversation_id, accumulated_content
                    )
                    if not success:
                        logger.error(f"Failed to save final response for conversation {ai_conversation_id}")
            except Exception as e:
                logger.error(f"Failed to save final response: {e}")
            yield '8:[{"finishReason":"stop"}]\n'

    except Exception as e:
        # 在新的数据库会话中保存错误
        try:
            with next(get_db()) as new_session:
                # 🎯 使用新的CRUD接口
                success = update_ai_conversation_response(
                    new_session, ai_conversation_id, "", "failed", str(e)
                )
                if not success:
                    logger.error(f"Failed to save stream error for conversation {ai_conversation_id}")
        except Exception as save_error:
            logger.error(f"Failed to save stream error: {save_error}")

        # 发送错误信息
        error_msg = str(e).replace('"', '\\"')
        yield f'{{"t":"error","c":"Stream error: {error_msg}"}}]\n'


@router.post(
    "/{id}/analyze-ai-sdk-updated",
    summary="Analyze Content with AI SDK (Updated Structure)",
    description="Analyze content using AI SDK with updated prompt structure.",
)
async def analyze_ai_sdk_updated_endpoint(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID = Path(..., description="Content item ID"),
    request: ContentAnalysisRequest,
) -> StreamingResponse:
    """Analyze content using AI SDK with updated prompt structure."""
    # Get content item
    content_item = crud_get_content_item(session, id)
    if not content_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Content item not found",
        )

    # Check ownership
    if content_item.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to analyze this content",
        )

    # Check if content has text
    if not content_item.content_text or content_item.content_text.strip() == "":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Content item has no text content to analyze",
        )

    # 提前提取ContentItem的属性，避免在异步函数中使用ORM对象
    content_item_id = content_item.id
    content_text = content_item.content_text
    content_title = content_item.title or "Untitled Content"

    # Create AI conversation record
    ai_conversation = create_ai_conversation_for_analysis(
        session=session,
        user_id=current_user.id,
        content_item_id=content_item_id,
        content_item_title=content_title,
        analysis_instruction=request.analysis_instruction,
        content_to_analyze=content_text,
        model=settings.DEFAULT_LLM_MODEL,
        temperature=request.temperature,
        max_tokens=request.max_tokens,
    )

    async def stream_analysis():
        try:
            async for chunk in _stream_content_analysis_ai_sdk(
                _content_item_id=content_item_id,  # 修复参数名匹配
                content_text=content_text,  # 使用提前提取的内容文本
                request=request,
                ai_conversation_id=ai_conversation.id,
            ):
                yield chunk
        except Exception as e:
            logger.error(f"Error in AI SDK analysis streaming: {e}")
            error_response = {
                "type": "error",
                "content": f"Analysis failed: {str(e)}",
                "finished": True,
            }
            yield f"data: {json.dumps(error_response)}\n\n"

    return StreamingResponse(
        stream_analysis(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
        },
    )


async def _stream_content_analysis_ai_sdk(
    _content_item_id: uuid.UUID,  # 使用ID而不是对象
    content_text: str,  # 直接传递内容文本
    request: ContentAnalysisRequest,
    ai_conversation_id: uuid.UUID,
) -> AsyncGenerator[str, None]:
    """Stream AI SDK analysis with updated prompt structure."""
    import aiohttp

    try:
        # 创建实时JSONL处理器
        jsonl_processor = create_realtime_jsonl_processor()

        # 使用新的用户分析模板渲染prompt
        user_prompt = render_user_analysis_prompt(request.analysis_instruction)

        # Prepare messages with updated structure
        messages = [
            {"role": "system", "content": content_text},  # 使用传递的内容文本
            {"role": "user", "content": user_prompt},  # 使用渲染后的用户prompt
        ]

        # 使用配置的模型，支持任务特定的模型选择
        # 对于内容分析，使用 analysis 任务对应的模型
        resolved_model = settings.resolved_ai_task_models.get(
            "analysis", settings.DEFAULT_LLM_MODEL
        )
        
        # 🎯 简化token处理：直接使用请求的max_tokens或默认值
        final_max_tokens = request.max_tokens or get_token_limit(task_type="analysis")
        
        logger.info(f"🎯 内容分析token设置: 请求={request.max_tokens}, "
                   f"最终使用={final_max_tokens}")

        payload = {
            "model": resolved_model,
            "messages": messages,
            "temperature": request.temperature,
            "max_tokens": final_max_tokens,  # 使用简化后的token数
            "stream": True,
        }

        url = f"{settings.LITELLM_PROXY_URL}/v1/chat/completions"

        # 添加认证头部设置
        headers = {"Content-Type": "application/json"}
        if settings.LITELLM_MASTER_KEY:
            headers["Authorization"] = f"Bearer {settings.LITELLM_MASTER_KEY}"

        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=payload, headers=headers) as response:
                if response.status != 200:
                    raise HTTPException(
                        status_code=response.status,
                        detail=f"LiteLLM error: HTTP {response.status}",
                    )

                full_response = ""
                async for line in response.content:
                    line_str = line.decode("utf-8").strip()

                    if line_str.startswith("data: "):
                        data_str = line_str[6:]

                        if data_str == "[DONE]":
                            break

                        try:
                            data = json.loads(data_str)
                            if "choices" in data and data["choices"]:
                                delta = data["choices"][0].get("delta", {})
                                if "content" in delta:
                                    content = delta["content"]
                                    full_response += content

                                    # 发送数据流
                                    formatted_data = f"0:{json.dumps({'text': content})}\n"
                                    yield formatted_data

                        except json.JSONDecodeError:
                            continue

                # 发送完成信号
                completion_data = f"d:{json.dumps({'finishReason': 'stop', 'usage': {'totalTokens': len(full_response)}})}\n"
                yield completion_data

                # 记录最终结果
                logger.info(f"📊 分析完成: 输出长度={len(full_response)}, "
                           f"估算输出token={len(full_response)//3}, "
                           f"token限制={final_max_tokens}")

    except Exception as e:
        logger.error(f"Stream analysis failed: {str(e)}")
        error_data = f"e:{json.dumps({'error': str(e)})}\n"
        yield error_data


@router.post(
    "/{id}/completion-updated",
    summary="Content Completion with Updated Structure",
    description="Get content completion using updated prompt structure.",
)
async def completion_updated_endpoint(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID = Path(..., description="Content item ID"),
    request: ContentAnalysisRequest,
) -> StreamingResponse:
    """Get content completion with updated prompt structure."""
    # Get content item
    content_item = crud_get_content_item(session, id)
    if not content_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Content item not found",
        )

    # Check ownership
    if content_item.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to analyze this content",
        )

    # Check if content has text
    if not content_item.content_text or content_item.content_text.strip() == "":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Content item has no text content to analyze",
        )

    # 提前提取ContentItem的属性，避免在异步函数中使用ORM对象
    content_item_id = content_item.id
    content_text = content_item.content_text
    content_title = content_item.title or "Untitled Content"

    # 🎯 优化模型选择逻辑：根据template_name动态选择模型
    chat_service = ChatService()
    if request.template_name:
        # 如果指定了模板名称，使用模板映射选择模型
        resolved_model = chat_service.get_model_for_template(request.template_name)
        logger.info(f"使用模板 '{request.template_name}' 对应的模型: {resolved_model}")
    else:
        # 如果没有指定模板，这是用户的自由对话，使用聊天模型
        resolved_model = settings.resolved_ai_task_models.get(
            "chat", settings.DEFAULT_LLM_MODEL
        )
        logger.info(f"使用默认聊天模型: {resolved_model}")

    # Create AI conversation record
    ai_conversation = create_ai_conversation_for_analysis(
        session=session,
        user_id=current_user.id,
        content_item_id=content_item_id,
        content_item_title=content_title,
        analysis_instruction=request.analysis_instruction,
        content_to_analyze=content_text,
        model=resolved_model,
        temperature=request.temperature,
        max_tokens=request.max_tokens,
    )

    # Return streaming response
    return StreamingResponse(
        _stream_content_completion_updated(
            content_item_id,
            content_text,
            content_title,
            request,
            ai_conversation.id,
            resolved_model,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Cache-Control",
        },
    )


async def _stream_content_completion_updated(
    _content_item_id: uuid.UUID,  # 使用ID而不是对象
    content_text: str,  # 直接传递内容文本
    content_title: str,  # 内容标题
    request: ContentAnalysisRequest,
    ai_conversation_id: uuid.UUID,
    resolved_model: str,  # 🎯 新增：接收预选择的模型
) -> AsyncGenerator[str, None]:
    """Stream content completion with updated prompt structure."""
    import aiohttp

    from app.utils.prompt_helpers import render_template_prompt

    try:
        # 创建实时JSONL处理器
        jsonl_processor = create_realtime_jsonl_processor()

        # 根据请求的模板选择渲染方式
        template_name = request.template_name or "user_analysis.j2"

        if template_name == "expand_discussion.j2":
            # 为expand_discussion模板准备特殊的上下文
            user_prompt = render_template_prompt(
                template_name,
                selected_point=request.selected_point or request.analysis_instruction,
                content=content_text,
                document_metadata={
                    "title": content_title,
                    "author": "Unknown",
                    "source_url": None,
                },
            )
        else:
            # 使用原有的用户分析模板渲染
            user_prompt = render_user_analysis_prompt(request.analysis_instruction)

        # Prepare messages with updated structure
        messages = [
            {"role": "system", "content": content_text},  # 使用传递的内容文本
            {"role": "user", "content": user_prompt},  # 使用渲染后的用户prompt
        ]

        # 🎯 使用传入的预选择模型
        logger.info(f"流式处理使用模型: {resolved_model}")

        payload = {
            "model": resolved_model,  # 使用传入的模型
            "messages": messages,
            "temperature": request.temperature,
            "max_tokens": request.max_tokens,
            "stream": True,
        }

        url = f"{settings.LITELLM_PROXY_URL}/v1/chat/completions"

        # 添加认证头部设置
        headers = {"Content-Type": "application/json"}
        if settings.LITELLM_MASTER_KEY:
            headers["Authorization"] = f"Bearer {settings.LITELLM_MASTER_KEY}"

        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=payload, headers=headers) as response:
                if response.status != 200:
                    raise HTTPException(
                        status_code=response.status,
                        detail=f"LiteLLM error: HTTP {response.status}",
                    )

                full_response = ""

                async for line in response.content.iter_chunked(1024):
                    line_str = line.decode("utf-8")
                    lines = line_str.strip().split("\n")

                    for line in lines:
                        if line.startswith("data: "):
                            data_part = line[6:].strip()
                            if data_part == "[DONE]":
                                # 处理剩余内容
                                final_increment = jsonl_processor.finalize()
                                if final_increment:
                                    # 直接传输JSONL对象，不进行额外转义
                                    final_lines = final_increment.strip().split("\n")
                                    for jsonl_line in final_lines:
                                        if jsonl_line.strip():
                                            # 直接传输JSONL对象 (类型0)
                                            yield f"0:{jsonl_line}\n"

                                # 发送完成信号 (类型8)
                                # yield f'8:[{{"finishReason":"stop"}}]\n'

                                # Update AI conversation with response using new session
                                try:
                                    with Session(engine) as db_session:
                                        final_content = (
                                            jsonl_processor.get_current_jsonl()
                                        )
                                        # 🎯 使用新的CRUD接口
                                        success = update_ai_conversation_response(
                                            db_session,
                                            ai_conversation_id,
                                            final_content,
                                        )
                                        if not success:
                                            logger.error(f"Failed to save AI completion response for conversation {ai_conversation_id}")
                                except Exception as e:
                                    logger.error(
                                        f"Failed to save AI completion response: {e}"
                                    )
                                return

                            try:
                                chunk_data = json.loads(data_part)
                                if "choices" in chunk_data and chunk_data["choices"]:
                                    delta = chunk_data["choices"][0].get("delta", {})
                                    if "content" in delta:
                                        content = delta["content"]
                                        full_response += content

                                        # 使用实时JSONL处理器检测完整的JSONL行
                                        jsonl_increment, has_new_jsonl = (
                                            jsonl_processor.process_chunk(content)
                                        )

                                        if has_new_jsonl and jsonl_increment:
                                            # 直接传输JSONL对象，不进行额外转义
                                            jsonl_lines = jsonl_increment.strip().split(
                                                "\n"
                                            )
                                            for jsonl_line in jsonl_lines:
                                                if jsonl_line.strip():
                                                    # 直接传输JSONL对象 (类型0)
                                                    yield f"0:{jsonl_line}\n"

                            except json.JSONDecodeError:
                                continue

    except Exception as e:
        # 发送错误信息 (类型9)
        error_msg = str(e).replace('"', '\\"')
        yield f'{{"t":"error","c":"Completion failed: {error_msg}"}}]\n'


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
            status_code=status.HTTP_404_NOT_FOUND, detail="Content item not found"
        )

    if content_item.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to access this content item",
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
        # 防御性检查 - 确保对象有 messages 属性
        if not hasattr(conversation, 'messages'):
            logger.error(f"Conversation object {getattr(conversation, 'id', 'unknown')} missing messages attribute")
            logger.error(f"Object type: {type(conversation)}")
            logger.error(f"Available attributes: {[attr for attr in dir(conversation) if not attr.startswith('_')]}")
            # 返回一个基本的对话结构
            return {
                "id": str(getattr(conversation, 'id', 'unknown')),
                "user_id": str(getattr(conversation, 'user_id', 'unknown')),
                "content_item_id": str(getattr(conversation, 'content_item_id', None)) if getattr(conversation, 'content_item_id', None) else None,
                "title": getattr(conversation, 'title', 'Unknown Title'),
                "conversation_type": getattr(conversation, 'conversation_type', 'unknown'),
                "ai_model_name": getattr(conversation, 'ai_model_name', 'unknown'),
                "messages": [],
                "summary": getattr(conversation, 'summary', None),
                "is_active": getattr(conversation, 'is_active', True),
                "created_at": getattr(conversation, 'created_at', '').isoformat() if hasattr(getattr(conversation, 'created_at', ''), 'isoformat') else str(getattr(conversation, 'created_at', '')),
                "updated_at": getattr(conversation, 'updated_at', '').isoformat() if hasattr(getattr(conversation, 'updated_at', ''), 'isoformat') else str(getattr(conversation, 'updated_at', '')),
            }
        
        messages_data = (
            json.loads(conversation.messages) if conversation.messages else []
        )
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
        logger.error(
            f"Failed to parse messages for conversation {conversation.id}: {e}"
        )
        messages = []
    except AttributeError as e:
        logger.error(
            f"AttributeError when accessing conversation attributes: {e}"
        )
        logger.error(f"Conversation object type: {type(conversation)}")
        logger.error(f"Available attributes: {[attr for attr in dir(conversation) if not attr.startswith('_')]}")
        # 返回一个基本的对话结构
        return {
            "id": str(getattr(conversation, 'id', 'unknown')),
            "user_id": str(getattr(conversation, 'user_id', 'unknown')),
            "content_item_id": str(getattr(conversation, 'content_item_id', None)) if getattr(conversation, 'content_item_id', None) else None,
            "title": getattr(conversation, 'title', 'Unknown Title'),
            "conversation_type": getattr(conversation, 'conversation_type', 'unknown'),
            "ai_model_name": getattr(conversation, 'ai_model_name', 'unknown'),
            "messages": [],
            "summary": getattr(conversation, 'summary', None),
            "is_active": getattr(conversation, 'is_active', True),
            "created_at": getattr(conversation, 'created_at', '').isoformat() if hasattr(getattr(conversation, 'created_at', ''), 'isoformat') else str(getattr(conversation, 'created_at', '')),
            "updated_at": getattr(conversation, 'updated_at', '').isoformat() if hasattr(getattr(conversation, 'updated_at', ''), 'isoformat') else str(getattr(conversation, 'updated_at', '')),
        }

    return {
        "id": str(conversation.id),
        "user_id": str(conversation.user_id),
        "content_item_id": str(conversation.content_item_id)
        if conversation.content_item_id
        else None,
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
            ContentItem.id == content_id, ContentItem.user_id == current_user.id
        )
    ).first()

    if not content_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Content item not found"
        )

    try:
        # 查询对话 - 确保返回完整的模型对象
        query = select(AIConversation).where(
            AIConversation.content_item_id == content_id,
            AIConversation.user_id == current_user.id,
        )

        if not include_inactive:
            query = query.where(AIConversation.is_active == True)

        # 使用 scalars() 方法确保返回模型对象而不是 Row 对象
        conversations = session.exec(query.order_by(AIConversation.created_at)).all()
        
        logger.info(f"Found {len(conversations)} conversations for content {content_id}")

        # 转换为public schema - 添加额外的错误处理
        public_conversations = []
        for i, conv in enumerate(conversations):
            try:
                logger.debug(f"Processing conversation {i+1}/{len(conversations)}: {conv.id}")
                public_conv = convert_conversation_to_public(conv)
                public_conversations.append(public_conv)
            except Exception as e:
                logger.error(f"Failed to convert conversation {getattr(conv, 'id', 'unknown')} to public: {e}")
                logger.error(f"Conversation type: {type(conv)}")
                # 继续处理其他对话，而不是完全失败
                continue

        # 检查是否有自动分析对话
        has_auto_analysis = False
        try:
            has_auto_analysis = any(
                getattr(conv, 'conversation_type', None) == "auto_analysis" for conv in conversations
            )
        except Exception as e:
            logger.error(f"Failed to check auto_analysis conversations: {e}")

        return {
            "conversations": public_conversations,
            "total": len(public_conversations),
            "has_auto_analysis": has_auto_analysis,
        }
        
    except Exception as e:
        logger.error(f"Error in get_content_conversations: {e}")
        logger.error(f"Content ID: {content_id}, User ID: {current_user.id}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve conversations"
        )


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
        title=conversation_data.get("title")
        or f"与《{content_item.title or '内容'}》的对话",
        conversation_type=conversation_data.get("conversation_type", "user_chat"),
        ai_model_name=conversation_data.get("ai_model_name", "gpt-3.5-turbo"),
        messages="[]",
        summary=None,
        is_active=True,
    )

    # 如果有初始消息，添加到对话中
    if conversation_data.get("initial_message"):
        from app.utils.timezone import now_utc

        messages = [
            {
                "role": "user",
                "content": conversation_data["initial_message"],
                "timestamp": now_utc().isoformat(),
                "metadata": {"initial_message": True},
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


@router.get(
    "/{id}/analyze/stream",
    summary="Stream Content Analysis with Templates",
    description="Perform streaming AI analysis using predefined templates (summary or key_points).",
)
async def analyze_content_stream_with_template_endpoint(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID = Path(..., description="Content item ID"),
    analysis_type: str = Query(
        ..., description="Analysis type: 'summary' or 'key_points'"
    ),
) -> StreamingResponse:
    """
    使用预定义模板进行流式内容分析
    """

    # 验证analysis_type参数
    if analysis_type not in ["summary", "key_points"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="analysis_type must be 'summary' or 'key_points'",
        )

    # 验证内容项存在且属于当前用户
    content_item = crud_get_content_item(session=session, id=id)
    if not content_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Content item not found"
        )

    if content_item.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to access this content item",
        )

    if not content_item.content_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Content item has no text content to analyze",
        )

    # 使用配置的模型，支持任务特定的模型选择
    # 根据 analysis_type 参数选择对应的模型
    if analysis_type == "summary":
        resolved_model = settings.resolved_ai_task_models.get(
            "summary", settings.DEFAULT_LLM_MODEL
        )
    elif analysis_type == "key_points":
        resolved_model = settings.resolved_ai_task_models.get(
            "key_points", settings.DEFAULT_LLM_MODEL
        )
    else:
        # 对于其他分析类型，使用通用分析模型
        resolved_model = settings.resolved_ai_task_models.get(
            "analysis", settings.DEFAULT_LLM_MODEL
        )

    # 提取ContentItem的必要属性，避免传递ORM对象到异步函数
    content_title = content_item.title
    content_text = content_item.content_text
    source_uri = content_item.source_uri

    # 返回流式响应 - 传递简单的数据类型而不是ORM对象
    return StreamingResponse(
        _stream_template_analysis(
            content_item_id=id,
            content_text=content_text,
            content_title=content_title,
            _source_uri=source_uri,
            analysis_type=analysis_type,
            user_id=current_user.id,
            _model=resolved_model,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Cache-Control",
        },
    )


async def _stream_template_analysis(
    content_item_id: uuid.UUID,
    content_text: str,
    content_title: str | None,
    _source_uri: str | None,
    analysis_type: str,
    user_id: uuid.UUID,
    _model: str,
) -> AsyncGenerator[str, None]:
    """
    流式模板分析，支持动态token调整
    """
    try:
        # 根据分析类型映射到任务类型
        task_type_mapping = {
            "summary": "summary",
            "key_points": "key_points", 
            "labels": "labels",
            "analysis": "analysis"
        }
        task_type = task_type_mapping.get(analysis_type, "analysis")
        
        # 🎯 简化设置：直接使用默认token限制
        max_tokens = get_token_limit(task_type=task_type)
        
        logger.info(f"🎯 模板分析设置: 类型={analysis_type}, 任务={task_type}, "
                   f"token限制={max_tokens}")

        # 渲染分析指令模板
        template_env = Environment(
            loader=FileSystemLoader("app/prompt_templates"), trim_blocks=True
        )

        # 根据分析类型选择模板
        template_map = {
            "summary": "summary.j2",
            "key_points": "key_points.j2", 
            "labels": "labels.j2",
        }
        
        template_name = template_map.get(analysis_type, "summary.j2")
        template = template_env.get_template(template_name)
        
        analysis_instruction = template.render(
            content_title=content_title or "无标题",
            content_text=content_text[:2000],  # 限制模板中的内容长度
            content_type="文档",
        )

        # 构建消息
        messages = [
            {"role": "system", "content": content_text},
            {"role": "user", "content": analysis_instruction},
        ]

        # 获取解析后的模型
        resolved_model = settings.resolved_ai_task_models.get(
            task_type, settings.DEFAULT_LLM_MODEL
        )

        # 创建AI对话记录
        try:
            with Session(engine) as db_session:
                ai_conversation = create_ai_conversation_for_analysis(
                    session=db_session,
                    user_id=user_id,
                    content_item_id=content_item_id,
                    content_item_title=content_title or "Untitled",
                    analysis_instruction=analysis_instruction,
                    content_to_analyze=content_text,
                    model=resolved_model,
                    temperature=0.7,  # 使用固定的温度值
                    max_tokens=max_tokens,
                )
        except Exception as e:
            logger.error(f"Failed to create AI conversation: {e}")

        # LiteLLM 代理配置
        litellm_url = f"{settings.LITELLM_PROXY_URL}/v1/chat/completions"
        headers = {"Content-Type": "application/json"}

        if settings.LITELLM_MASTER_KEY:
            headers["Authorization"] = f"Bearer {settings.LITELLM_MASTER_KEY}"

        payload = {
            "model": resolved_model,
            "messages": messages,
            "stream": True,
            "temperature": 0.7,  # 使用固定的温度值
            "max_tokens": max_tokens,
        }

        logger.info(f"🚀 开始模板分析: 模型={resolved_model}, "
                   f"max_tokens={max_tokens}, temperature=0.7")

        timeout = aiohttp.ClientTimeout(total=120.0)
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.post(
                litellm_url, json=payload, headers=headers
            ) as response:
                if response.status != 200:
                    error_text = await response.text()
                    raise HTTPException(
                        status_code=response.status,
                        detail=f"LiteLLM error: {error_text}",
                    )

                accumulated_content = ""
                async for line in response.content:
                    line_str = line.decode("utf-8").strip()

                    if line_str.startswith("data: "):
                        data_str = line_str[6:]

                        if data_str == "[DONE]":
                            logger.info(f"📊 模板分析完成: 输出长度={len(accumulated_content)}")
                            break

                        try:
                            data = json.loads(data_str)
                            if "choices" in data and data["choices"]:
                                delta = data["choices"][0].get("delta", {})
                                if "content" in delta:
                                    content = delta["content"]
                                    accumulated_content += content

                                    # AI SDK Data Stream Protocol format
                                    formatted_data = f"0:{json.dumps({'text': content})}\n"
                                    yield formatted_data

                        except json.JSONDecodeError:
                            continue

                # 发送完成信号
                completion_data = f"d:{json.dumps({'finishReason': 'stop'})}\n"
                yield completion_data

    except Exception as e:
        logger.error(f"模板分析失败: {str(e)}")
        error_data = f"e:{json.dumps({'error': str(e)})}\n"
        yield error_data


@router.delete(
    "/{id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Content Item",
    description="Delete a content item and all its related data. User can only delete their own content.",
)
def delete_content_item_endpoint(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID = Path(..., description="Content item ID to delete"),
) -> None:
    """
    Delete a content item and all its related data including:
    - Segments (chunks)
    - Content assets
    - Content shares
    - AI results
    - AI conversations

    Only the owner of the content item can delete it.
    """
    try:
        success = delete_content_item_sync(
            session=session, id=id, user_id=current_user.id
        )

        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete content item",
            )

        # 发送SSE通知（如果需要）
        try:
            content_event_manager.notify_content_deleted(
                content_id=str(id), user_id=str(current_user.id)
            )
        except Exception as e:
            # SSE通知失败不应该影响删除操作
            logger.warning(f"Failed to send content deletion notification: {e}")

    except ValueError as e:
        error_msg = str(e)
        if "not found" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Content item not found"
            )
        elif "permission" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to delete this content item",
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail=error_msg
            )
    except Exception as e:
        logger.error(f"Unexpected error deleting content item {id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while deleting the content item",
        )


@router.post(
    "/{id}/favorite",
    status_code=status.HTTP_201_CREATED,
    summary="Add Content to Favorites",
    description="Add a content item or specific block to the user's favorites list.",
)
def add_to_favorites_endpoint(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID = Path(..., description="Content item ID to add to favorites"),
    favorite_data: dict = Body(
        default={}, 
        description="Optional block data for block-level favorites"
    ),
) -> dict[str, str]:
    """Add content item or block to favorites."""
    from app.crud.crud_favorite import create_favorite, get_favorite

    # Verify content item exists and belongs to user
    content_item = crud_get_content_item(session=session, id=id)
    if not content_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Content item not found"
        )

    if content_item.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to access this content item",
        )

    # Extract block information if provided
    block_id = favorite_data.get("block_id")
    block_type = favorite_data.get("block_type")
    block_content = favorite_data.get("block_content")
    title = favorite_data.get("title")
    description = favorite_data.get("description")
    tags = favorite_data.get("tags")

    # Check if already favorited
    existing_favorite = get_favorite(
        session=session, 
        user_id=current_user.id, 
        content_item_id=id,
        block_id=block_id
    )
    if existing_favorite:
        if block_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This block is already in favorites",
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Content item is already in favorites",
            )

    # Create favorite
    create_favorite(
        session=session, 
        user_id=current_user.id, 
        content_item_id=id,
        block_id=block_id,
        block_type=block_type,
        block_content=block_content,
        title=title,
        description=description,
        tags=tags
    )

    return {"status": "ok"}


@router.delete(
    "/{id}/favorite",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove Content from Favorites",
    description="Remove a content item or specific block from the user's favorites list.",
)
def remove_from_favorites_endpoint(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID = Path(..., description="Content item ID to remove from favorites"),
    block_id: Optional[str] = Query(None, description="Block ID to remove from favorites"),
) -> None:
    """Remove content item or block from favorites."""
    from app.crud.crud_favorite import delete_favorite

    # Verify content item exists and belongs to user
    content_item = crud_get_content_item(session=session, id=id)
    if not content_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Content item not found"
        )

    if content_item.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to access this content item",
        )

    # Remove from favorites
    success = delete_favorite(
        session=session, 
        user_id=current_user.id, 
        content_item_id=id,
        block_id=block_id
    )
    if not success:
        if block_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="This block is not in favorites",
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Content item is not in favorites",
            )


@router.get(
    "/{id}/favorite/status",
    summary="Check Favorite Status",
    description="Check if a content item or specific block is in the user's favorites.",
)
def check_favorite_status_endpoint(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID = Path(..., description="Content item ID to check"),
    block_id: Optional[str] = Query(None, description="Block ID to check"),
) -> dict[str, bool]:
    """Check if content item or block is in favorites."""
    from app.crud.crud_favorite import get_favorite

    # Verify content item exists and belongs to user
    content_item = crud_get_content_item(session=session, id=id)
    if not content_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Content item not found"
        )

    if content_item.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to access this content item",
        )

    # Check favorite status
    favorite = get_favorite(
        session=session, 
        user_id=current_user.id, 
        content_item_id=id,
        block_id=block_id
    )

    return {"is_favorite": favorite is not None}


@router.get(
    "/processors/supported",
    summary="Get Supported Processors",
    description="Get information about supported content processors and pipeline configuration.",
)
def get_supported_processors_endpoint() -> dict[str, Any]:
    """Get supported processors information."""
    return {
        "supported_types": [
            "text",
            "url",
            "pdf",
            "docx",
            "webpage",
            "html",
            "markdown",
            "csv",
            "json",
            "xlsx",
            "pptx",
        ],
        "processors": {
            "modern_processor": {
                "name": "ModernProcessor",
                "description": "Unified processor using Microsoft MarkItDown",
                "supported_types": [
                    "url",
                    "pdf",
                    "docx",
                    "xlsx",
                    "pptx",
                    "csv",
                    "json",
                ],
                "features": [
                    "text_extraction",
                    "markdown_conversion",
                    "metadata_extraction",
                ],
            },
            "text_processor": {
                "name": "TextProcessor",
                "description": "Direct text processing without conversion",
                "supported_types": ["text"],
                "features": ["direct_processing"],
            },
            "jina_processor": {
                "name": "JinaProcessor",
                "description": "Web content extraction using Jina Reader API",
                "supported_types": ["url", "webpage"],
                "features": ["web_content_extraction", "markdown_conversion"],
            },
        },
        "pipeline_info": {
            "engine": "Microsoft MarkItDown",
            "storage": "Cloudflare R2",
            "extensible": True,
            "features": [
                "background_processing",
                "automatic_chunking",
                "ai_analysis",
                "error_handling",
            ],
        },
    }


@router.post(
    "/{id}/share",
    response_model=ContentSharePublic,
    status_code=status.HTTP_201_CREATED,
    summary="Create a Share Link for a Content Item",
    description="Generates a shareable link for the specified content item. Requires ownership.",
)
def create_share_link_endpoint(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID = Path(..., description="ID of the content item to share"),
    share_data: ContentShareCreate,
) -> ContentSharePublic:
    """Create a share link for a content item."""
    # Verify content item exists and user owns it
    content_item = crud_get_content_item(session, id)
    if not content_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Content item not found",
        )

    if content_item.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to share this content",
        )

    try:
        # Create the share link
        content_share = create_content_share(
            session,
            content_share_in=share_data,
            content_item_id=id,
            _user_id=current_user.id,
        )

        return ContentSharePublic(
            id=content_share.id,
            share_token=content_share.share_token,
            created_at=content_share.created_at,
            expires_at=content_share.expires_at,
            is_active=content_share.is_active,
        )
    except Exception as e:
        logger.error(f"Failed to create share link for content {id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create share link",
        )


@router.get(
    "/share/{token}",
    response_model=ContentItemPublic,
    summary="Access Shared Content",
    description="Retrieves a content item using a share token. May require a password.",
)
def get_shared_content_endpoint(
    *,
    session: SessionDep,
    token: str = Path(..., description="The unique share token or content ID"),
    password: str | None = Query(None, description="Password for protected content"),
) -> ContentItemPublic:
    """Access shared content using a share token or content ID."""
    import uuid

    # First, try to get the share record by token
    content_share = get_content_share_by_token(session, token)

    # If no share record found, check if token is a valid UUID (content ID)
    if not content_share:
        try:
            # Try to parse as UUID (content ID)
            content_id = uuid.UUID(token)

            # Get the content item directly
            content_item = crud_get_content_item(session, content_id)
            if not content_item:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Content not found",
                )

            # For direct content ID access, return the content without share restrictions
            # This is a fallback mechanism for backward compatibility
            return ContentItemPublic.model_validate(content_item)

        except ValueError:
            # Not a valid UUID, and no share record found
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Share link not found or inactive",
            )

    # If we have a share record, proceed with standard share validation
    # Check if share is active
    if not content_share.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Share link not found or inactive",
        )

    # Check if expired
    if content_share.expires_at:
        # Ensure we're comparing timezone-aware datetimes
        expires_at = content_share.expires_at
        if expires_at.tzinfo is None:
            # If expires_at is naive, treat it as UTC
            expires_at = expires_at.replace(tzinfo=timezone.utc)

        current_time = datetime.now(timezone.utc)

        if expires_at < current_time:
            # Deactivate expired share
            deactivate_content_share(session, content_share=content_share)
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Share link has expired",
            )

    # Check password if required
    if content_share.password_hash:
        if not password:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Password required",
            )
        if not verify_password(password, content_share.password_hash):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Incorrect password",
            )

    # Get the content item
    content_item = crud_get_content_item(session, content_share.content_item_id)
    if not content_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Content item not found",
        )

    # Increment access count
    increment_access_count(session, content_share=content_share)

    return ContentItemPublic.model_validate(content_item)


@router.delete(
    "/{id}/share",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Deactivate Share Link(s) for a Content Item",
    description="Deactivates active share links for the specified content item. Requires ownership.",
)
def deactivate_share_link_endpoint(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID = Path(
        ..., description="ID of the content item whose shares to deactivate"
    ),
) -> None:
    """Deactivate all active share links for a content item."""
    # Verify content item exists and user owns it
    content_item = crud_get_content_item(session, id)
    if not content_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Content item not found",
        )

    if content_item.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to manage shares for this content",
        )

    # Get all active shares for this content item
    content_shares = get_content_shares_by_content_id(session, id)

    # Deactivate all active shares
    for share in content_shares:
        if share.is_active:
            deactivate_content_share(session, content_share=share)


@router.post(
    "/{id}/regenerate-ai",
    response_model=dict[str, Any],
    status_code=status.HTTP_200_OK,
    summary="Regenerate AI Analysis",
    description="Regenerate AI analysis results for a content item. This will re-run the AI preprocessing pipeline.",
)
def regenerate_ai_analysis_endpoint(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID = Path(
        ..., description="ID of the content item to regenerate AI analysis for"
    ),
) -> dict[str, Any]:
    """
    Regenerate AI analysis for a content item.

    This endpoint:
    1. Validates user permissions
    2. Triggers AI preprocessing pipeline
    3. Returns immediately while processing in background
    4. Sends real-time updates via SSE
    """
    # Verify content item exists and user owns it
    content_item = crud_get_content_item(session, id)
    if not content_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Content item not found",
        )

    if content_item.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to regenerate AI analysis for this content",
        )

    # Check if content has been processed (has content_text)
    if not content_item.content_text or len(content_item.content_text.strip()) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Content must be processed before AI analysis can be regenerated",
        )

    # Update status to indicate AI regeneration is starting
    content_item.processing_status = "processing"
    session.add(content_item)
    session.commit()

    # Start AI regeneration task using the global instance
    background_task_manager.start_ai_regeneration(
        content_id=str(content_item.id), user_id=str(current_user.id)
    )

    logger.info(f"Started AI regeneration for content {content_item.id}")

    return {
        "message": "AI analysis regeneration started",
        "content_id": str(content_item.id),
        "status": "processing",
        "note": "Check SSE events for real-time progress updates",
    }

@router.get("/{content_id}/segments/{segment_number}", response_model=ContentSegmentOut)
async def get_content_segment(
    content_id: uuid.UUID,
    segment_number: int,
    current_user: CurrentUser,
    db: AsyncSessionDep
):
    """获取指定内容的特定段落"""
    
    # 验证内容项存在且用户有权限访问
    content_item = await db.scalar(
        select(ContentItem).where(
            and_(
                ContentItem.id == content_id,
                ContentItem.user_id == current_user.id
            )
        )
    )
    
    if not content_item:
        raise HTTPException(status_code=404, detail="Content not found")
    
    # 获取指定段落
    segment = await db.scalar(
        select(ContentSegment).where(
            and_(
                ContentSegment.content_item_id == content_id,
                ContentSegment.display_number == segment_number
            )
        )
    )
    
    if not segment:
        raise HTTPException(status_code=404, detail=f"Segment {segment_number} not found")
    
    return segment

@router.get("/{content_id}/segments", response_model=ContentSegmentBulkResponse)
async def get_content_segments(
    content_id: uuid.UUID,
    current_user: CurrentUser,
    db: AsyncSessionDep,
    numbers: Optional[str] = Query(None, description="逗号分隔的段落号列表，如 '1,3,5'"),
    from_number: Optional[int] = Query(None, description="起始段落号（包含）"),
    to_number: Optional[int] = Query(None, description="结束段落号（包含）")
):
    """批量获取内容段落
    
    支持三种查询模式：
    1. 指定段落号列表：?numbers=1,3,5
    2. 段落区间：?from_number=6&to_number=24
    3. 全部段落：不传任何参数
    """
    
    # 验证内容项存在且用户有权限访问
    content_item = await db.scalar(
        select(ContentItem).where(
            and_(
                ContentItem.id == content_id,
                ContentItem.user_id == current_user.id
            )
        )
    )
    
    if not content_item:
        raise HTTPException(status_code=404, detail="Content not found")
    
    # 构建查询条件
    query = select(ContentSegment).where(ContentSegment.content_item_id == content_id)
    requested_numbers = []
    
    if numbers:
        # 指定段落号列表模式
        try:
            requested_numbers = [int(n.strip()) for n in numbers.split(',') if n.strip()]
            query = query.where(ContentSegment.display_number.in_(requested_numbers))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid numbers format")
    
    elif from_number is not None and to_number is not None:
        # 区间模式
        if from_number > to_number:
            from_number, to_number = to_number, from_number
        query = query.where(
            and_(
                ContentSegment.display_number >= from_number,
                ContentSegment.display_number <= to_number
            )
        )
        requested_numbers = list(range(from_number, to_number + 1))
    
    elif from_number is not None or to_number is not None:
        raise HTTPException(status_code=400, detail="Both from_number and to_number are required for range query")
    
    # 执行查询
    query = query.order_by(ContentSegment.display_number)
    result = await db.execute(query)
    segments = result.scalars().all()
    
    # 计算缺失的段落号
    missing_numbers = []
    if requested_numbers:
        found_numbers = {seg.display_number for seg in segments}
        missing_numbers = [num for num in requested_numbers if num not in found_numbers]
    
    return ContentSegmentBulkResponse(
        segments=segments,
        total=len(segments),
        missing_numbers=missing_numbers
    )
