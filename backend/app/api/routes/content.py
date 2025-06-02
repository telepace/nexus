import json
import uuid
from collections.abc import AsyncGenerator
from datetime import datetime  # For checking expiration
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

from app.api.deps import CurrentUser, SessionDep, get_current_user, get_db
from app.base import User
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
from app.utils.content_processors import ContentProcessorFactory

router = APIRouter()


@router.post(
    "/create",
    response_model=ContentItemPublic,
    status_code=status.HTTP_201_CREATED,
    summary="Create a New Content Item",
    description="Uploads and creates a new content item in the system. Requires user authentication.",
)
def create_content_item_endpoint(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    content_in: ContentItemCreate,
) -> ContentItem:
    """
    Create new content item.
    """
    # Set the user_id from the authenticated user
    content_item_data = content_in.model_dump()
    content_item_data["user_id"] = current_user.id

    # Create a ContentItem model instance
    db_content_item = ContentItem(**content_item_data)

    # The CRUD function will handle adding to session, commit, refresh
    created_item = crud_create_content_item(
        session=session, content_item_in=db_content_item
    )
    return created_item


@router.post(
    "/process/{id}",
    response_model=ContentItemPublic,
    summary="Process Content Item",
    description="Process a content item to convert it to Markdown format using appropriate processor.",
)
def process_content_item_endpoint(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
    background_tasks: BackgroundTasks,
) -> ContentItem:
    """
    Process content item to convert to Markdown format.
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
        return item

    # Get appropriate processor
    try:
        processor = ContentProcessorFactory.get_processor(item.type)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    # Process in background
    background_tasks.add_task(process_content_background, processor, item, session)

    # Update status to processing
    item.processing_status = "processing"
    session.add(item)
    session.commit()
    session.refresh(item)

    return item


def process_content_background(processor, content_item: ContentItem, session):
    """Background task to process content."""
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
) -> list[ContentItem]:
    """
    Retrieve content items for the current user.
    """
    # Filter by current user's ID for security
    items = crud_get_content_items(
        session=session, skip=skip, limit=limit, user_id=current_user.id
    )
    return list(items)  # FastAPI will serialize using ContentItemPublic


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
) -> ContentItem:
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

    return item


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
    system_prompt: str = Body(..., description="System prompt for analysis"),
    user_prompt: str = Body(..., description="User prompt (content text)"),
    current_user: User = Depends(get_current_user),
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
            timeout = aiohttp.ClientTimeout(total=300.0)
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.post(
                    litellm_url, json=payload, headers=headers
                ) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        error_data = {
                            "error": True,
                            "message": f"LiteLLM service error: HTTP {response.status}",
                            "status_code": response.status,
                            "details": error_text,
                        }
                        yield f"data: {json.dumps(error_data)}\n\n"
                        return

                    # Stream the response
                    async for chunk in response.content.iter_chunked(1024):
                        if chunk:
                            # Forward the chunk as-is (LiteLLM sends SSE format)
                            yield chunk.decode("utf-8", errors="ignore")

        except Exception as e:
            # Handle unexpected errors
            error_data = {
                "error": True,
                "message": f"Unexpected error: {str(e)}",
                "status_code": 500,
            }
            yield f"data: {json.dumps(error_data)}\n\n"

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
        user_id=current_user.id,
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

    if share_record.expires_at and share_record.expires_at < datetime.utcnow():
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
    # Note: This is a slight deviation from prompt order to fail fast if already over limit
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

    updated_share_record = crud.increment_access_count(
        db=session, content_share=share_record
    )
    # Check again if incrementing pushed it over the limit and deactivated it
    if not updated_share_record.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Share link access limit reached and deactivated",
        )

    content_item = crud.get_content_item_sync(
        session=session, id=share_record.content_item_id
    )
    if not content_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Shared content not found"
        )

    # Return as ContentItemPublic. A more specific SharedContentPublic could be defined
    # if we want to expose different fields for shared content vs owned content.
    return content_item


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
