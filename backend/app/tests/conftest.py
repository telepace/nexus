from collections.abc import Generator
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, delete

from app.core.config import settings
from app.core.db import engine, init_db
from app.main import app
from app.models import Item, User
from app.tests.utils.user import authentication_token_from_email
from app.tests.utils.utils import get_superuser_token_headers


@pytest.fixture(scope="session", autouse=True)
def db() -> Generator[Session, None, None]:
    with Session(engine) as session:
        init_db(session)
        yield session
        statement = delete(Item)
        session.execute(statement)
        statement = delete(User)
        session.execute(statement)
        session.commit()


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
                result = content["data"] if isinstance(content["data"], dict) else {"data": content["data"]}
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
