import uuid

from fastapi import APIRouter, HTTPException, Path, Query

from app.api.deps import CurrentUser, SessionDep
from app.crud import crud_content
from app.crud.crud_favorite import (
    delete_favorite,
    get_user_favorite_blocks,
    get_user_favorite_content_ids,
    get_user_favorites,
    update_favorite,
)
from app.schemas.content import ContentItemPublic
from app.schemas.favorite import (
    FavoriteBlockListResponse,
    FavoriteBlockWithContent,
    FavoriteListResponse,
    FavoriteUpdate,
    FavoriteWithContent,
)

router = APIRouter()


@router.get(
    "/",
    response_model=FavoriteListResponse,
    summary="Get User's Favorites",
    description="Get user's favorite content items and blocks with pagination and filtering.",
)
def get_favorites_endpoint(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(
        100, ge=1, le=200, description="Maximum number of items to return"
    ),
    block_only: bool = Query(False, description="Only return block-level favorites"),
    content_only: bool = Query(
        False, description="Only return content-level favorites"
    ),
) -> FavoriteListResponse:
    """Get user's favorites with filtering options."""
    favorites, total = get_user_favorites(
        session=session,
        user_id=current_user.id,
        skip=skip,
        limit=limit,
        block_only=block_only,
        content_only=content_only,
    )

    # Get content items for each favorite
    items = []
    for favorite in favorites:
        content_item = crud_content.get_content_item_sync(
            session=session, id=favorite.content_item_id
        )
        if content_item:
            # Check ownership for security, though favorites should imply this
            if content_item.user_id == current_user.id:
                # Create FavoriteWithContent with all new fields
                favorite_with_content = FavoriteWithContent(
                    id=favorite.id,
                    user_id=favorite.user_id,
                    content_item_id=favorite.content_item_id,
                    block_id=favorite.block_id,
                    block_type=favorite.block_type,
                    block_content=favorite.block_content,
                    title=favorite.title,
                    description=favorite.description,
                    tags=favorite.tags,
                    created_at=favorite.created_at,
                    content_item=ContentItemPublic.model_validate(content_item),
                )
                items.append(favorite_with_content)

    return FavoriteListResponse(items=items, total=total, skip=skip, limit=limit)


@router.get(
    "/blocks",
    response_model=FavoriteBlockListResponse,
    summary="Get User's Block Favorites",
    description="Get user's block-level favorites with pagination.",
)
def get_block_favorites_endpoint(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(
        100, ge=1, le=200, description="Maximum number of items to return"
    ),
    content_item_id: uuid.UUID | None = Query(
        None, description="Filter by content item ID"
    ),
) -> FavoriteBlockListResponse:
    """Get user's block-level favorites."""
    favorites, total = get_user_favorite_blocks(
        session=session,
        user_id=current_user.id,
        content_item_id=content_item_id,
        skip=skip,
        limit=limit,
    )

    # Get content items for each favorite
    items = []
    for favorite in favorites:
        content_item = crud_content.get_content_item_sync(
            session=session, id=favorite.content_item_id
        )
        if content_item:
            # Check ownership for security
            if content_item.user_id == current_user.id:
                favorite_block = FavoriteBlockWithContent(
                    id=favorite.id,
                    user_id=favorite.user_id,
                    content_item_id=favorite.content_item_id,
                    block_id=favorite.block_id,
                    block_type=favorite.block_type,
                    block_content=favorite.block_content,
                    title=favorite.title,
                    description=favorite.description,
                    tags=favorite.tags,
                    created_at=favorite.created_at,
                    display_title=favorite.get_display_title(),
                    display_description=favorite.get_display_description(),
                    content_item=ContentItemPublic.model_validate(content_item),
                )
                items.append(favorite_block)

    return FavoriteBlockListResponse(items=items, total=total, skip=skip, limit=limit)


@router.put(
    "/{favorite_id}",
    response_model=dict,
    summary="Update Favorite",
    description="Update a favorite's metadata like title, description, and tags.",
)
def update_favorite_endpoint(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    favorite_id: uuid.UUID = Path(..., description="Favorite ID to update"),
    favorite_update: FavoriteUpdate,
) -> dict:
    """Update favorite metadata."""
    favorite = update_favorite(
        session=session,
        favorite_id=favorite_id,
        user_id=current_user.id,
        title=favorite_update.title,
        description=favorite_update.description,
        tags=favorite_update.tags,
    )

    if not favorite:
        raise HTTPException(
            status_code=404,
            detail="Favorite not found or you don't have permission to update it",
        )

    return {"status": "ok", "message": "Favorite updated successfully"}


@router.delete(
    "/{favorite_id}",
    status_code=204,
    summary="Delete Favorite",
    description="Delete a specific favorite by ID.",
)
def delete_favorite_endpoint(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    favorite_id: uuid.UUID = Path(..., description="Favorite ID to delete"),
) -> None:
    """Delete a favorite by ID."""
    # First get the favorite to check ownership and get content details
    from sqlmodel import select

    from app.models.favorite import Favorite

    statement = select(Favorite).where(
        Favorite.id == favorite_id, Favorite.user_id == current_user.id
    )
    favorite = session.exec(statement).first()

    if not favorite:
        raise HTTPException(
            status_code=404,
            detail="Favorite not found or you don't have permission to delete it",
        )

    # Delete the favorite
    success = delete_favorite(
        session=session,
        user_id=current_user.id,
        content_item_id=favorite.content_item_id,
        block_id=favorite.block_id,
    )

    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete favorite")


@router.get(
    "/content-ids",
    response_model=list[str],
    summary="Get User's Favorite Content IDs",
    description="Get list of content item IDs that user has favorited (backward compatibility).",
)
def get_favorite_content_ids_endpoint(
    *,
    session: SessionDep,
    current_user: CurrentUser,
) -> list[str]:
    """Get user's favorite content IDs."""
    content_ids = get_user_favorite_content_ids(
        session=session, user_id=current_user.id
    )
    return [str(id) for id in content_ids]
