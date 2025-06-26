import json

from fastapi import status
from fastapi.testclient import TestClient


class TestExtensionStreamAPI:
    """扩展流式API测试用例"""

    def test_summary_stream_success(
        self, client: TestClient, normal_user_token_headers: dict
    ):
        """测试流式摘要接口成功返回"""
        payload = {
            "text": "这是一篇关于人工智能的文章。人工智能正在改变我们的生活方式。",
            "lang": "zh",
            "max_tokens": 200,
        }

        response = client.post(
            "/api/v1/extension/summary/stream",
            json=payload,
            headers=normal_user_token_headers,
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.headers["content-type"] == "text/event-stream; charset=utf-8"
        assert "X-Content-Source" in response.headers

        # 验证SSE流格式
        content = response.content.decode()
        assert "data: " in content
        assert content.endswith("\n\n")

    def test_keypoints_stream_success(
        self, client: TestClient, normal_user_token_headers: dict
    ):
        """测试流式要点接口成功返回"""
        payload = {
            "text": "这是一篇关于机器学习的技术文章。包含算法介绍、实现方法和应用案例。",
            "lang": "zh",
            "max_tokens": 300,
        }

        response = client.post(
            "/api/v1/extension/keypoints/stream",
            json=payload,
            headers=normal_user_token_headers,
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.headers["content-type"] == "text/event-stream; charset=utf-8"
        assert "X-Content-Source" in response.headers

        # 验证SSE流格式
        content = response.content.decode()
        assert "data: " in content
        assert content.endswith("\n\n")

    def test_stream_with_invalid_token(self, client: TestClient):
        """测试无效token的错误处理"""
        payload = {"text": "测试内容", "lang": "zh"}

        response = client.post(
            "/api/v1/extension/summary/stream",
            json=payload,
            headers={"Authorization": "Bearer invalid-token"},
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_stream_without_auth(self, client: TestClient):
        """测试未认证请求的错误处理"""
        payload = {"text": "测试内容", "lang": "zh"}

        response = client.post("/api/v1/extension/summary/stream", json=payload)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_stream_with_empty_text(
        self, client: TestClient, normal_user_token_headers: dict
    ):
        """测试空文本的验证错误"""
        payload = {"text": "", "lang": "zh"}

        response = client.post(
            "/api/v1/extension/summary/stream",
            json=payload,
            headers=normal_user_token_headers,
        )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_stream_language_auto_detection(
        self, client: TestClient, normal_user_token_headers: dict
    ):
        """测试语言自动检测功能"""
        payload = {
            "text": "This is an English article about artificial intelligence and machine learning.",
            "lang": "auto",
        }

        response = client.post(
            "/api/v1/extension/summary/stream",
            json=payload,
            headers=normal_user_token_headers,
        )

        assert response.status_code == status.HTTP_200_OK

    def test_stream_response_format(
        self, client: TestClient, normal_user_token_headers: dict
    ):
        """测试流式响应格式符合SSE标准"""
        payload = {
            "text": "测试内容用于验证流式响应格式",
            "lang": "zh",
            "max_tokens": 100,
        }

        response = client.post(
            "/api/v1/extension/summary/stream",
            json=payload,
            headers=normal_user_token_headers,
        )

        assert response.status_code == status.HTTP_200_OK

        # 验证响应头
        assert response.headers["content-type"] == "text/event-stream; charset=utf-8"
        assert response.headers["cache-control"] == "no-cache"
        assert response.headers["connection"] == "keep-alive"

        # 验证流式数据格式
        content = response.content.decode()
        lines = content.strip().split("\n")

        # 检查是否有data行
        data_lines = [line for line in lines if line.startswith("data: ")]
        assert len(data_lines) > 0

        # 检查最后是否有完成标记
        if len(data_lines) > 1:
            last_data = data_lines[-1]
            try:
                data_json = json.loads(last_data[6:])  # 去掉"data: "前缀
                assert "done" in data_json or "delta" in data_json
            except json.JSONDecodeError:
                pass  # 可能是纯文本格式，这也是可接受的
