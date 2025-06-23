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
from sqlmodel import Session

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
)
from app.schemas.content import (  # Re-using ContentItemBaseSchema if public is just base + id and audit fields
    AIResultPublic,
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
from app.utils.streaming_processors import (
    StreamChunk,
    StreamingAIProcessor,
    StreamingKeyPointsProcessor,
    StreamingSummaryProcessor,
)

router = APIRouter()
logger = logging.getLogger(__name__)


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

    Args:
        session: 数据库会话
        ai_conversation: AI对话记录
        ai_response: AI响应内容
        status: 状态（completed/failed）
        error: 错误信息（如果有）
    """
    try:
        # 获取现有消息
        conversation_messages = json.loads(ai_conversation.messages)

        # 添加AI响应
        conversation_messages.append({"role": "assistant", "content": ai_response})

        # 更新记录
        ai_conversation.messages = json.dumps(conversation_messages)

        # 更新元信息
        meta_info = json.loads(ai_conversation.meta_info)
        meta_info.update({"status": status, "response_length": len(ai_response)})

        if error:
            meta_info["error"] = error

        ai_conversation.meta_info = json.dumps(meta_info)

        session.add(ai_conversation)
        session.commit()
    except Exception as e:
        logger.error(f"Failed to update AIConversation {ai_conversation.id}: {e}")


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
        created_at=item.created_at,
        updated_at=item.updated_at,
        ai_result=ai_result_data,
    )

    return public_item


@router.get(
    "/{id}/markdown",
    summary="Get Content Item as Markdown",
    description="Retrieves the processed markdown content for a content item. Returns raw markdown text.",
)
def get_content_markdown_endpoint(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
) -> dict[str, Any]:
    """
    Get content item markdown content.
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

    # Start with content_text from database
    markdown_content = item.content_text or ""

    # If content_text is empty or processing is completed, try to fetch from R2 storage
    if not markdown_content and item.processing_status == "completed":
        try:
            from app.utils.storage import get_storage_service

            storage_service = get_storage_service()

            # Look for markdown file in content assets
            for asset in item.assets:  # 使用正确的关系名 'assets'
                if asset.type == "processed_text":  # 使用正确的字段名 'type'
                    # Download markdown content from storage
                    try:
                        if asset.file_path:  # 确保 file_path 不为空
                            file_content = storage_service.download_file(
                                asset.file_path
                            )
                            markdown_content = file_content.decode("utf-8")

                            # Update content_text in database for faster future access
                            item.content_text = markdown_content
                            session.add(item)
                            session.commit()
                            session.refresh(item)
                            break
                        else:
                            print(f"Asset file_path is None for asset: {asset.id}")
                            continue
                    except FileNotFoundError:
                        print(f"Markdown file not found in storage: {asset.file_path}")
                        continue
                    except Exception as e:
                        print(f"Failed to download markdown from storage: {e}")
                        continue
        except Exception as e:
            # Log error but don't fail the request
            print(f"Failed to fetch markdown from storage: {e}")

    # Check if we have any content to return
    if not markdown_content:
        # Provide different messages based on processing status
        if item.processing_status == "failed":
            error_detail = "Content processing failed."
            if item.error_message:
                error_detail += f" Error: {item.error_message}"
            error_detail += " Please try reprocessing the content."

            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_detail,
            )
        elif item.processing_status in ["pending", "processing"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Content is not ready. Status: {item.processing_status}. Please wait for processing to complete.",
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"No markdown content available. Status: {item.processing_status}. The content may need to be reprocessed.",
            )

    return {
        "id": str(item.id),
        "title": item.title,
        "markdown_content": markdown_content,
        "processing_status": item.processing_status,
        "created_at": item.created_at.isoformat(),
        "updated_at": item.updated_at.isoformat(),
    }


@router.get(
    "/processors/supported",
    summary="Get Supported Content Types",
    description="Get list of supported content types and their processors.",
)
def get_supported_processors():
    """
    Get list of supported content processors.
    """
    # New architecture supports all these types through ModernProcessor + MarkItDown
    supported_types = ["text", "url", "pdf", "docx", "xlsx", "pptx", "image", "audio"]

    return {
        "supported_types": supported_types,
        "processors": {
            "text": "ModernProcessor with MarkItDown - Converts plain text to formatted Markdown",
            "url": "ModernProcessor with MarkItDown - Fetches webpage content and converts to Markdown",
            "pdf": "ModernProcessor with MarkItDown - Extracts text from PDF and converts to Markdown",
            "docx": "ModernProcessor with MarkItDown - Extracts text from Word documents and converts to Markdown",
            "xlsx": "ModernProcessor with MarkItDown - Extracts data from Excel files and converts to Markdown",
            "pptx": "ModernProcessor with MarkItDown - Extracts content from PowerPoint and converts to Markdown",
            "image": "ModernProcessor with MarkItDown - Analyzes images and generates Markdown descriptions",
            "audio": "ModernProcessor with MarkItDown - Transcribes audio and converts to Markdown",
        },
        "pipeline_info": {
            "engine": "Microsoft MarkItDown",
            "storage": "Cloudflare R2",
            "extensible": True,
            "supports_llm_integration": True,
        },
    }


@router.get(
    "/{id}/chunks",
    summary="Get Content Chunks",
    description="Retrieves content chunks for efficient rendering with pagination support.",
)
def get_content_chunks_endpoint(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
    page: int = Query(default=1, ge=1, description="Page number (1-based)"),
    size: int = Query(default=10, ge=1, le=50, description="Number of chunks per page"),
) -> dict[str, Any]:
    """
    Get content chunks with pagination.
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

    # Check if content is ready
    if item.processing_status != "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Content is not ready. Status: {item.processing_status}. Please wait for processing to complete.",
        )

    # Get chunks and total count
    chunks, total_count = get_content_chunks(session, id, page, size)

    # Get summary information
    summary = get_content_chunks_summary(session, id)

    # Calculate pagination info
    total_pages = (total_count + size - 1) // size  # Ceiling division
    has_next = page < total_pages
    has_prev = page > 1

    return {
        "content_id": str(id),
        "chunks": [
            {
                "id": str(chunk.id),
                "index": chunk.segment_index,
                "content": chunk.content,
                "type": chunk.segment_type,
                "word_count": chunk.word_count,
                "char_count": chunk.char_count,
                "meta_info": chunk.meta_info,
                "created_at": chunk.created_at.isoformat(),
            }
            for chunk in chunks
        ],
        "pagination": {
            "page": page,
            "size": size,
            "total_chunks": total_count,
            "total_pages": total_pages,
            "has_next": has_next,
            "has_prev": has_prev,
        },
        "summary": summary,
        "content_info": {
            "title": item.title,
            "processing_status": item.processing_status,
            "created_at": item.created_at.isoformat(),
            "updated_at": item.updated_at.isoformat(),
        },
    }


@router.get(
    "/{id}/chunks/summary",
    summary="Get Content Chunks Summary",
    description="Get summary information about content chunks without the actual content.",
)
def get_content_chunks_summary_endpoint(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
) -> dict[str, Any]:
    """
    Get content chunks summary.
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

    summary = get_content_chunks_summary(session, id)

    return {
        "content_id": str(id),
        "summary": summary,
        "content_info": {
            "title": item.title,
            "processing_status": item.processing_status,
            "created_at": item.created_at.isoformat(),
            "updated_at": item.updated_at.isoformat(),
        },
    }


@router.post("/{content_id}/analyze")
async def analyze_content_stream(
    content_id: str,
    current_user: CurrentUser,
    analysis_instruction: str = Body(..., description="用户的分析指令，如'请总结这篇文章'"),
    article_content: str = Body(..., description="要分析的文章正文内容"),
    db: Session = Depends(get_db),
):
    """
    Stream AI analysis of content using LiteLLM.

    Args:
        content_id: ID of the content to analyze
        analysis_instruction: 用户的分析指令 (发送给LLM的user role)
        article_content: 文章正文内容 (发送给LLM的system role)
        current_user: Current authenticated user
        db: Database session

    Returns:
        StreamingResponse: Server-sent events with analysis chunks
    """
    # Verify content exists and user has access
    content_item = crud_get_content_item(session=db, id=uuid.UUID(content_id))
    if not content_item or content_item.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Content not found")

    # 按正确约定传递：system role = 文章内容，user role = 分析指令
    completion_request = CompletionRequest(
        model="github-llama-3-2-11b-vision",  # 临时测试模型
        messages=[
            LLMMessage(role="system", content=article_content),      # 文章内容作为系统消息
            LLMMessage(role="user", content=analysis_instruction),   # 分析指令作为用户消息
        ],
        stream=True,
        temperature=0.7,
        max_tokens=2000,
    )

    async def stream_analysis() -> AsyncGenerator[str, None]:
        """Generate analysis stream from LiteLLM"""
        try:
            import aiohttp

            # Forward to LiteLLM proxy
            litellm_url = f"{settings.LITELLM_PROXY_URL}/v1/chat/completions"
            headers = {"Content-Type": "application/json"}

            # Add LiteLLM authentication if master key is configured
            if settings.LITELLM_MASTER_KEY:
                headers["Authorization"] = f"Bearer {settings.LITELLM_MASTER_KEY}"

            payload = completion_request.model_dump(exclude_none=True)

            # Make streaming request to LiteLLM using aiohttp
            timeout = aiohttp.ClientTimeout(total=10.0)  # 降低超时时间以便快速失败
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.post(
                    litellm_url, json=payload, headers=headers
                ) as response:
                    if response.status != 200:
                        # 如果LiteLLM不可用，提供模拟响应
                        async for chunk in _send_mock_analysis_response(analysis_instruction):
                            yield chunk
                        return

                    # Stream the response
                    async for chunk_bytes in response.content.iter_chunked(1024):
                        if chunk_bytes:
                            # Forward the chunk as-is (LiteLLM sends SSE format)
                            chunk_str: str = chunk_bytes.decode(
                                "utf-8", errors="ignore"
                            )
                            yield chunk_str

        except Exception:
            # 当LiteLLM服务不可用时，发送模拟分析响应
            async for chunk in _send_mock_analysis_response(analysis_instruction):
                yield chunk

    async def _send_mock_analysis_response(
        analysis_instruction: str,
    ) -> AsyncGenerator[str, None]:
        """发送模拟的分析响应（当LiteLLM不可用时）"""
        import asyncio

        # 不直接回显完整的分析指令，避免冗长输出
        trimmed_prompt = (
            analysis_instruction[:60] + "..." 
            if len(analysis_instruction) > 60 
            else analysis_instruction
        )

        mock_analysis = f"""⚠️ LiteLLM service is unavailable (mock response).

Prompt preview: "{trimmed_prompt}"

由于当前未配置有效的 LLM 服务，系统返回模拟分析结果以测试前端流式显示功能。

要获得真实的 AI 分析，请：
1. 配置有效的 API Key（OpenAI、Anthropic 等）
2. 确保 LiteLLM 服务正常运行并可访问
3. 检查网络连接或代理设置
"""

        # 模拟流式响应
        words = mock_analysis.split()
        for _, word in enumerate(words):
            chunk_data = {"choices": [{"delta": {"content": word + " "}}]}
            yield f"data: {json.dumps(chunk_data)}\n\n"
            await asyncio.sleep(0.05)  # 模拟真实的流式延迟

        # 发送结束标志
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        stream_analysis(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Cache-Control",
        },
    )


@router.post("/{content_id}/analyze-ai-sdk")
async def analyze_content_ai_sdk(
    content_id: str,
    current_user: CurrentUser,
    user_prompt: str = Body(..., description="Analysis instruction/prompt"),
    model: str = Body(
        default="gemini-2.5-flash-preview-05-20", description="Model to use"
    ),
    temperature: float = Body(default=0.7, description="Sampling temperature"),
    max_tokens: int = Body(default=2000, description="Maximum tokens to generate"),
    db: Session = Depends(get_db),
):
    """
    使用 Vercel AI SDK 兼容格式分析内容，同时将对话存储到AIConversation表中
    """
    # Verify content exists and user has access
    content_item = crud_get_content_item(session=db, id=uuid.UUID(content_id))
    if not content_item or content_item.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Content not found")

    # Get the actual content to analyze
    content_to_analyze = content_item.content_text or ""

    # If content_text is empty, try to fetch from storage
    if not content_to_analyze and content_item.processing_status == "completed":
        try:
            from app.utils.storage import get_storage_service

            storage_service = get_storage_service()

            # Look for markdown file in content assets
            for asset in content_item.assets:
                if asset.type == "processed_text" and asset.file_path:
                    try:
                        file_content = storage_service.download_file(asset.file_path)
                        content_to_analyze = file_content.decode("utf-8")
                        break
                    except (FileNotFoundError, Exception) as e:
                        print(f"Failed to download content from storage: {e}")
                        continue
        except Exception as e:
            print(f"Failed to access storage service: {e}")

    # Check if we have content to analyze
    if not content_to_analyze:
        if content_item.processing_status == "failed":
            raise HTTPException(
                status_code=400,
                detail="Content processing failed. Please try reprocessing the content.",
            )
        elif content_item.processing_status in ["pending", "processing"]:
            raise HTTPException(
                status_code=400,
                detail=f"Content is not ready. Status: {content_item.processing_status}. Please wait for processing to complete.",
            )
        else:
            raise HTTPException(
                status_code=400, detail="No content available for analysis."
            )

    # 创建AIConversation记录来存储对话
    ai_conversation = create_ai_conversation(
        db,
        current_user.id,
        uuid.UUID(content_id),
        content_item.title or "内容分析",
        user_prompt,
        content_to_analyze,
        model,
        temperature,
        max_tokens,
    )

    # 使用与 create_ai_conversation 一致的消息结构
    # 系统消息包含文章内容，用户消息包含分析指令
    completion_request = CompletionRequest(
        model=model,
        messages=[
            LLMMessage(role="system", content=content_to_analyze),
            LLMMessage(role="user", content=user_prompt),
        ],
        stream=True,
        temperature=temperature,
        max_tokens=max_tokens,
    )

    # 用于收集完整的AI响应
    full_ai_response = ""

    async def stream_ai_sdk_analysis() -> AsyncGenerator[str, None]:
        """Generate Vercel AI SDK compatible analysis stream"""
        nonlocal full_ai_response

        try:
            import aiohttp

            # LiteLLM 代理配置
            litellm_url = f"{settings.LITELLM_PROXY_URL}/v1/chat/completions"
            headers = {"Content-Type": "application/json"}

            if settings.LITELLM_MASTER_KEY:
                headers["Authorization"] = f"Bearer {settings.LITELLM_MASTER_KEY}"

            payload = completion_request.model_dump(exclude_none=True)

            timeout = aiohttp.ClientTimeout(total=30.0)

            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.post(
                    litellm_url, json=payload, headers=headers
                ) as response:
                    if response.status != 200:
                        # 发送错误响应
                        error_msg = f"LiteLLM error: HTTP {response.status}"
                        yield f'9:[{{"error":"{error_msg}"}}]\n'

                        # 更新AIConversation记录错误信息
                        update_ai_conversation_response(
                            db, ai_conversation, error_msg, "failed"
                        )
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
                                    # 发送完成信号
                                    yield '8:[{"finishReason":"stop"}]\n'

                                    # 更新AIConversation记录
                                    update_ai_conversation_response(
                                        db,
                                        ai_conversation,
                                        full_ai_response,
                                        "completed",
                                    )
                                    return

                                try:
                                    parsed = json.loads(data)

                                    # 检查错误
                                    if "error" in parsed:
                                        error_msg = parsed.get(
                                            "message", "Unknown error"
                                        )
                                        yield f'9:[{{"error":"{error_msg}"}}]\n'

                                        # 更新AIConversation记录错误信息
                                        update_ai_conversation_response(
                                            db, ai_conversation, error_msg, "failed"
                                        )
                                        return

                                    # 提取内容
                                    if (
                                        parsed.get("choices")
                                        and len(parsed["choices"]) > 0
                                        and "delta" in parsed["choices"][0]
                                        and "content" in parsed["choices"][0]["delta"]
                                    ):
                                        content = parsed["choices"][0]["delta"][
                                            "content"
                                        ]
                                        if content:
                                            # 累积完整响应
                                            full_ai_response += content

                                            # 发送文本块 (类型 0) - 正确转义 JSON
                                            import json as json_module

                                            escaped_content = json_module.dumps(content)
                                            yield f"0:{escaped_content}\n"

                                except json.JSONDecodeError:
                                    # 忽略非JSON数据
                                    continue

        except Exception as e:
            # 发送错误信息
            error_msg = str(e).replace('"', '\\"')
            yield f'9:[{{"error":"Stream error: {error_msg}"}}]\n'

            # 更新AIConversation记录错误信息
            update_ai_conversation_response(
                db, ai_conversation, f"Stream error: {str(e)}", "failed"
            )

    return StreamingResponse(
        stream_ai_sdk_analysis(),
        media_type="text/plain",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Cache-Control",
            "X-Vercel-AI-Data-Stream": "v1",  # Vercel AI SDK 要求的头部
        },
    )


@router.post("/{content_id}/completion")
async def content_completion_stream(
    content_id: str,
    current_user: CurrentUser,
    prompt: str = Body(..., description="Analysis prompt"),
    model: str = Body(
        default="gemini-2.5-flash-preview-05-20", description="Model to use"
    ),
    temperature: float = Body(default=0.7, description="Sampling temperature"),
    max_tokens: int = Body(default=2000, description="Maximum tokens to generate"),
    db: Session = Depends(get_db),
):
    """
    Stream content analysis using Vercel AI SDK compatible format，
    同时将对话存储到AIConversation表中

    This endpoint returns pure text streaming for optimal compatibility
    with Vercel AI SDK useCompletion hook.

    Args:
        content_id: ID of the content to analyze
        prompt: The analysis instruction/prompt from user
        model: AI model to use
        temperature: Sampling temperature
        max_tokens: Maximum tokens to generate
    """
    # Verify content exists and user has access
    content_item = crud_get_content_item(session=db, id=uuid.UUID(content_id))
    if not content_item or content_item.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Content not found")

    # Get the actual content to analyze
    content_to_analyze = content_item.content_text or ""

    # If content_text is empty, try to fetch from storage
    if not content_to_analyze and content_item.processing_status == "completed":
        try:
            from app.utils.storage import get_storage_service

            storage_service = get_storage_service()

            # Look for markdown file in content assets
            for asset in content_item.assets:
                if asset.type == "processed_text" and asset.file_path:
                    try:
                        file_content = storage_service.download_file(asset.file_path)
                        content_to_analyze = file_content.decode("utf-8")
                        break
                    except (FileNotFoundError, Exception) as e:
                        print(f"Failed to download content from storage: {e}")
                        continue
        except Exception as e:
            print(f"Failed to access storage service: {e}")

    # Check if we have content to analyze
    if not content_to_analyze:
        if content_item.processing_status == "failed":
            raise HTTPException(
                status_code=400,
                detail="Content processing failed. Please try reprocessing the content.",
            )
        elif content_item.processing_status in ["pending", "processing"]:
            raise HTTPException(
                status_code=400,
                detail=f"Content is not ready. Status: {content_item.processing_status}. Please wait for processing to complete.",
            )
        else:
            raise HTTPException(
                status_code=400, detail="No content available for analysis."
            )

    # 创建AIConversation记录来存储对话
    ai_conversation = create_ai_conversation(
        db,
        current_user.id,
        uuid.UUID(content_id),
        content_item.title or "内容分析",
        prompt,
        content_to_analyze,
        model,
        temperature,
        max_tokens,
    )

    # Prepare the full prompt
    full_prompt = f"{prompt}\n\n以下是要分析的内容：\n{content_to_analyze}"

    # Prepare LiteLLM request
    completion_request = CompletionRequest(
        model=model,
        messages=[LLMMessage(role="user", content=full_prompt)],
        stream=True,
        temperature=temperature,
        max_tokens=max_tokens,
    )

    # 用于收集完整的AI响应
    full_ai_response = ""

    async def stream_pure_text() -> AsyncGenerator[str, None]:
        """Generate pure text stream for Vercel AI SDK"""
        nonlocal full_ai_response

        try:
            import aiohttp

            # LiteLLM 代理配置
            litellm_url = f"{settings.LITELLM_PROXY_URL}/v1/chat/completions"
            headers = {"Content-Type": "application/json"}

            if settings.LITELLM_MASTER_KEY:
                headers["Authorization"] = f"Bearer {settings.LITELLM_MASTER_KEY}"

            payload = completion_request.model_dump(exclude_none=True)

            timeout = aiohttp.ClientTimeout(total=30.0)
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.post(
                    litellm_url, json=payload, headers=headers
                ) as response:
                    if response.status != 200:
                        # 发送错误并结束
                        error_msg = (
                            f"Error: LiteLLM service returned HTTP {response.status}"
                        )
                        yield error_msg

                        # 更新AIConversation记录错误信息
                        update_ai_conversation_response(
                            db, ai_conversation, error_msg, "failed"
                        )
                        return

                    # 处理流式响应，只输出纯文本
                    async for chunk_bytes in response.content.iter_chunked(1024):
                        if not chunk_bytes:
                            continue

                        chunk_str = chunk_bytes.decode("utf-8", errors="ignore")
                        lines = chunk_str.split("\n")

                        for line in lines:
                            if line.startswith("data: "):
                                data = line[6:].strip()

                                if data == "[DONE]":
                                    # 更新AIConversation记录
                                    update_ai_conversation_response(
                                        db,
                                        ai_conversation,
                                        full_ai_response,
                                        "completed",
                                    )
                                    return

                                try:
                                    parsed = json.loads(data)

                                    # 检查错误
                                    if "error" in parsed:
                                        error_msg = f"Error: {parsed.get('message', 'Unknown error')}"
                                        yield error_msg

                                        # 更新AIConversation记录错误信息
                                        update_ai_conversation_response(
                                            db, ai_conversation, error_msg, "failed"
                                        )
                                        return

                                    # 提取内容并直接输出纯文本
                                    if (
                                        parsed.get("choices")
                                        and len(parsed["choices"]) > 0
                                        and "delta" in parsed["choices"][0]
                                        and "content" in parsed["choices"][0]["delta"]
                                    ):
                                        content = parsed["choices"][0]["delta"][
                                            "content"
                                        ]
                                        if content:
                                            # 累积完整响应
                                            full_ai_response += content
                                            # 直接输出纯文本，不加任何格式
                                            yield content

                                except json.JSONDecodeError:
                                    # 忽略非JSON数据
                                    continue

        except Exception as e:
            # 发送错误信息
            error_msg = f"Stream error: {str(e)}"
            yield error_msg

            # 更新AIConversation记录错误信息
            update_ai_conversation_response(db, ai_conversation, error_msg, "failed")

    return StreamingResponse(
        stream_pure_text(),
        media_type="text/plain; charset=utf-8",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Cache-Control",
        },
    )


@router.post("/{content_id}/analyze-ai-sdk-updated")
async def analyze_content_ai_sdk_updated(
    content_id: str,
    current_user: CurrentUser,
    analysis_instruction: str = Body(
        ..., description="Analysis instruction/prompt from user"
    ),
    model: str = Body(
        default="gemini-2.5-flash-preview-05-20", description="Model to use"
    ),
    temperature: float = Body(default=0.7, description="Sampling temperature"),
    max_tokens: int = Body(default=2000, description="Maximum tokens to generate"),
    db: Session = Depends(get_db),
):
    """
    Stream AI analysis with updated prompt structure: system=content, user=instruction.

    This endpoint implements the adjusted LLM logic where:
    - System message contains the article content (provides context)
    - User message contains the analysis instruction (provides task)

    Args:
        content_id: ID of the content to analyze
        analysis_instruction: The analysis instruction from user (user prompt)
        model: AI model to use
        temperature: Sampling temperature
        max_tokens: Maximum tokens to generate
    """
    # Verify content exists and user has access
    content_item = crud_get_content_item(session=db, id=uuid.UUID(content_id))
    if not content_item or content_item.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Content not found")

    # Get the actual content to analyze
    content_to_analyze = content_item.content_text or ""

    # If content_text is empty, try to fetch from storage
    if not content_to_analyze and content_item.processing_status == "completed":
        try:
            from app.utils.storage import get_storage_service

            storage_service = get_storage_service()

            # Look for markdown file in content assets
            for asset in content_item.assets:
                if asset.type == "processed_text" and asset.file_path:
                    try:
                        file_content = storage_service.download_file(asset.file_path)
                        content_to_analyze = file_content.decode("utf-8")
                        break
                    except (FileNotFoundError, Exception) as e:
                        print(f"Failed to download content from storage: {e}")
                        continue
        except Exception as e:
            print(f"Failed to access storage service: {e}")

    # Check if we have content to analyze
    if not content_to_analyze:
        if content_item.processing_status == "failed":
            raise HTTPException(
                status_code=400,
                detail="Content processing failed. Please try reprocessing the content.",
            )
        elif content_item.processing_status in ["pending", "processing"]:
            raise HTTPException(
                status_code=400,
                detail=f"Content is not ready. Status: {content_item.processing_status}. Please wait for processing to complete.",
            )
        else:
            raise HTTPException(
                status_code=400, detail="No content available for analysis."
            )

    # 创建AIConversation记录来存储对话
    ai_conversation = create_ai_conversation(
        db,
        current_user.id,
        uuid.UUID(content_id),
        content_item.title or "内容分析",
        analysis_instruction,
        content_to_analyze,
        model,
        temperature,
        max_tokens,
    )

    # Updated prompt structure: system=content, user=instruction
    completion_request = CompletionRequest(
        model=model,
        messages=[
            LLMMessage(role="system", content=content_to_analyze),
            LLMMessage(role="user", content=analysis_instruction),
        ],
        stream=True,
        temperature=temperature,
        max_tokens=max_tokens,
    )

    # 用于收集完整的AI响应
    full_ai_response = ""

    async def stream_pure_text_updated() -> AsyncGenerator[str, None]:
        """Generate pure text stream for Vercel AI SDK with updated prompt structure"""
        nonlocal full_ai_response

        try:
            import aiohttp

            # LiteLLM 代理配置
            litellm_url = f"{settings.LITELLM_PROXY_URL}/v1/chat/completions"
            headers = {"Content-Type": "application/json"}

            if settings.LITELLM_MASTER_KEY:
                headers["Authorization"] = f"Bearer {settings.LITELLM_MASTER_KEY}"

            payload = completion_request.model_dump(exclude_none=True)

            timeout = aiohttp.ClientTimeout(total=30.0)
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.post(
                    litellm_url, json=payload, headers=headers
                ) as response:
                    if response.status != 200:
                        # 发送错误并结束
                        error_msg = (
                            f"Error: LiteLLM service returned HTTP {response.status}"
                        )
                        yield error_msg

                        # 更新AIConversation记录错误信息
                        update_ai_conversation_response(
                            db, ai_conversation, error_msg, "failed"
                        )
                        return

                    # 处理流式响应，只输出纯文本
                    async for chunk_bytes in response.content.iter_chunked(1024):
                        if not chunk_bytes:
                            continue

                        chunk_str = chunk_bytes.decode("utf-8", errors="ignore")
                        lines = chunk_str.split("\n")

                        for line in lines:
                            if line.startswith("data: "):
                                data = line[6:].strip()

                                if data == "[DONE]":
                                    # 流式响应结束，更新AIConversation记录
                                    update_ai_conversation_response(
                                        db,
                                        ai_conversation,
                                        full_ai_response,
                                        "completed",
                                    )
                                    return

                                try:
                                    parsed = json.loads(data)

                                    # 检查错误
                                    if "error" in parsed:
                                        error_msg = f"Error: {parsed.get('message', 'Unknown error')}"
                                        yield error_msg

                                        # 更新AIConversation记录错误信息
                                        update_ai_conversation_response(
                                            db, ai_conversation, error_msg, "failed"
                                        )
                                        return

                                    # 提取内容并直接输出纯文本
                                    if (
                                        parsed.get("choices")
                                        and len(parsed["choices"]) > 0
                                        and "delta" in parsed["choices"][0]
                                        and "content" in parsed["choices"][0]["delta"]
                                    ):
                                        content = parsed["choices"][0]["delta"][
                                            "content"
                                        ]
                                        if content:
                                            # 累积完整响应
                                            full_ai_response += content
                                            # 直接输出纯文本，不加任何格式
                                            yield content

                                except json.JSONDecodeError:
                                    # 忽略非JSON数据
                                    continue

        except Exception as e:
            # 发送错误信息
            error_msg = f"Stream error: {str(e)}"
            yield error_msg

            # 更新AIConversation记录错误信息
            update_ai_conversation_response(db, ai_conversation, error_msg, "failed")

    return StreamingResponse(
        stream_pure_text_updated(),
        media_type="text/plain; charset=utf-8",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Cache-Control",
        },
    )


@router.post("/{content_id}/completion-updated")
async def content_completion_stream_updated(
    content_id: str,
    current_user: CurrentUser,
    analysis_instruction: str = Body(
        ..., description="Analysis instruction/prompt from user"
    ),
    model: str = Body(
        default="gemini-2.5-flash-preview-05-20", description="Model to use"
    ),
    temperature: float = Body(default=0.7, description="Sampling temperature"),
    max_tokens: int = Body(default=2000, description="Maximum tokens to generate"),
    db: Session = Depends(get_db),
):
    """
    Stream content analysis using updated prompt structure: system=content, user=instruction.
    Compatible with Vercel AI SDK useCompletion hook.

    This endpoint implements the adjusted LLM logic where:
    - System message contains the article content (provides context)
    - User message contains the analysis instruction (provides task)

    Args:
        content_id: ID of the content to analyze
        analysis_instruction: The analysis instruction from user (user prompt)
        model: AI model to use
        temperature: Sampling temperature
        max_tokens: Maximum tokens to generate
    """
    # Verify content exists and user has access
    content_item = crud_get_content_item(session=db, id=uuid.UUID(content_id))
    if not content_item or content_item.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Content not found")

    # Get the actual content to analyze
    content_to_analyze = content_item.content_text or ""

    # If content_text is empty, try to fetch from storage
    if not content_to_analyze and content_item.processing_status == "completed":
        try:
            from app.utils.storage import get_storage_service

            storage_service = get_storage_service()

            # Look for markdown file in content assets
            for asset in content_item.assets:
                if asset.type == "processed_text" and asset.file_path:
                    try:
                        file_content = storage_service.download_file(asset.file_path)
                        content_to_analyze = file_content.decode("utf-8")
                        break
                    except (FileNotFoundError, Exception) as e:
                        print(f"Failed to download content from storage: {e}")
                        continue
        except Exception as e:
            print(f"Failed to access storage service: {e}")

    # Check if we have content to analyze
    if not content_to_analyze:
        if content_item.processing_status == "failed":
            raise HTTPException(
                status_code=400,
                detail="Content processing failed. Please try reprocessing the content.",
            )
        elif content_item.processing_status in ["pending", "processing"]:
            raise HTTPException(
                status_code=400,
                detail=f"Content is not ready. Status: {content_item.processing_status}. Please wait for processing to complete.",
            )
        else:
            raise HTTPException(
                status_code=400, detail="No content available for analysis."
            )

    # 创建AIConversation记录来存储对话
    ai_conversation = create_ai_conversation(
        db,
        current_user.id,
        uuid.UUID(content_id),
        content_item.title or "内容分析",
        analysis_instruction,
        content_to_analyze,
        model,
        temperature,
        max_tokens,
    )

    # Updated prompt structure: system=content, user=instruction
    completion_request = CompletionRequest(
        model=model,
        messages=[
            LLMMessage(role="system", content=content_to_analyze),
            LLMMessage(role="user", content=analysis_instruction),
        ],
        stream=True,
        temperature=temperature,
        max_tokens=max_tokens,
    )

    # 用于收集完整的AI响应
    full_ai_response = ""

    async def stream_pure_text_completion_updated() -> AsyncGenerator[str, None]:
        """Generate pure text stream for Vercel AI SDK with updated prompt structure"""
        nonlocal full_ai_response

        try:
            import aiohttp

            # LiteLLM 代理配置
            litellm_url = f"{settings.LITELLM_PROXY_URL}/v1/chat/completions"
            headers = {"Content-Type": "application/json"}

            if settings.LITELLM_MASTER_KEY:
                headers["Authorization"] = f"Bearer {settings.LITELLM_MASTER_KEY}"

            payload = completion_request.model_dump(exclude_none=True)

            timeout = aiohttp.ClientTimeout(total=30.0)
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.post(
                    litellm_url, json=payload, headers=headers
                ) as response:
                    if response.status != 200:
                        # 发送错误并结束
                        error_msg = (
                            f"Error: LiteLLM service returned HTTP {response.status}"
                        )
                        yield error_msg

                        # 更新AIConversation记录错误信息
                        update_ai_conversation_response(
                            db, ai_conversation, error_msg, "failed"
                        )
                        return

                    # 处理流式响应，只输出纯文本
                    async for chunk_bytes in response.content.iter_chunked(1024):
                        if not chunk_bytes:
                            continue

                        chunk_str = chunk_bytes.decode("utf-8", errors="ignore")
                        lines = chunk_str.split("\n")

                        for line in lines:
                            if line.startswith("data: "):
                                data = line[6:].strip()

                                if data == "[DONE]":
                                    # 流式响应结束，更新AIConversation记录
                                    update_ai_conversation_response(
                                        db,
                                        ai_conversation,
                                        full_ai_response,
                                        "completed",
                                    )
                                    return

                                try:
                                    parsed = json.loads(data)

                                    # 检查错误
                                    if "error" in parsed:
                                        error_msg = f"Error: {parsed.get('message', 'Unknown error')}"
                                        yield error_msg

                                        # 更新AIConversation记录错误信息
                                        update_ai_conversation_response(
                                            db, ai_conversation, error_msg, "failed"
                                        )
                                        return

                                    # 提取内容并直接输出纯文本
                                    if (
                                        parsed.get("choices")
                                        and len(parsed["choices"]) > 0
                                        and "delta" in parsed["choices"][0]
                                        and "content" in parsed["choices"][0]["delta"]
                                    ):
                                        content = parsed["choices"][0]["delta"][
                                            "content"
                                        ]
                                        if content:
                                            # 累积完整响应
                                            full_ai_response += content
                                            # 直接输出纯文本，不加任何格式
                                            yield content

                                except json.JSONDecodeError:
                                    # 忽略非JSON数据
                                    continue

        except Exception as e:
            # 发送错误信息
            error_msg = f"Stream error: {str(e)}"
            yield error_msg

            # 更新AIConversation记录错误信息
            update_ai_conversation_response(db, ai_conversation, error_msg, "failed")

    return StreamingResponse(
        stream_pure_text_completion_updated(),
        media_type="text/plain; charset=utf-8",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Cache-Control",
        },
    )


@router.get(
    "/{id}/processing-jobs",
    summary="Get Content Processing Jobs",
    description="Get all processing jobs and their results for a content item, including AI analysis results.",
)
def get_content_processing_jobs(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
) -> dict[str, Any]:
    """
    Get processing jobs and AI analysis results for a content item.
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

    # Get all processing jobs for this content item
    from app.models.content import ProcessingJob

    processing_jobs = (
        session.query(ProcessingJob)
        .filter(ProcessingJob.content_item_id == id)
        .order_by(ProcessingJob.created_at.desc())
        .all()
    )

    # Format the response
    jobs_data = []
    for job in processing_jobs:
        job_data = {
            "id": str(job.id),
            "processor_name": job.processor_name,
            "status": job.status,
            "started_at": job.started_at.isoformat() if job.started_at else None,
            "completed_at": job.completed_at.isoformat() if job.completed_at else None,
            "error_message": job.error_message,
            "parameters": json.loads(job.parameters) if job.parameters else None,
            "result": json.loads(job.result) if job.result else None,
        }
        jobs_data.append(job_data)

    # Separate AI analysis results for easier access
    ai_analysis = {}
    for job in processing_jobs:
        if (
            job.processor_name in ["summarizer", "key_points_extractor"]
            and job.status == "completed"
            and job.result
        ):
            try:
                result_data = json.loads(job.result)
                ai_analysis[job.processor_name] = result_data.get("analysis_result", {})
            except json.JSONDecodeError:
                continue

    return {
        "content_item_id": str(id),
        "processing_status": item.processing_status,
        "total_jobs": len(jobs_data),
        "jobs": jobs_data,
        "ai_analysis": ai_analysis,
        "summary": {
            "completed_jobs": len([j for j in jobs_data if j["status"] == "completed"]),
            "failed_jobs": len([j for j in jobs_data if j["status"] == "failed"]),
            "in_progress_jobs": len(
                [j for j in jobs_data if j["status"] == "in_progress"]
            ),
        },
    }


# Note: Update and Delete endpoints can be added later if needed


# Content Sharing Endpoints


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
    share_in: ContentShareCreate,
) -> ContentSharePublic:
    """
    Create a new share link for a content item.
    """
    item = crud.get_content_item_sync(session=session, id=id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="ContentItem not found"
        )
    if item.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to share this content item",
        )

    # Ensure content_item_id from path is used, not potentially from body if schema included it
    created_share = crud.create_content_share(
        db=session,
        content_share_in=share_in,
        content_item_id=id,
        _user_id=current_user.id,
    )
    return created_share  # FastAPI will serialize using ContentSharePublic


@router.get(
    "/share/{token}",
    response_model=ContentItemPublic,  # Or a new schema like SharedContentPublic
    summary="Access Shared Content",
    description="Retrieves a content item using a share token. May require a password.",
)
def get_shared_content_endpoint(
    *,
    session: SessionDep,
    token: str = Path(..., description="The unique share token"),
    password: str | None = Query(None, description="Password for protected content"),
) -> ContentItemPublic:  # Change to SharedContentPublic if different fields are needed
    """
    Access shared content item using a token.
    """
    share_record = crud.get_content_share_by_token(db=session, token=token)

    if not share_record or not share_record.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Share link not found or inactive",
        )

    # Check if expired - handle timezone comparison
    current_time = datetime.now(timezone.utc)
    if share_record.expires_at:
        # Convert expires_at to timezone-aware datetime if it's naive
        expires_at = share_record.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)

        if expires_at < current_time:
            crud.deactivate_content_share(db=session, content_share=share_record)
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Share link has expired"
            )

    if share_record.password_hash:
        if not password:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Password required"
            )
        if not security.verify_password(password, share_record.password_hash):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Incorrect password"
            )

    # Check max_access_count before incrementing and fetching content
    if (
        share_record.max_access_count is not None
        and share_record.access_count >= share_record.max_access_count
    ):
        # Deactivate if it wasn't already (e.g. if increment happened elsewhere or exact match)
        if share_record.is_active:
            crud.deactivate_content_share(db=session, content_share=share_record)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Share link access limit reached",
        )

    # Increment access count - this might deactivate the share if limit is reached
    crud.increment_access_count(db=session, content_share=share_record)

    # Get content item before final checks
    content_item = crud.get_content_item_sync(
        session=session, id=share_record.content_item_id
    )
    if not content_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Shared content not found"
        )

    # Return as ContentItemPublic. A more specific SharedContentPublic could be defined
    # if we want to expose different fields for shared content vs owned content.
    # Convert ContentItem to ContentItemPublic
    public_item = ContentItemPublic(
        id=content_item.id,
        user_id=content_item.user_id,
        type=content_item.type,
        source_uri=content_item.source_uri,
        title=content_item.title,
        content_text=content_item.content_text,
        processing_status=content_item.processing_status,
        created_at=content_item.created_at,
        updated_at=content_item.updated_at,
    )

    return public_item


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
):
    """
    Deactivate share link(s) for a content item.
    Currently deactivates all active shares for the item.
    To delete a specific share, an endpoint like /share/{share_id_or_token} would be needed.
    """
    item = crud.get_content_item_sync(session=session, id=id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="ContentItem not found"
        )
    if item.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to modify shares for this content item",
        )

    active_shares = crud.get_content_shares_by_content_id(
        db=session, content_item_id=id
    )
    if not active_shares:
        # Not an error, just nothing to do.
        return status.HTTP_204_NO_CONTENT

    for share in active_shares:
        crud.deactivate_content_share(db=session, content_share=share)

    return status.HTTP_204_NO_CONTENT


print(
    "API routes for ContentItem and ContentShare created in backend/app/api/routes/content.py"
)


def get_ai_analysis_for_content(
    session: Session, content_id: uuid.UUID
) -> dict[str, Any]:
    """
    获取内容项的AI分析结果，优先从AIConversation表获取最新的分析结果
    """
    from sqlmodel import select  # 添加缺失的导入

    from app.models.content import ProcessingJob

    # 首先从AIConversation表获取最新的AI分析结果
    conversations = session.exec(
        select(AIConversation)
        .where(AIConversation.content_item_id == content_id)
        .order_by(AIConversation.created_at.desc())
    ).all()

    ai_analysis = {}

    # 如果有AI对话记录，从中提取分析结果
    if conversations:
        # 为每个对话创建唯一的键，避免覆盖
        for i, conv in enumerate(conversations):
            try:
                # 解析对话消息
                if isinstance(conv.messages, str):
                    messages = json.loads(conv.messages)
                else:
                    messages = conv.messages

                # 解析元信息
                if isinstance(conv.meta_info, str):
                    meta_info = json.loads(conv.meta_info)
                else:
                    meta_info = conv.meta_info or {}

                # 获取AI响应（assistant角色的最后一条消息）
                ai_response = None
                for msg in reversed(messages):
                    if msg.get("role") == "assistant":
                        ai_response = msg.get("content", "")
                        break

                if ai_response:
                    # 根据分析指令判断分析类型
                    user_instruction = ""
                    for msg in messages:
                        if msg.get("role") == "user":
                            user_instruction = msg.get("content", "")
                            break

                    # 判断分析类型
                    user_lower = user_instruction.lower()
                    analysis_type = "custom"  # 默认类型
                    if any(
                        keyword in user_lower for keyword in ["总结", "摘要", "概括"]
                    ):
                        analysis_type = "summarizer"
                    elif any(
                        keyword in user_lower for keyword in ["要点", "关键", "重点"]
                    ):
                        analysis_type = "key_points_extractor"
                    elif any(
                        keyword in user_lower for keyword in ["洞察", "深度", "分析"]
                    ):
                        analysis_type = "insights"
                    elif any(keyword in user_lower for keyword in ["问题", "思考"]):
                        analysis_type = "questions"

                    # 创建唯一的键，如果同一类型有多个分析，添加序号
                    unique_key = analysis_type
                    counter = 1
                    while unique_key in ai_analysis:
                        counter += 1
                        unique_key = f"{analysis_type}_{counter}"

                    ai_analysis[unique_key] = {
                        "analysis_result": ai_response,
                        "raw_text": ai_response,
                        "conversation_id": str(conv.id),
                        "created_at": conv.created_at.isoformat(),
                        "ai_model": conv.ai_model_name,
                        "instruction": user_instruction,
                        "meta_info": meta_info,
                        "analysis_type": analysis_type,  # 保存原始分析类型
                        "sequence": i + 1,  # 序号，最新的是1
                    }

                    # 为了兼容前端，也提供结构化格式
                    if analysis_type == "summarizer":
                        ai_analysis[unique_key]["summary"] = {
                            "main_thesis": ai_response[:300] + "..."
                            if len(ai_response) > 300
                            else ai_response
                        }
                    elif analysis_type == "key_points_extractor":
                        # 尝试从响应中提取要点
                        lines = ai_response.split("\n")
                        key_points = []
                        for line in lines:
                            line = line.strip()
                            if line and (
                                line.startswith("•")
                                or line.startswith("-")
                                or line.startswith("*")
                                or any(line.startswith(f"{i}.") for i in range(1, 10))
                            ):
                                # 清理格式标记
                                clean_point = line.lstrip("•-*").strip()
                                # 移除数字序号
                                for num in range(1, 10):
                                    if clean_point.startswith(f"{num}."):
                                        clean_point = clean_point[2:].strip()
                                        break
                                if (
                                    clean_point and len(clean_point) > 10
                                ):  # 过滤太短的点
                                    key_points.append({"point": clean_point})

                        if key_points:
                            ai_analysis[unique_key]["key_points"] = {
                                "core_concepts": key_points[:5]  # 最多显示5个要点
                            }

            except (json.JSONDecodeError, TypeError, KeyError) as e:
                logger.warning(f"Failed to parse conversation {conv.id}: {e}")
                continue

    # 如果AIConversation表中没有数据，回退到ProcessingJob表（向后兼容）
    if not ai_analysis:
        # 查询AI分析相关的处理任务
        ai_jobs = (
            session.query(ProcessingJob)
            .filter(
                ProcessingJob.content_item_id == content_id,
                ProcessingJob.processor_name.in_(
                    ["summarizer", "key_points_extractor"]
                ),
                ProcessingJob.status == "completed",
            )
            .all()
        )

        for job in ai_jobs:
            if job.result:
                try:
                    # 检查 job.result 的类型，如果已经是字典则直接使用，否则解析 JSON
                    if isinstance(job.result, dict):
                        result_data = job.result
                    elif isinstance(job.result, str):
                        result_data = json.loads(job.result)
                    else:
                        # 尝试将其他类型转换为字符串再解析
                        result_data = json.loads(str(job.result))

                    analysis_result = result_data.get("analysis_result", {})

                    # 处理可能的JSON解析错误，提取raw_response
                    if (
                        isinstance(analysis_result, dict)
                        and "raw_response" in analysis_result
                    ):
                        # 尝试从raw_response中提取结构化数据
                        raw_response = analysis_result["raw_response"]
                        if isinstance(
                            raw_response, str
                        ) and raw_response.strip().startswith("{"):
                            try:
                                # 尝试解析raw_response中的JSON
                                parsed_response = json.loads(
                                    raw_response.replace("```json", "")
                                    .replace("```", "")
                                    .strip()
                                )
                                ai_analysis[job.processor_name] = parsed_response
                            except json.JSONDecodeError:
                                # 如果解析失败，使用原始响应
                                ai_analysis[job.processor_name] = {
                                    "raw_text": raw_response
                                }
                        else:
                            ai_analysis[job.processor_name] = analysis_result
                    else:
                        ai_analysis[job.processor_name] = analysis_result
                except (json.JSONDecodeError, TypeError, AttributeError) as e:
                    # 记录错误但继续处理其他任务
                    print(f"Error processing job result for job {job.id}: {e}")
                    continue

    # 4. 补充 AIResult 中的标签与评分

    ai_result = session.exec(
        select(AIResult).where(AIResult.content_item_id == content_id)
    ).first()

    if ai_result and ai_result.labels:
        # 组装标签提取器结果
        tag_score = None
        if ai_result.content_analysis and isinstance(ai_result.content_analysis, dict):
            tag_score = ai_result.content_analysis.get("tagging_score")

        ai_analysis["tags_extractor"] = {
            "tags": ai_result.labels,
            "score": tag_score,
        }

    return ai_analysis


@router.get(
    "/{content_id}/conversations",
    summary="Get AI Conversations for Content",
    description="获取指定内容项的所有AI对话记录",
)
def get_content_ai_conversations(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    content_id: uuid.UUID,
    skip: int = Query(0, ge=0, description="跳过的记录数"),
    limit: int = Query(50, ge=1, le=100, description="返回的最大记录数"),
) -> dict[str, Any]:
    """
    获取指定内容项的AI对话历史记录
    """
    # 验证内容项存在且用户有权限访问
    content_item = crud_get_content_item(session=session, id=content_id)
    if not content_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Content item not found"
        )

    if content_item.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to access this content item",
        )

    # 查询AI对话记录
    from sqlmodel import select

    statement = (
        select(AIConversation)
        .where(AIConversation.content_item_id == content_id)
        .order_by(AIConversation.created_at.desc())
        .offset(skip)
        .limit(limit)
    )

    conversations = session.exec(statement).all()

    # 转换为字典格式
    conversation_list = []
    for conv in conversations:
        try:
            messages = (
                json.loads(conv.messages)
                if isinstance(conv.messages, str)
                else conv.messages
            )
            meta_info = (
                json.loads(conv.meta_info)
                if isinstance(conv.meta_info, str)
                else conv.meta_info
            )
        except json.JSONDecodeError:
            messages = []
            meta_info = {}

        conversation_list.append(
            {
                "id": str(conv.id),
                "title": conv.title,
                "ai_model_name": conv.ai_model_name,
                "messages": messages,
                "meta_info": meta_info,
                "created_at": conv.created_at.isoformat(),
                "updated_at": conv.updated_at.isoformat(),
            }
        )

    # 获取总数
    count_statement = select(AIConversation).where(
        AIConversation.content_item_id == content_id
    )
    total_count = len(session.exec(count_statement).all())

    return {
        "conversations": conversation_list,
        "total": total_count,
        "skip": skip,
        "limit": limit,
        "has_more": skip + len(conversation_list) < total_count,
    }


@router.get(
    "/conversations/{conversation_id}",
    summary="Get AI Conversation Details",
    description="获取指定AI对话的详细信息",
)
def get_ai_conversation_details(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    conversation_id: uuid.UUID,
) -> dict[str, Any]:
    """
    获取指定AI对话的详细信息
    """
    # 查询对话记录
    from sqlmodel import select

    statement = select(AIConversation).where(AIConversation.id == conversation_id)
    conversation = session.exec(statement).first()

    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found"
        )

    # 验证用户权限
    if conversation.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to access this conversation",
        )

    # 解析JSON字段
    try:
        messages = (
            json.loads(conversation.messages)
            if isinstance(conversation.messages, str)
            else conversation.messages
        )
        meta_info = (
            json.loads(conversation.meta_info)
            if isinstance(conversation.meta_info, str)
            else conversation.meta_info
        )
    except json.JSONDecodeError:
        messages = []
        meta_info = {}

    return {
        "id": str(conversation.id),
        "user_id": str(conversation.user_id),
        "content_item_id": str(conversation.content_item_id)
        if conversation.content_item_id
        else None,
        "title": conversation.title,
        "ai_model_name": conversation.ai_model_name,
        "messages": messages,
        "meta_info": meta_info,
        "created_at": conversation.created_at.isoformat(),
        "updated_at": conversation.updated_at.isoformat(),
    }


@router.post(
    "/reprocess/{id}",
    response_model=ContentItemPublic,
    summary="Reprocess Failed Content Item",
    description="Reprocess a failed content item to retry conversion to Markdown format.",
)
async def reprocess_content_item_endpoint(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
    background_tasks: BackgroundTasks,
) -> ContentItemPublic:
    """
    Reprocess a failed content item.
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

    # Reset status and error message
    item.processing_status = "processing"
    item.error_message = None
    item.content_text = None  # Clear previous content to force reprocessing
    session.add(item)
    session.commit()
    session.refresh(item)

    # Use the new processing pipeline
    pipeline = ProcessingPipeline()

    # Process in background with new pipeline
    background_tasks.add_task(process_content_background_async, pipeline, item, session)

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

    # 通知前端内容重新处理开始
    import asyncio
    import threading

    def send_reprocess_notification():
        """在新线程中发送重新处理通知"""
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)

            loop.run_until_complete(
                content_event_manager.notify_content_status(
                    user_id=str(current_user.id),
                    content_id=str(item.id),
                    status="processing",
                    title=item.title,
                    progress=0,
                )
            )
        except Exception as e:
            print(f"Failed to send reprocess notification: {e}")
        finally:
            loop.close()

    threading.Thread(target=send_reprocess_notification, daemon=True).start()

    return public_item


# --- Compatibility alias for older front-end "analyze-stream" endpoint ---
@router.post("/{content_id}/analyze-stream", include_in_schema=False)
async def analyze_content_stream_alias(
    content_id: str,
    current_user: CurrentUser,
    analysis_instruction: str = Body(..., description="分析指令"),
    article_content: str = Body(..., description="文章内容"),
    db: Session = Depends(get_db),
):
    """Alias of /{content_id}/analyze keeping old path used by frontend."""
    return await analyze_content_stream(
        content_id=content_id,
        current_user=current_user,
        analysis_instruction=analysis_instruction,
        article_content=article_content,
        db=db,
    )


@router.get(
    "/{id}/analyze/stream",
    summary="Stream Content Analysis",
    description="Stream AI analysis of content (summary or key points) with real-time output.",
)
async def stream_content_analysis(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
    analysis_type: Literal["summary", "key_points"] = Query(
        default="summary", description="Type of analysis to perform"
    ),
):
    """
    流式内容分析接口

    支持的分析类型：
    - summary: 生成内容摘要
    - key_points: 提取关键要点

    返回Server-Sent Events格式的流式数据
    """
    # 获取内容项
    content_item = session.get(ContentItem, id)
    if not content_item:
        raise HTTPException(status_code=404, error="ContentItem not found")

    # 检查权限
    if content_item.user_id != current_user.id:
        raise HTTPException(status_code=403, error="Not enough permissions")

    # 检查内容是否已处理
    if not content_item.content_text:
        raise HTTPException(
            status_code=400,
            error="Content not yet processed. Please process the content first.",
        )

    # 创建流式处理器
    processor = StreamingAIProcessor()

    async def generate_stream():
        """生成流式响应"""
        try:
            async for chunk in processor.process_streaming(
                content_item, analysis_type, session
            ):
                # 按照Server-Sent Events格式输出
                yield f"data: {chunk.to_json()}\n\n"

        except Exception as e:
            # 发送错误信息
            error_chunk = StreamChunk(
                type="error",
                content=str(e),
                finished=True,
                metadata={"error_type": "stream_error"},
            )
            yield f"data: {error_chunk.to_json()}\n\n"
        finally:
            # 发送结束信号
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        generate_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Cache-Control",
        },
    )


@router.get(
    "/{id}/summary/stream",
    summary="Stream Content Summary",
    description="Generate streaming summary for content with real-time output.",
)
async def stream_content_summary(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
):
    """
    流式摘要生成接口
    专门用于生成内容摘要的流式API
    """
    # 获取内容项
    content_item = session.get(ContentItem, id)
    if not content_item:
        raise HTTPException(status_code=404, error="ContentItem not found")

    # 检查权限
    if content_item.user_id != current_user.id:
        raise HTTPException(status_code=403, error="Not enough permissions")

    # 检查内容是否已处理
    if not content_item.content_text:
        raise HTTPException(
            status_code=400,
            error="Content not yet processed. Please process the content first.",
        )

    # 创建流式摘要处理器
    processor = StreamingSummaryProcessor()

    async def generate_summary_stream():
        """生成摘要流式响应"""
        try:
            async for chunk in processor.generate_summary_stream(content_item, session):
                yield f"data: {chunk.to_json()}\n\n"

        except Exception as e:
            error_chunk = StreamChunk(
                type="error",
                content=str(e),
                finished=True,
                metadata={"error_type": "summary_error"},
            )
            yield f"data: {error_chunk.to_json()}\n\n"
        finally:
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        generate_summary_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Cache-Control",
        },
    )


@router.get(
    "/{id}/key-points/stream",
    summary="Stream Key Points Extraction",
    description="Extract key points from content with real-time streaming output.",
)
async def stream_content_key_points(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
):
    """
    流式关键要点提取接口
    专门用于提取内容关键要点的流式API
    """
    # 获取内容项
    content_item = session.get(ContentItem, id)
    if not content_item:
        raise HTTPException(status_code=404, error="ContentItem not found")

    # 检查权限
    if content_item.user_id != current_user.id:
        raise HTTPException(status_code=403, error="Not enough permissions")

    # 检查内容是否已处理
    if not content_item.content_text:
        raise HTTPException(
            status_code=400,
            error="Content not yet processed. Please process the content first.",
        )

    # 创建流式关键要点处理器
    processor = StreamingKeyPointsProcessor()

    async def generate_key_points_stream():
        """生成关键要点流式响应"""
        try:
            async for chunk in processor.generate_key_points_stream(
                content_item, session
            ):
                yield f"data: {chunk.to_json()}\n\n"

        except Exception as e:
            error_chunk = StreamChunk(
                type="error",
                content=str(e),
                finished=True,
                metadata={"error_type": "key_points_error"},
            )
            yield f"data: {error_chunk.to_json()}\n\n"
        finally:
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        generate_key_points_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Cache-Control",
        },
    )


# ----------------------------------------
# Helper utilities
# ----------------------------------------


def _extract_title_from_content(content: str | None) -> str:
    """Extract a reasonable title from the raw content.

    Priority:
    1. First Markdown heading (lines starting with "#")
    2. First non-empty line (trimmed)
    3. Fallback to "Untitled Content"
    """

    if not content:
        return "Untitled Content"

    lines = content.strip().splitlines()

    # Search for markdown heading
    heading_pattern = re.compile(r"^\s*#+\s+(.*)$")
    for line in lines:
        m = heading_pattern.match(line)
        if m:
            title = m.group(1).strip()
            if title:
                return title[:150]

    # Fallback to first non-empty line
    for line in lines:
        stripped = line.strip()
        if stripped:
            return stripped[:150]

    return "Untitled Content"


@router.post(
    "/{content_item_id}/favorite",
    response_model=FavoriteStatusResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add Content Item to Favorites",
    description="Add a content item to user's favorites.",
)
def add_favorite_to_content(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    content_item_id: uuid.UUID,
) -> FavoriteStatusResponse:
    """Add content item to favorites."""
    # Check if content item exists
    content_item = crud.get_content_item_sync(session=session, id=content_item_id)

    if not content_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Content item not found"
        )

    # Verify that the user owns the content item
    if content_item.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not have permission to favorite this content item",
        )

    # Check if already favorited
    existing_favorite = get_favorite(
        session=session, user_id=current_user.id, content_item_id=content_item_id
    )
    if existing_favorite:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Content item already in favorites",
        )

    # Create favorite
    create_favorite(
        session=session, user_id=current_user.id, content_item_id=content_item_id
    )

    return FavoriteStatusResponse(status="ok")


@router.delete(
    "/{content_item_id}/favorite",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove Content Item from Favorites",
    description="Remove a content item from user's favorites.",
)
def remove_favorite_from_content(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    content_item_id: uuid.UUID,
):
    """Remove content item from favorites."""
    success = delete_favorite(
        session=session, user_id=current_user.id, content_item_id=content_item_id
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Favorite not found"
        )


@router.delete(
    "/{id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Content Item",
    description="Deletes a content item and all related assets. Requires ownership.",
)
def delete_content_item_endpoint(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
):
    """Delete a content item by its ID (only owner allowed)."""
    item = crud.get_content_item_sync(session=session, id=id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="ContentItem not found"
        )

    # Ensure the current user owns the item
    if item.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to delete this content item",
        )

    crud.delete_content_item_sync(session=session, id=id)

    # No content to return for 204 response
    return Response(status_code=status.HTTP_204_NO_CONTENT)
