import uuid
from collections.abc import Sequence
from datetime import datetime
from typing import Any, Protocol, TypeVar

from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from app.core.security import get_password_hash, verify_password
from app.models import Item, TokenBlacklist, User


class BaseSchema(Protocol):
    def model_dump(self, **kwargs: Any) -> dict[str, Any]: ...


ModelType = TypeVar("ModelType")
CreateSchemaType = TypeVar("CreateSchemaType", bound=BaseSchema)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=BaseSchema)


def get_by_id(
    session: Session,
    model: type[ModelType],
    id: uuid.UUID | str | int,
) -> ModelType | None:
    """通过 ID 获取对象"""
    return session.get(model, id)


def get_multi(
    session: Session,
    model: type[ModelType],
    *,
    skip: int = 0,
    limit: int = 100,
) -> Sequence[ModelType]:
    """获取对象列表"""
    query = select(model)
    results = session.exec(query).all()
    return list(results[skip : skip + limit])


def create(
    session: Session,
    model: type[ModelType],
    obj_in: CreateSchemaType,
) -> ModelType:
    """创建对象"""
    try:
        obj = model(**obj_in.model_dump())
        session.add(obj)
        session.commit()
        session.refresh(obj)
        return obj
    except IntegrityError as e:
        session.rollback()
        raise e


def update(
    session: Session,
    model: type[ModelType],
    id: uuid.UUID | str | int,
    obj_in: UpdateSchemaType,
) -> ModelType | None:
    """更新对象"""
    try:
        obj = session.get(model, id)
        if not obj:
            return None

        update_data = obj_in.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(obj, key, value)

        session.add(obj)
        session.commit()
        session.refresh(obj)
        return obj
    except IntegrityError as e:
        session.rollback()
        raise e


def delete(
    session: Session,
    model: type[ModelType],
    id: uuid.UUID | str | int,
) -> ModelType | None:
    """删除对象"""
    obj = session.get(model, id)
    if not obj:
        return None

    session.delete(obj)
    session.commit()
    return obj


def get_user_by_email(session: Session, email: str) -> User | None:
    """通过邮箱获取用户"""
    return session.exec(select(User).where(User.email == email)).first()


def get_items(
    session: Session,
    *,
    owner_id: uuid.UUID | None = None,
    skip: int = 0,
    limit: int = 100,
) -> list[Item]:
    """获取物品列表"""
    query = select(Item)
    if owner_id:
        query = query.where(Item.owner_id == owner_id)
    # 先执行查询获取所有结果
    results = session.exec(query).all()
    # 然后在 Python 中进行分页
    return list(results[skip : skip + limit])


def create_user(*, session: Session, user_create: Any) -> Any:
    """创建新用户"""
    # 动态导入User和UserCreate
    from app.models import User

    # 添加这个检查，确保 is_superuser 字段被正确设置
    is_superuser = getattr(user_create, "is_superuser", False)

    user = User(
        email=user_create.email,
        hashed_password=get_password_hash(user_create.password),
        full_name=user_create.full_name,
        is_superuser=is_superuser,
    )
    session.add(user)
    try:
        session.commit()
        session.refresh(user)
        return user
    except IntegrityError:
        session.rollback()
        return None


def get_user(*, session: Session, user_id: uuid.UUID) -> Any | None:
    """根据ID获取用户"""
    # 动态导入User
    from app.models import User

    return session.get(User, user_id)


def authenticate(*, session: Session, email: str, password: str) -> Any | None:
    """验证用户"""
    user = get_user_by_email(session=session, email=email)
    if not user or not user.hashed_password:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


def update_user(
    *, session: Session, db_user: Any, user_in: dict[str, Any] | Any
) -> Any:
    """更新用户信息"""
    # 动态导入User

    if isinstance(user_in, dict):
        update_data = user_in
    else:
        update_data = user_in.model_dump(exclude_unset=True)

    if update_data.get("password"):
        hashed_password = get_password_hash(update_data["password"])
        del update_data["password"]
        update_data["hashed_password"] = hashed_password

    for field, value in update_data.items():
        setattr(db_user, field, value)

    session.add(db_user)
    session.commit()
    session.refresh(db_user)
    return db_user


def create_item(*, session: Session, item_in: Any, owner_id: uuid.UUID) -> Any:
    """创建项目"""
    # 动态导入Item
    from app.models import Item

    item = Item(**item_in.model_dump(), owner_id=owner_id)
    session.add(item)
    session.commit()
    session.refresh(item)
    return item


def get_item(session: Session, id: uuid.UUID) -> Any | None:
    """获取单个项目"""
    # 动态导入Item
    from app.models import Item

    return session.get(Item, id)


def update_item(session: Session, item: Any, item_in: Any) -> Any:
    """更新项目"""
    # 动态导入Item

    for field, value in item_in.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    session.add(item)
    session.commit()
    session.refresh(item)
    return item


def delete_item(session: Session, item: Any) -> Any:
    """删除项目"""
    session.delete(item)
    session.commit()
    return item


def create_token_blacklist(session: Session, token: str) -> Any:
    """将令牌加入黑名单"""
    # 动态导入TokenBlacklist
    from app.models import TokenBlacklist

    token_blacklist = TokenBlacklist(token=token, created_at=datetime.utcnow())
    session.add(token_blacklist)
    session.commit()
    session.refresh(token_blacklist)
    return token_blacklist


def check_token_in_blacklist(session: Session, token: str) -> bool:
    """检查令牌是否在黑名单中"""
    # 动态导入TokenBlacklist
    from app.models import TokenBlacklist

    statement = select(TokenBlacklist).where(TokenBlacklist.token == token)
    results = session.exec(statement)
    return results.first() is not None


def add_token_to_blacklist(
    *, session: Session, token: str, user_id: uuid.UUID, expires_at: datetime
) -> Any:
    """
    Add a token to the blacklist.
    """
    # 动态导入TokenBlacklist
    from app.models import TokenBlacklist

    token_blacklist = TokenBlacklist(
        token=token,
        user_id=user_id,
        expires_at=expires_at,
        blacklisted_at=datetime.utcnow(),
    )
    session.add(token_blacklist)
    session.commit()
    session.refresh(token_blacklist)
    return token_blacklist


def is_token_blacklisted(*, session: Session, token: str) -> bool:
    """
    Check if a token is in the blacklist.
    """
    statement = select(TokenBlacklist).where(TokenBlacklist.token == token)
    blacklisted = session.exec(statement).first()
    return blacklisted is not None


def clean_expired_tokens(*, session: Session) -> int:
    """
    Remove expired tokens from the blacklist.
    Returns the number of tokens removed.
    """
    now = datetime.utcnow()
    statement = select(TokenBlacklist).where(TokenBlacklist.expires_at < now)
    expired_tokens = session.exec(statement).all()
    count = len(expired_tokens)
    for token in expired_tokens:
        session.delete(token)
    session.commit()
    return count


def create_user_oauth(*, session: Session, obj_in: Any) -> Any:
    """
    Create a new user for OAuth authentication (without password)
    """
    # 动态导入User
    from app.models import User

    db_obj = User.model_validate(obj_in)
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj


def get_user_by_google_id(*, session: Session, google_id: str) -> Any | None:
    """
    Get a user by Google ID
    """
    # 动态导入User
    from app.models import User

    statement = select(User).where(User.google_id == google_id)
    results = session.exec(statement)
    return results.first()


# 添加tag相关CRUD操作
def get_tags(db: Session, skip: int = 0, limit: int = 100) -> Sequence[Any]:
    """获取所有标签"""
    from app.models import Tag

    query = select(Tag)
    results = db.exec(query).all()
    return results[skip : skip + limit]


def get_tag(db: Session, tag_id: uuid.UUID):
    """根据ID获取标签"""
    from app.models import Tag

    return db.get(Tag, tag_id)


def create_tag(db: Session, tag_in: Any):
    """创建新标签"""
    from app.models import Tag

    tag = Tag(**tag_in.model_dump())
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return tag


def update_tag(db: Session, tag: Any, tag_in: Any):
    """更新标签"""
    update_data = tag_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(tag, field, value)
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return tag
