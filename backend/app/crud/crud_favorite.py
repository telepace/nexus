import uuid

from sqlmodel import Session, and_, func, select

from app.models.favorite import Favorite


def get_favorite(
    session: Session,
    user_id: uuid.UUID,
    content_item_id: uuid.UUID,
    block_id: str | None = None
) -> Favorite | None:
    """Get a specific favorite by user, content item, and optionally block."""
    conditions = [
        Favorite.user_id == user_id,
        Favorite.content_item_id == content_item_id
    ]

    if block_id is not None:
        conditions.append(Favorite.block_id == block_id)
    else:
        conditions.append(Favorite.block_id.is_(None))

    statement = select(Favorite).where(and_(*conditions))
    return session.exec(statement).first()


def create_favorite(
    session: Session,
    user_id: uuid.UUID,
    content_item_id: uuid.UUID,
    block_id: str | None = None,
    block_type: str | None = None,
    block_content: dict | None = None,
    title: str | None = None,
    description: str | None = None,
    tags: list[str] | None = None
) -> Favorite:
    """Create a new favorite (content or block level)."""
    favorite = Favorite(
        user_id=user_id,
        content_item_id=content_item_id,
        block_id=block_id,
        block_type=block_type,
        block_content=block_content,
        title=title,
        description=description,
        tags=tags
    )
    session.add(favorite)
    session.commit()
    session.refresh(favorite)
    return favorite


def delete_favorite(
    session: Session,
    user_id: uuid.UUID,
    content_item_id: uuid.UUID,
    block_id: str | None = None
) -> bool:
    """Delete a favorite."""
    favorite = get_favorite(session, user_id, content_item_id, block_id)
    if favorite:
        session.delete(favorite)
        session.commit()
        return True
    return False


def get_user_favorites(
    session: Session,
    user_id: uuid.UUID,
    skip: int = 0,
    limit: int = 100,
    block_only: bool = False,
    content_only: bool = False
) -> tuple[list[Favorite], int]:
    """Get user's favorites with pagination and filtering."""
    base_query = select(Favorite).where(Favorite.user_id == user_id)

    # 添加过滤条件
    if block_only:
        base_query = base_query.where(Favorite.block_id.is_not(None))
    elif content_only:
        base_query = base_query.where(Favorite.block_id.is_(None))

    # 获取总数
    count_query = select(func.count()).select_from(
        base_query.subquery()
    )
    total = session.exec(count_query).one()

    # 获取分页数据
    favorites_query = base_query.order_by(Favorite.created_at.desc()).offset(skip).limit(limit)
    favorites = session.exec(favorites_query).all()

    return favorites, total


def get_user_favorite_content_ids(
    session: Session,
    user_id: uuid.UUID
) -> list[uuid.UUID]:
    """Get all content IDs that the user has favorited (for backward compatibility)."""
    statement = select(Favorite.content_item_id).where(Favorite.user_id == user_id)
    content_ids = session.exec(statement).all()
    return list(content_ids)


def get_user_favorite_blocks(
    session: Session,
    user_id: uuid.UUID,
    content_item_id: uuid.UUID | None = None,
    skip: int = 0,
    limit: int = 100
) -> tuple[list[Favorite], int]:
    """Get user's block-level favorites."""
    base_query = select(Favorite).where(
        and_(
            Favorite.user_id == user_id,
            Favorite.block_id.is_not(None)
        )
    )

    if content_item_id:
        base_query = base_query.where(Favorite.content_item_id == content_item_id)

    # 获取总数
    count_query = select(func.count()).select_from(
        base_query.subquery()
    )
    total = session.exec(count_query).one()

    # 获取分页数据
    favorites_query = base_query.order_by(Favorite.created_at.desc()).offset(skip).limit(limit)
    favorites = session.exec(favorites_query).all()

    return favorites, total


def update_favorite(
    session: Session,
    favorite_id: uuid.UUID,
    user_id: uuid.UUID,
    title: str | None = None,
    description: str | None = None,
    tags: list[str] | None = None
) -> Favorite | None:
    """Update a favorite's metadata."""
    statement = select(Favorite).where(
        and_(
            Favorite.id == favorite_id,
            Favorite.user_id == user_id
        )
    )
    favorite = session.exec(statement).first()

    if favorite:
        if title is not None:
            favorite.title = title
        if description is not None:
            favorite.description = description
        if tags is not None:
            favorite.tags = tags

        session.add(favorite)
        session.commit()
        session.refresh(favorite)

    return favorite


def is_content_favorited(
    session: Session,
    user_id: uuid.UUID,
    content_item_id: uuid.UUID
) -> bool:
    """Check if a content item is favorited by the user (any level)."""
    statement = select(Favorite).where(
        and_(
            Favorite.user_id == user_id,
            Favorite.content_item_id == content_item_id
        )
    )
    return session.exec(statement).first() is not None


def is_block_favorited(
    session: Session,
    user_id: uuid.UUID,
    content_item_id: uuid.UUID,
    block_id: str
) -> bool:
    """Check if a specific block is favorited by the user."""
    statement = select(Favorite).where(
        and_(
            Favorite.user_id == user_id,
            Favorite.content_item_id == content_item_id,
            Favorite.block_id == block_id
        )
    )
    return session.exec(statement).first() is not None
