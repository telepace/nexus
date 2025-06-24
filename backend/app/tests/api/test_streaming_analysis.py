import uuid
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.models import ContentItem


def test_analyze_stream_endpoint_requires_auth(client: TestClient):
    """测试流式分析端点需要认证"""
    content_id = str(uuid.uuid4())
    response = client.get(
        f"/api/v1/content/{content_id}/analyze/stream?analysis_type=summary"
    )
    assert response.status_code == 401


def test_analyze_stream_invalid_analysis_type(
    client: TestClient, normal_user_token_headers: dict
):
    """测试无效的分析类型"""
    response = client.get(
        "/api/v1/content/123/analyze/stream?analysis_type=invalid",
        headers=normal_user_token_headers,
    )
    assert response.status_code == 422


def test_analyze_stream_nonexistent_content(
    client: TestClient, normal_user_token_headers: dict
):
    """测试不存在的内容ID"""
    content_id = str(uuid.uuid4())
    response = client.get(
        f"/api/v1/content/{content_id}/analyze/stream?analysis_type=summary",
        headers=normal_user_token_headers,
    )
    assert response.status_code == 404
    assert "Content item not found" in response.json()["detail"]


def test_analyze_stream_unauthorized_content(
    client: TestClient, normal_user_token_headers: dict, db: Session
):
    """测试访问其他用户的内容"""
    # 创建属于其他用户的内容
    other_user_content = ContentItem(
        id=uuid.uuid4(),
        user_id=uuid.uuid4(),  # 不同的用户ID
        title="Other User Content",
        content_text="This content belongs to another user",
        type="webpage",
    )
    db.add(other_user_content)
    db.commit()

    response = client.get(
        f"/api/v1/content/{other_user_content.id}/analyze/stream?analysis_type=summary",
        headers=normal_user_token_headers,
    )
    assert response.status_code == 403


def test_analyze_stream_content_without_text(
    client: TestClient, normal_user_token_headers: dict, db: Session, user
):
    """测试没有文本内容的内容项"""
    content_item = ContentItem(
        id=uuid.uuid4(),
        user_id=user.id,
        title="Content without text",
        content_text=None,
        type="webpage",
    )
    db.add(content_item)
    db.commit()

    response = client.get(
        f"/api/v1/content/{content_item.id}/analyze/stream?analysis_type=summary",
        headers=normal_user_token_headers,
    )
    assert response.status_code == 400
    assert "Content item has no text content" in response.json()["detail"]


@pytest.mark.asyncio
async def test_analyze_stream_summary_success(
    client: TestClient, normal_user_token_headers: dict, db: Session, user
):
    """测试摘要分析成功流程"""
    # 创建测试内容
    content_item = ContentItem(
        id=uuid.uuid4(),
        user_id=user.id,
        title="Test Article",
        content_text="This is a test article with some content that can be summarized.",
        type="webpage",
    )
    db.add(content_item)
    db.commit()

    # Mock LiteLLM响应
    mock_response_data = [
        'data: {"choices":[{"delta":{"content":"这是"}}]}\n',
        'data: {"choices":[{"delta":{"content":"一个"}}]}\n',
        'data: {"choices":[{"delta":{"content":"测试摘要"}}]}\n',
        "data: [DONE]\n",
    ]

    with patch("aiohttp.ClientSession.post") as mock_post:
        mock_response = AsyncMock()
        mock_response.status = 200
        mock_response.content.iter_chunked.return_value = [
            chunk.encode("utf-8") for chunk in mock_response_data
        ].__aiter__()
        mock_post.return_value.__aenter__.return_value = mock_response

        # 发送请求
        response = client.get(
            f"/api/v1/content/{content_item.id}/analyze/stream?analysis_type=summary",
            headers=normal_user_token_headers,
        )

        assert response.status_code == 200
        assert response.headers["content-type"] == "text/event-stream; charset=utf-8"

        # 验证流式响应内容
        content = response.content.decode("utf-8")
        assert 'data: {"type": "summary"' in content
        assert '"finished": false' in content
        assert '"finished": true' in content


@pytest.mark.asyncio
async def test_analyze_stream_key_points_success(
    client: TestClient, normal_user_token_headers: dict, db: Session, user
):
    """测试关键要点分析成功流程"""
    # 创建测试内容
    content_item = ContentItem(
        id=uuid.uuid4(),
        user_id=user.id,
        title="Test Article",
        content_text="This is a test article with key points to extract.",
        type="webpage",
    )
    db.add(content_item)
    db.commit()

    # Mock LiteLLM响应
    mock_response_data = [
        'data: {"choices":[{"delta":{"content":"## 关键要点\\n\\n"}}]}\n',
        'data: {"choices":[{"delta":{"content":"- 要点1\\n"}}]}\n',
        'data: {"choices":[{"delta":{"content":"- 要点2"}}]}\n',
        "data: [DONE]\n",
    ]

    with patch("aiohttp.ClientSession.post") as mock_post:
        mock_response = AsyncMock()
        mock_response.status = 200
        mock_response.content.iter_chunked.return_value = [
            chunk.encode("utf-8") for chunk in mock_response_data
        ].__aiter__()
        mock_post.return_value.__aenter__.return_value = mock_response

        # 发送请求
        response = client.get(
            f"/api/v1/content/{content_item.id}/analyze/stream?analysis_type=key_points",
            headers=normal_user_token_headers,
        )

        assert response.status_code == 200
        assert response.headers["content-type"] == "text/event-stream; charset=utf-8"

        # 验证流式响应内容
        content = response.content.decode("utf-8")
        assert 'data: {"type": "key_points"' in content
        assert '"finished": false' in content
        assert '"finished": true' in content


@pytest.mark.asyncio
async def test_analyze_stream_litellm_error(
    client: TestClient, normal_user_token_headers: dict, db: Session, user
):
    """测试LiteLLM错误处理"""
    # 创建测试内容
    content_item = ContentItem(
        id=uuid.uuid4(),
        user_id=user.id,
        title="Test Article",
        content_text="Test content",
        type="webpage",
    )
    db.add(content_item)
    db.commit()

    # Mock LiteLLM错误响应
    with patch("aiohttp.ClientSession.post") as mock_post:
        mock_response = AsyncMock()
        mock_response.status = 500
        mock_response.text.return_value = "Internal Server Error"
        mock_post.return_value.__aenter__.return_value = mock_response

        # 发送请求
        response = client.get(
            f"/api/v1/content/{content_item.id}/analyze/stream?analysis_type=summary",
            headers=normal_user_token_headers,
        )

        assert response.status_code == 200  # 流式响应本身成功

        # 验证错误内容
        content = response.content.decode("utf-8")
        assert 'data: {"type": "error"' in content
        assert "LiteLLM error: HTTP 500" in content


def test_analyze_stream_template_loading(
    client: TestClient, normal_user_token_headers: dict, db: Session, user
):
    """测试模板加载"""
    # 创建测试内容
    content_item = ContentItem(
        id=uuid.uuid4(),
        user_id=user.id,
        title="Test Article",
        content_text="Test content for template validation",
        type="webpage",
    )
    db.add(content_item)
    db.commit()

    # 测试summary模板
    with patch("aiohttp.ClientSession.post") as mock_post:
        mock_response = AsyncMock()
        mock_response.status = 200
        mock_response.content.iter_chunked.return_value = [
            b'data: {"choices":[{"delta":{"content":"test"}}]}\n',
            b"data: [DONE]\n",
        ].__aiter__()
        mock_post.return_value.__aenter__.return_value = mock_response

        response = client.get(
            f"/api/v1/content/{content_item.id}/analyze/stream?analysis_type=summary",
            headers=normal_user_token_headers,
        )

        assert response.status_code == 200

        # 验证模板是否正确调用
        mock_post.assert_called_once()
        call_args = mock_post.call_args
        payload = call_args[1]["json"]

        # 验证模板渲染后的消息结构
        assert "messages" in payload
        assert len(payload["messages"]) == 2
        assert payload["messages"][0]["role"] == "system"
        assert payload["messages"][1]["role"] == "user"
        assert "Nexus 的 AI" in payload["messages"][1]["content"]  # summary.j2模板特征
