import uuid

from sqlmodel import Session, and_, select

from app.models.favorite import Favorite


def get_favorite(
    session: Session, user_id: uuid.UUID, content_item_id: uuid.UUID
) -> Favorite | None:
    """Get a specific favorite by user and content item."""
    statement = select(Favorite).where(
        and_(Favorite.user_id == user_id, Favorite.content_item_id == content_item_id)
    )
    return session.exec(statement).first()


def create_favorite(
    session: Session, user_id: uuid.UUID, content_item_id: uuid.UUID
) -> Favorite:
    """Create a new favorite."""
    favorite = Favorite(user_id=user_id, content_item_id=content_item_id)
    session.add(favorite)
    session.commit()
    session.refresh(favorite)
    return favorite


def delete_favorite(
    session: Session, user_id: uuid.UUID, content_item_id: uuid.UUID
) -> bool:
    """Delete a favorite. Returns True if deleted, False if not found."""
    favorite = get_favorite(session, user_id, content_item_id)
    if favorite:
        session.delete(favorite)
        session.commit()
        return True
    return False


def get_user_favorites(
    session: Session, user_id: uuid.UUID, skip: int = 0, limit: int = 100
) -> tuple[list[Favorite], int]:
    """Get user's favorites with pagination."""
    # Get total count
    count_statement = select(Favorite).where(Favorite.user_id == user_id)
    total = len(session.exec(count_statement).all())

    # Get paginated results with content items
    statement = (
        select(Favorite)
        .where(Favorite.user_id == user_id)
        .offset(skip)
        .limit(limit)
        .order_by(Favorite.created_at.desc())
    )

    favorites = session.exec(statement).all()
    return favorites, total


def get_user_favorite_content_ids(
    session: Session, user_id: uuid.UUID
) -> list[uuid.UUID]:
    """Get list of content item IDs that user has favorited."""
    statement = select(Favorite.content_item_id).where(Favorite.user_id == user_id)
    return list(session.exec(statement).all())
