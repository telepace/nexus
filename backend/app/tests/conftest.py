# Set testing environment variables as early as possible
import os

os.environ["TESTING"] = "true"
os.environ["TEST_MODE"] = "true"

from collections.abc import Generator
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, delete

from app import crud
from app.core.config import settings
from app.core.db import init_db
from app.main import app
from app.models import (
    AIConversation,
    AIResult,
    ContentAsset,
    ContentItem,
    ContentShare,
    Image,
    Project,
    Segment,
    User,
    UserCreate,
)
from app.models.favorite import Favorite
from app.models.prompt import Prompt, Tag
from app.tests.utils.test_db import setup_test_db, teardown_test_db
from app.tests.utils.user import authentication_token_from_email
from app.tests.utils.utils import get_superuser_token_headers


# This runs before all tests to set up the test environmen
@pytest.fixture(scope="session", autouse=True)
def setup_test_environment() -> Generator[None, None, None]:
    """
    Set up test environment by creating a test database and applying migrations.

    This fixture runs once per test session before any tests are executed.

    After all tests, it cleans up the test database.
    """
    # Create test database, apply migrations (or create tables directly), and get the test engine
    test_engine = setup_test_db()

    # Replace the global engine with our test engine
    from sqlalchemy.ext.asyncio import create_async_engine

    import app.core.db
    import app.core.db_factory

    original_engine = app.core.db.engine
    app.core.db.engine = test_engine

    # Also replace the db_factory engine
    original_db_factory_engine = app.core.db_factory.engine
    app.core.db_factory.engine = test_engine

    # Create and replace async engine for test database
    from app.tests.utils.test_db import get_test_db_url

    test_db_url = get_test_db_url()
    # Convert to async URL
    if test_db_url.startswith("postgresql+psycopg://"):
        async_test_db_url = test_db_url.replace(
            "postgresql+psycopg://", "postgresql+asyncpg://"
        )
    elif test_db_url.startswith("postgresql://"):
        async_test_db_url = test_db_url.replace(
            "postgresql://", "postgresql+asyncpg://"
        )
    else:
        async_test_db_url = test_db_url

    test_async_engine = create_async_engine(
        async_test_db_url,
        pool_pre_ping=True,
        pool_recycle=300,
        pool_size=5,
        max_overflow=10,
    )

    original_async_engine = app.core.db_factory.async_engine
    app.core.db_factory.async_engine = test_async_engine

    try:
        yield
    except KeyboardInterrupt:
        print("\n⚠️  Tests interrupted by user. Cleaning up...")
        # 继续执行清理，不重新抛出异常
    finally:
        # After all tests, restore the original engines and clean up the test database
        app.core.db.engine = original_engine
        app.core.db_factory.engine = original_db_factory_engine
        app.core.db_factory.async_engine = original_async_engine
        try:
            teardown_test_db()
        except KeyboardInterrupt:
            print(
                "\n⚠️  Database cleanup interrupted. This is normal during test interruption."
            )
        except Exception as e:
            print(f"\n⚠️  Error during database cleanup: {e}")
            # 不抛出异常，避免掩盖原始错误


@pytest.fixture(
    scope="function"
)  # 改为function scope，每个测试函数都有独立的数据库会话
def db() -> Generator[Session, None, None]:
    """
    Get a database session for testing.

    This fixture creates a new database session using the test engine,
    initializes the database with necessary data, and cleans up after tests.
    """
    # Setup test database and get the test engine
    test_engine = setup_test_db()

    # Create session and initialize database using the test engine
    with Session(test_engine, expire_on_commit=False) as session:
        # 先清理所有数据，确保测试隔离
        try:
            # Clean up all test data - 按照外键依赖关系的顺序删除
            # 1. 先删除依赖于其他表的子表
            session.execute(delete(AIConversation))
            session.execute(delete(AIResult))
            session.execute(delete(Segment))
            session.execute(delete(ContentAsset))
            session.execute(delete(ContentShare))
            session.execute(delete(Favorite))  # Favorite 依赖于 ContentItem 和 User
            session.execute(delete(ContentItem))  # ContentItem 依赖于 User
            session.execute(delete(Project))  # Project 可能依赖于 User
            # 删除 prompt_versions 表（在删除 prompts 之前）
            try:
                from app.models.prompt import PromptVersion

                session.execute(delete(PromptVersion))
            except Exception:
                pass  # 表可能不存在
            # 删除 prompt_tags 表（如果存在的话）
            try:
                from sqlmodel import text

                session.execute(text("DELETE FROM prompt_tags"))
            except Exception:
                pass  # 表可能不存在
            session.execute(delete(Prompt))  # Prompt 可能依赖于 User
            session.execute(delete(Tag))
            # 2. 最后删除被依赖的父表
            session.execute(delete(User))
            session.commit()
        except Exception as e:
            # If cleanup fails, log but don't fail the test
            print(f"Database pre-cleanup warning: {e}")
            session.rollback()

        # Initialize database with initial data
        init_db(session)
        # 确保初始化数据被提交
        session.commit()
        yield session

        # 在每个测试结束后清理数据，但保留数据库结构
        try:
            # Clean up all test data - 按照外键依赖关系的顺序删除
            # 1. 先删除依赖于其他表的子表
            session.execute(delete(AIConversation))
            session.execute(delete(AIResult))
            session.execute(delete(Segment))
            session.execute(delete(ContentAsset))
            session.execute(delete(ContentShare))
            session.execute(delete(Favorite))  # Favorite 依赖于 ContentItem 和 User
            session.execute(delete(ContentItem))  # ContentItem 依赖于 User
            session.execute(delete(Project))  # Project 可能依赖于 User
            # 删除 prompt_versions 表（在删除 prompts 之前）
            try:
                from app.models.prompt import PromptVersion

                session.execute(delete(PromptVersion))
            except Exception:
                pass  # 表可能不存在
            # 删除 prompt_tags 表（如果存在的话）
            try:
                from sqlmodel import text

                session.execute(text("DELETE FROM prompt_tags"))
            except Exception:
                pass  # 表可能不存在
            session.execute(delete(Prompt))  # Prompt 可能依赖于 User
            session.execute(delete(Tag))
            # 2. 最后删除被依赖的父表
            session.execute(delete(User))
            session.commit()
        except Exception as e:
            # If cleanup fails, log but don't fail the test
            print(f"Database cleanup warning: {e}")
            session.rollback()


@pytest.fixture(scope="function")  # 改为function scope以确保测试隔离
def client() -> Generator[TestClient, None, None]:
    """Create a test client with overridden database dependency."""
    from app.api.deps import get_db

    def get_test_db():
        """Override database dependency to use test database."""
        # 使用测试引擎创建新的数据库会话
        test_engine = setup_test_db()
        with Session(test_engine, expire_on_commit=False) as session:
            yield session

    # Override the database dependency
    app.dependency_overrides[get_db] = get_test_db

    try:
        with TestClient(app) as c:
            yield c
    finally:
        # Clean up the override
        app.dependency_overrides.clear()


@pytest.fixture(scope="function")  # 改为function scope以匹配db fixture
def superuser_token_headers(client: TestClient, db: Session) -> dict[str, str]:
    """Get superuser token headers for testing."""
    # 确保超级用户存在于测试数据库中

    # 查找现有超级用户
    superuser = crud.get_user_by_email(session=db, email=settings.FIRST_SUPERUSER)

    if not superuser:
        # 如果超级用户不存在，创建一个
        user_in = UserCreate(
            email=settings.FIRST_SUPERUSER,
            password=settings.FIRST_SUPERUSER_PASSWORD,
            is_superuser=True,
        )
        superuser = crud.create_user(session=db, user_create=user_in)
        db.commit()

    # 确保用户是超级用户
    if not superuser.is_superuser:
        superuser.is_superuser = True
        db.add(superuser)
        db.commit()

    # 刷新会话以确保数据同步
    db.refresh(superuser)

    # 确保密码匹配
    from app.core.security import get_password_hash, verify_password

    if not verify_password(
        settings.FIRST_SUPERUSER_PASSWORD, superuser.hashed_password
    ):
        # 如果密码不匹配，更新密码
        superuser.hashed_password = get_password_hash(settings.FIRST_SUPERUSER_PASSWORD)
        db.add(superuser)
        db.commit()
        db.refresh(superuser)

    # 现在获取token
    return get_superuser_token_headers(client)


@pytest.fixture(scope="function")  # 改为function scope，确保每个测试都有独立的用户
def normal_user_token_headers(client: TestClient, db: Session) -> dict[str, str]:
    """Get normal user token headers for testing."""
    # 使用settings中配置的测试用户邮箱
    test_user_email = settings.EMAIL_TEST_USER

    # 确保这个用户不是超级用户
    existing_user = crud.get_user_by_email(session=db, email=test_user_email)
    if existing_user and existing_user.is_superuser:
        existing_user.is_superuser = False
        db.add(existing_user)
        db.commit()
        db.refresh(existing_user)

    return authentication_token_from_email(client=client, email=test_user_email, db=db)


@pytest.fixture(scope="function")
def user(db: Session) -> User:
    """Get the normal test user object for testing."""
    test_user_email = settings.EMAIL_TEST_USER

    # 获取或创建测试用户
    existing_user = crud.get_user_by_email(session=db, email=test_user_email)
    if not existing_user:
        # 如果用户不存在，创建一个
        from app.tests.utils.utils import random_lower_string

        user_in = UserCreate(
            email=test_user_email,
            password=random_lower_string(),
            is_superuser=False,
        )
        user = crud.create_user(session=db, user_create=user_in)
        db.commit()
        db.refresh(user)
        return user
    else:
        # 确保用户不是超级用户
        if existing_user.is_superuser:
            existing_user.is_superuser = False
            db.add(existing_user)
            db.commit()
            db.refresh(existing_user)
        return existing_user


@pytest.fixture(scope="function")
def db_session(db: Session) -> Session:
    """Alias for db fixture to support existing tests that use db_session."""
    return db


def get_api_response_data(response: Any) -> dict[str, Any]:
    """
    从API响应中提取数据，兼容新的API响应格式
    如果响应包含 data/meta/error 格式，则返回 data 字段
    否则返回整个响应内容
    """
    content = response.json()

    # 检查是否是新的API响应格式
    if isinstance(content, dict):
        result: dict[str, Any] = {}
        if "error" in content and content["error"]:
            # 为错误响应创建兼容旧格式的结构
            # 优先使用detail键作为错误信息，这与FastAPI默认错误格式一致
            result = {"detail": content["error"]}

            # 如果存在meta字段且不为None
            if "meta" in content and isinstance(content["meta"], dict):
                # 复制可能存在的附加错误字段
                if "message" in content["meta"]:
                    result["message"] = content["meta"]["message"]
                if "msg" in content["meta"]:
                    result["msg"] = content["meta"]["msg"]

            return result

        # 如果是标准成功响应格式
        if "data" in content and "meta" in content:
            if content["data"] is not None:
                result = (
                    content["data"]
                    if isinstance(content["data"], dict)
                    else {"data": content["data"]}
                )
                # 处理meta中可能的附加字段
                if isinstance(content["meta"], dict):
                    # 对于某些endpoints需要从meta中复制消息字段
                    if "message" in content["meta"]:
                        result["message"] = content["meta"]["message"]
                    if "msg" in content["meta"]:
                        result["msg"] = content["meta"]["msg"]

                return result

    # 返回原始响应内容
    return content if isinstance(content, dict) else {"data": content}


def cleanup_test_data(session: Session) -> None:
    """Clean up all test data in the correct order to respect foreign key constraints."""

    # Delete in reverse dependency order
    session.execute(delete(AIConversation))
    session.execute(delete(AIResult))
    session.execute(delete(Segment))
    session.execute(delete(ContentAsset))
    session.execute(delete(ContentShare))
    session.execute(delete(ContentItem))
    session.execute(delete(Image))
    session.execute(delete(Project))
    session.execute(delete(User))
    session.commit()


def cleanup_tables(session: Session) -> None:
    """Clean up all tables in the correct order."""

    # Clean up in dependency order
    session.execute(delete(AIConversation))
    session.execute(delete(AIResult))
    session.execute(delete(Segment))
    session.execute(delete(ContentAsset))
    session.execute(delete(ContentShare))
    session.execute(delete(ContentItem))
    session.execute(delete(Image))
    session.execute(delete(Project))
    session.execute(delete(User))
    session.commit()
