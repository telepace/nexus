import uuid
from datetime import datetime
from typing import Any

from sqlmodel import Session, select

from app.core.security import get_password_hash, verify_password
from app.models import Item, ItemCreate, TokenBlacklist, User, UserCreate, UserUpdate


def create_user(*, session: Session, user_create: UserCreate) -> User:
    db_obj = User.model_validate(
        user_create, update={"hashed_password": get_password_hash(user_create.password)}
    )
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj


def update_user(*, session: Session, db_user: User, user_in: UserUpdate) -> Any:
    user_data = user_in.model_dump(exclude_unset=True)
    extra_data = {}
    if "password" in user_data:
        password = user_data["password"]
        hashed_password = get_password_hash(password)
        extra_data["hashed_password"] = hashed_password
    db_user.sqlmodel_update(user_data, update=extra_data)
    session.add(db_user)
    session.commit()
    session.refresh(db_user)
    return db_user


def get_user_by_email(*, session: Session, email: str) -> User | None:
    statement = select(User).where(User.email == email)
    session_user = session.exec(statement).first()
    return session_user


def authenticate(*, session: Session, email: str, password: str) -> User | None:
    db_user = get_user_by_email(session=session, email=email)
    if not db_user:
        return None
    if not db_user.hashed_password:
        return None
    if not verify_password(password, db_user.hashed_password):
        return None
    return db_user


def create_item(*, session: Session, item_in: ItemCreate, owner_id: uuid.UUID) -> Item:
    db_item = Item.model_validate(item_in, update={"owner_id": owner_id})
    session.add(db_item)
    session.commit()
    session.refresh(db_item)
    return db_item


def add_token_to_blacklist(
    *, session: Session, token: str, user_id: uuid.UUID, expires_at: datetime
) -> TokenBlacklist:
    """
    Add a token to the blacklist.
    """
    blacklist_token = TokenBlacklist(
        token=token, user_id=user_id, expires_at=expires_at
    )
    session.add(blacklist_token)
    session.commit()
    session.refresh(blacklist_token)
    return blacklist_token


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


def create_user_oauth(*, session: Session, obj_in: User) -> User:
    """
    Create a new user for OAuth authentication (without password)
    """
    session.add(obj_in)
    session.commit()
    session.refresh(obj_in)
    return obj_in


def get_user_by_google_id(*, session: Session, google_id: str) -> User | None:
    """
    Get a user by Google ID
    """
    statement = select(User).where(User.google_id == google_id)
    session_user = session.exec(statement).first()
    return session_user
