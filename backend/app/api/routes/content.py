import json
import logging
import uuid
from collections.abc import AsyncGenerator
from datetime import datetime, timezone
from typing import Any  # Added Optional

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Body,
    Depends,
    HTTPException,
    Path,  # Added Path
    Query,
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
from app.models.content import (
    ContentItem,  # For converting ContentItemCreate to ContentItem model for CRUD
)
from app.schemas.content import (  # Re-using ContentItemBaseSchema if public is just base + id and audit fields
    ContentItemCreate,
    ContentItemPublic,
    ContentShareCreate,
    ContentSharePublic,
)
from app.schemas.llm import CompletionRequest, LLMMessage
from app.utils.background_tasks import background_task_manager
from app.utils.content_processors import ProcessingPipeline
from app.utils.events import content_event_manager, create_sse_generator

router = APIRouter()
logger = logging.getLogger(__name__)


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
        summary=created_item.summary,
        content_text=created_item.content_text,
        processing_status=created_item.processing_status,
        created_at=created_item.created_at,
        updated_at=created_item.updated_at,
    )

    # 通知前端新内容已创建
    import asyncio

    try:
        loop = asyncio.get_event_loop()
        loop.create_task(
            content_event_manager.notify_content_created(
                user_id=str(current_user.id), content_item=public_item.model_dump()
            )
        )
    except Exception as e:
        # 不影响主流程，只记录错误
        print(f"Failed to send SSE notification: {e}")

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
            summary=item.summary,
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
        summary=item.summary,
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
            # Store the processed markdown content
            content_item.content_text = result.markdown_content
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

    # Convert ContentItem objects to ContentItemPublic objects with AI analysis
    public_items = []
    for item in items:
        # 获取AI分析结果
        ai_analysis = get_ai_analysis_for_content(session, item.id)

        public_item = ContentItemPublic(
            id=item.id,
            user_id=item.user_id,
            type=item.type,
            source_uri=item.source_uri,
            title=item.title,
            summary=item.summary,
            content_text=item.content_text,
            processing_status=item.processing_status,
            created_at=item.created_at,
            updated_at=item.updated_at,
            ai_analysis=ai_analysis if ai_analysis else None,
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

    # Convert ContentItem to ContentItemPublic
    public_item = ContentItemPublic(
        id=item.id,
        user_id=item.user_id,
        type=item.type,
        source_uri=item.source_uri,
        title=item.title,
        summary=item.summary,
        content_text=item.content_text,
        processing_status=item.processing_status,
        created_at=item.created_at,
        updated_at=item.updated_at,
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
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Content processing failed. Please try reprocessing the content.",
            )
        elif item.processing_status in ["pending", "processing"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Content is not ready. Status: {item.processing_status}. Please wait for processing to complete.",
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"No markdown content available. Status: {item.processing_status}",
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
                "index": chunk.chunk_index,
                "content": chunk.chunk_content,
                "type": chunk.chunk_type,
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
    system_prompt: str = Body(..., description="System prompt for analysis"),
    user_prompt: str = Body(..., description="User prompt (content text)"),
    db: Session = Depends(get_db),
):
    """
    Stream AI analysis of content using LiteLLM.

    Args:
        content_id: ID of the content to analyze
        system_prompt: System prompt (e.g., prompt template)
        user_prompt: User prompt (the actual content text)
        current_user: Current authenticated user
        db: Database session

    Returns:
        StreamingResponse: Server-sent events with analysis chunks
    """
    # Verify content exists and user has access
    content_item = crud_get_content_item(session=db, id=uuid.UUID(content_id))
    if not content_item or content_item.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Content not found")

    # Prepare LiteLLM request
    completion_request = CompletionRequest(
        model="github-llama-3-2-11b-vision",  # 暂时使用一个健康的模型进行测试
        messages=[
            LLMMessage(role="system", content=system_prompt),
            LLMMessage(role="user", content=user_prompt),
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
                        async for chunk in _send_mock_analysis_response(system_prompt):
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
            async for chunk in _send_mock_analysis_response(system_prompt):
                yield chunk

    async def _send_mock_analysis_response(
        system_prompt: str,
    ) -> AsyncGenerator[str, None]:
        """发送模拟的分析响应（当LiteLLM不可用时）"""
        import asyncio

        mock_analysis = f"""基于提示"{system_prompt}"对内容的分析：

这是一个AI分析的模拟响应。当前LiteLLM服务不可用或配置不完整，因此显示此模拟结果。

内容要点：
• 这是对用户提供内容的分析
• 当前系统检测到LiteLLM服务连接问题
• 建议检查API密钥配置和服务状态

要获得真实的AI分析，请：
1. 配置有效的API密钥（OpenAI、GitHub等）
2. 确保LiteLLM服务正常运行
3. 检查网络连接状态

注意：这是一个模拟响应，用于测试前端流式显示功能。"""

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
    model: str = Body(default="gemini-2.5-flash-preview-05-20", description="Model to use"),
    temperature: float = Body(default=0.7, description="Sampling temperature"),
    max_tokens: int = Body(default=2000, description="Maximum tokens to generate"),
    db: Session = Depends(get_db),
):
    """
    Stream AI analysis of content using Vercel AI SDK compatible format.

    This endpoint provides Data Stream Protocol compatible responses for
    seamless integration with Vercel AI SDK useCompletion hook.

    Args:
        content_id: ID of the content to analyze
        user_prompt: The analysis instruction/prompt from user
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

    # Prepare the prompt (instruction first, then content)
    full_prompt = f"{user_prompt}\n\n以下是要分析的内容：\n{content_to_analyze}"

    # Prepare LiteLLM request
    completion_request = CompletionRequest(
        model=model,
        messages=[LLMMessage(role="user", content=full_prompt)],
        stream=True,
        temperature=temperature,
        max_tokens=max_tokens,
    )

    async def stream_ai_sdk_analysis() -> AsyncGenerator[str, None]:
        """Generate Vercel AI SDK compatible analysis stream"""
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
                        return

                    # 处理流式响应
                    accumulated_content = ""

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
                                    return

                                try:
                                    parsed = json.loads(data)

                                    # 检查错误
                                    if "error" in parsed:
                                        yield f'9:[{{"error":"{parsed.get("message", "Unknown error")}"}}]\n'
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
                                            accumulated_content += content

                                            # 发送文本块 (类型 0)
                                            yield f'0:"{content}"\n'

                                except json.JSONDecodeError:
                                    # 忽略非JSON数据
                                    continue

                    # 确保发送完成信号
                    if accumulated_content:
                        yield '8:[{"finishReason":"stop"}]\n'

        except Exception as e:
            # 发送错误信息
            error_msg = str(e).replace('"', '\\"')
            yield f'9:[{{"error":"Stream error: {error_msg}"}}]\n'

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
    model: str = Body(default="gemini-2.5-flash-preview-05-20", description="Model to use"),
    temperature: float = Body(default=0.7, description="Sampling temperature"),
    max_tokens: int = Body(default=2000, description="Maximum tokens to generate"),
    db: Session = Depends(get_db),
):
    """
    Stream content analysis using Vercel AI SDK compatible format.

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

    async def stream_pure_text() -> AsyncGenerator[str, None]:
        """Generate pure text stream for Vercel AI SDK"""
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
                        yield f"Error: LiteLLM service returned HTTP {response.status}"
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
                                    return

                                try:
                                    parsed = json.loads(data)

                                    # 检查错误
                                    if "error" in parsed:
                                        yield f"Error: {parsed.get('message', 'Unknown error')}"
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
                                            # 直接输出纯文本，不加任何格式
                                            yield content

                                except json.JSONDecodeError:
                                    # 忽略非JSON数据
                                    continue

        except Exception as e:
            # 发送错误信息
            yield f"Stream error: {str(e)}"

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
    model: str = Body(default="gemini-2.5-flash-preview-05-20", description="Model to use"),
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

    async def stream_ai_sdk_analysis_updated() -> AsyncGenerator[str, None]:
        """Generate Vercel AI SDK compatible analysis stream with updated prompt structure"""
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
                        return

                    # 处理流式响应
                    accumulated_content = ""

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
                                    return

                                try:
                                    parsed = json.loads(data)

                                    # 检查错误
                                    if "error" in parsed:
                                        yield f'9:[{{"error":"{parsed.get("message", "Unknown error")}"}}]\n'
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
                                            accumulated_content += content

                                            # 发送文本块 (类型 0)
                                            yield f'0:"{content}"\n'

                                except json.JSONDecodeError:
                                    # 忽略非JSON数据
                                    continue

                    # 确保发送完成信号
                    if accumulated_content:
                        yield '8:[{"finishReason":"stop"}]\n'

        except Exception as e:
            # 发送错误信息
            error_msg = str(e).replace('"', '\\"')
            yield f'9:[{{"error":"Stream error: {error_msg}"}}]\n'

    return StreamingResponse(
        stream_ai_sdk_analysis_updated(),
        media_type="text/plain",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Cache-Control",
            "X-Vercel-AI-Data-Stream": "v1",  # Vercel AI SDK 要求的头部
        },
    )


@router.post("/{content_id}/completion-updated")
async def content_completion_stream_updated(
    content_id: str,
    current_user: CurrentUser,
    analysis_instruction: str = Body(
        ..., description="Analysis instruction/prompt from user"
    ),
    model: str = Body(default="gemini-2.5-flash-preview-05-20", description="Model to use"),
    temperature: float = Body(default=0.7, description="Sampling temperature"),
    max_tokens: int = Body(default=2000, description="Maximum tokens to generate"),
    db: Session = Depends(get_db),
):
    """
    Stream content analysis with updated prompt structure: system=content, user=instruction.

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

    async def stream_pure_text_updated() -> AsyncGenerator[str, None]:
        """Generate pure text stream for Vercel AI SDK with updated prompt structure"""
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
                        yield f"Error: LiteLLM service returned HTTP {response.status}"
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
                                    return

                                try:
                                    parsed = json.loads(data)

                                    # 检查错误
                                    if "error" in parsed:
                                        yield f"Error: {parsed.get('message', 'Unknown error')}"
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
                                            # 直接输出纯文本，不加任何格式
                                            yield content

                                except json.JSONDecodeError:
                                    # 忽略非JSON数据
                                    continue

        except Exception as e:
            # 发送错误信息
            yield f"Stream error: {str(e)}"

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
        summary=content_item.summary,
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
    获取内容项的AI分析结果
    """
    from app.models.content import ProcessingJob

    # 查询AI分析相关的处理任务
    ai_jobs = (
        session.query(ProcessingJob)
        .filter(
            ProcessingJob.content_item_id == content_id,
            ProcessingJob.processor_name.in_(["summarizer", "key_points_extractor"]),
            ProcessingJob.status == "completed",
        )
        .all()
    )

    ai_analysis = {}
    for job in ai_jobs:
        if job.result:
            try:
                result_data = json.loads(job.result)
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
                            ai_analysis[job.processor_name] = {"raw_text": raw_response}
                    else:
                        ai_analysis[job.processor_name] = analysis_result
                else:
                    ai_analysis[job.processor_name] = analysis_result
            except json.JSONDecodeError:
                continue

    return ai_analysis
