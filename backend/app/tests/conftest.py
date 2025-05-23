from collections.abc import Generator
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, delete

from app.core.config import settings
from app.core.db import init_db
from app.main import app
from app.models import Item, User
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
    # 确保测试用的超级用户密码为 "adminadmin"，满足至少8个字符的要求
    # 在这里设置密码，确保在任何其他fixture运行之前就设置好
    settings.FIRST_SUPERUSER_PASSWORD = "adminadmin"
    
    # Create test database, apply migrations (or create tables directly), and get the test engine
    test_engine = setup_test_db()

    # Replace the global engine with our test engine
    import app.core.db

    original_engine = app.core.db.engine
    app.core.db.engine = test_engine

    yield

    # After all tests, restore the original engine and clean up the test database
    app.core.db.engine = original_engine
    teardown_test_db()


@pytest.fixture(scope="session", autouse=True)
def db() -> Generator[Session, None, None]:
    """
    Get a database session for testing.

    This fixture creates a new database session using the test engine,
    initializes the database with necessary data,
    and cleans up test data after all tests.
    """
    # We're using the engine that was set up in setup_test_environmen
    from app.core.db import engine

    # 密码已经在setup_test_environment中设置，这里直接初始化数据库
    # 创建测试用的数据库会话
    with Session(engine) as session:
        init_db(session)
        yield session
        # Clean up test data, but don't drop the database ye
        # (that will happen in teardown_test_db)
        statement = delete(Item)
        session.execute(statement)
        statement = delete(User)
        session.execute(statement)
        session.commit()

    # 注意：不再恢复原始密码设置，因为这会导致测试中的认证失败


@pytest.fixture(scope="module")
def client() -> Generator[TestClient, None, None]:
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="module")
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
