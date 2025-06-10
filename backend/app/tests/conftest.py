import os

# Set testing environment variables as early as possible
os.environ["TESTING"] = "true"
os.environ["TEST_MODE"] = "true"

from collections.abc import Generator
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, delete

from app.core.config import settings
from app.core.db import engine, init_db
from app.main import app
from app.models import User
from app.models.content import (
    AIConversation,  # Added ContentShare
    ContentAsset,
    ContentItem,
    ContentShare,
    ProcessingJob,
)
from app.models.project import Project
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


@pytest.fixture(scope="session", autouse=True)
def db() -> Generator[Session, None, None]:
    """
    Get a database session for testing.

    This fixture creates a new database session using the test engine,
    initializes the database with necessary data, and cleans up after tests.
    """
    # Setup test database
    setup_test_db()

    # Create session and initialize database
    with Session(engine) as session:
        # Initialize database with initial data
        init_db(session)
        yield session

    # Cleanup: Since foreign key constraints have been removed,
    # we can clean up tables in any order
    with Session(engine) as session:
        # Clean up all test data - use Project instead of Item
        session.execute(delete(Project))
        session.execute(delete(User))
        # Clean up content-related tables
        session.execute(delete(AIConversation))
        session.execute(delete(ProcessingJob))
        session.execute(delete(ContentAsset))
        session.execute(delete(ContentShare))  # Added ContentShare
        session.execute(delete(ContentItem))
        session.commit()

    # Teardown test database
    teardown_test_db()


@pytest.fixture(scope="module")
def client() -> Generator[TestClient, None, None]:
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="module")
def superuser_token_headers(client: TestClient) -> dict[str, str]:
    return get_superuser_token_headers(client)


@pytest.fixture(scope="module")
def normal_user_token_headers(client: TestClient, db: Session) -> dict[str, str]:
    return authentication_token_from_email(
        client=client, email=settings.EMAIL_TEST_USER, db=db
    )


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
