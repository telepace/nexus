from collections.abc import Generator
from typing import Annotated, Any, TypeVar

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jwt.exceptions import InvalidTokenError
from pydantic import ValidationError
from sqlmodel import Session

from app import crud
from app.core import security
from app.core.config import settings
from app.core.db_factory import engine
from app.models import TokenPayload, User

# 定义类型变量
SupabaseClient = TypeVar("SupabaseClient")

try:
    from app.core.supabase_service import get_supabase_client

    SUPABASE_AVAILABLE = True
except ImportError:
    SUPABASE_AVAILABLE = False

    def get_supabase_client() -> Any | None:
        return None


reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/login/access-token"
)


def get_db() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session


def get_supabase() -> Generator[SupabaseClient | None, None, None]:
    """Provides a Supabase client instance (if available).

    This function checks if the SUPABASE_AVAILABLE flag is set to True. If it is, it initializes and yields a Supabase
    client instance; otherwise, it yields None.

    Yields:
        SupabaseClient | None: A Supabase client instance if available, otherwise None.
    """
    client = get_supabase_client() if SUPABASE_AVAILABLE else None
    yield client


SessionDep = Annotated[Session, Depends(get_db)]
TokenDep = Annotated[str, Depends(reusable_oauth2)]
SupabaseDep = Annotated[Any | None, Depends(get_supabase)]


def get_current_user(session: SessionDep, token: TokenDep) -> User:
    try:
        import logging

        logger = logging.getLogger("app")
        logger.info("Attempting to decode JWT token...")

        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[security.ALGORITHM]
        )
        token_data = TokenPayload(**payload)
        logger.info(f"JWT token decoded successfully. User ID: {token_data.sub}")
    except InvalidTokenError as e:
        # Log the specific token error for better debugging
        import logging

        logging.getLogger("app").error(f"JWT Token Error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Could not validate credentials: {str(e)}",
        )
    except ValidationError:
        import logging

        logging.getLogger("app").error(
            "JWT Token Validation Error: Invalid payload format"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid token payload",
        )

    # Check if token is in blacklist
    if crud.is_token_blacklisted(session=session, token=token):
        import logging

        logging.getLogger("app").error("Token found in blacklist")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked",
        )

    logger.info(f"Looking up user with ID: {token_data.sub}")
    user = session.get(User, token_data.sub)

    if not user:
        logger.error(f"User with ID '{token_data.sub}' not found in database")
        # 尝试手动查询用户表
        from sqlmodel import select

        all_users = session.exec(select(User)).all()
        logger.info(f"Database contains {len(all_users)} users")
        for db_user in all_users:
            logger.info(f"DB User: {db_user.id} / {db_user.email}")

        raise HTTPException(status_code=404, detail="User not found")

    logger.info(f"User found: {user.email}, active: {user.is_active}")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def get_current_active_superuser(current_user: CurrentUser) -> User:
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=403, detail="The user doesn't have enough privileges"
        )
    return current_user
