from fastapi import APIRouter, Query

from app.api.deps import CurrentUser, SessionDep
from app.crud import crud_content
from app.crud.crud_favorite import (
    get_user_favorite_content_ids,
    get_user_favorites,
)
from app.schemas.content import ContentItemPublic
from app.schemas.favorite import (
    FavoriteListResponse,
    FavoriteWithContent,
)

router = APIRouter()


@router.get(
    "/",
    response_model=FavoriteListResponse,
    summary="Get User's Favorites",
    description="Get user's favorite content items with pagination.",
)
def get_favorites_endpoint(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(
        100, ge=1, le=200, description="Maximum number of items to return"
    ),
) -> FavoriteListResponse:
    """Get user's favorites."""
    favorites, total = get_user_favorites(
        session=session, user_id=current_user.id, skip=skip, limit=limit
    )

    # Get content items for each favorite
    items = []
    for favorite in favorites:
        content_item = crud_content.get_content_item_sync(
            session=session,
            content_item_id=favorite.content_item_id,
            user_id=current_user.id,
        )
        if content_item:
            items.append(
                FavoriteWithContent(
                    id=favorite.id,
                    user_id=favorite.user_id,
                    content_item_id=favorite.content_item_id,
                    created_at=favorite.created_at,
                    content_item=ContentItemPublic.model_validate(content_item),
                )
            )

    return FavoriteListResponse(items=items, total=total, skip=skip, limit=limit)


@router.get(
    "/content-ids",
    response_model=list[str],
    summary="Get User's Favorite Content IDs",
    description="Get list of content item IDs that user has favorited.",
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
