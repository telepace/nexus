"""LLM 工具 - 为智能路由服务提供 LLM 客户端"""

import logging
from typing import Any

import httpx
from pydantic import BaseModel

from app.core.config import settings

logger = logging.getLogger(__name__)


class LLMMessage(BaseModel):
    """LLM 消息模型"""

    role: str
    content: str


class LLMResponse(BaseModel):
    """LLM 响应模型"""

    content: str
    model: str
    usage: dict[str, Any] | None = None


class ChatCompletions:
    """聊天完成接口"""

    def __init__(self, client: httpx.AsyncClient):
        self.client = client

    async def create(
        self,
        model: str,
        messages: list[dict[str, str]],
        temperature: float = 0.3,
        max_tokens: int = 1000,
        **kwargs,
    ) -> "MockLLMResponse":
        """创建聊天完成"""

        try:
            # 构建请求数据
            request_data = {
                "model": model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
                **kwargs,
            }

            # 发送请求到 LiteLLM 代理
            base_url = str(settings.LITELLM_PROXY_URL).rstrip("/")
            url = f"{base_url}/v1/chat/completions"

            response = await self.client.post(
                url,
                json=request_data,
                headers={"Content-Type": "application/json"},
                timeout=30.0,
            )

            response.raise_for_status()
            response_data = response.json()

            # 构建响应对象
            return MockLLMResponse(response_data)

        except Exception as e:
            logger.error(f"LLM 请求失败: {e}")
            # 返回模拟响应以保证系统可用性
            return MockLLMResponse(
                {
                    "choices": [
                        {
                            "message": {
                                "content": '{"confidence_score": 0.0, "reasoning": "LLM 服务暂时不可用", "should_create_new": true}'
                            }
                        }
                    ]
                }
            )


class MockLLMResponse:
    """模拟 LLM 响应对象"""

    def __init__(self, response_data: dict[str, Any]):
        self.choices = [
            MockChoice(choice) for choice in response_data.get("choices", [])
        ]


class MockChoice:
    """模拟选择对象"""

    def __init__(self, choice_data: dict[str, Any]):
        self.message = MockMessage(choice_data.get("message", {}))


class MockMessage:
    """模拟消息对象"""

    def __init__(self, message_data: dict[str, Any]):
        self.content = message_data.get("content", "")


class LLMClient:
    """LLM 客户端"""

    def __init__(self):
        self.client = httpx.AsyncClient(timeout=30.0)
        self.chat = ChatCompletions(self.client)

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.client.aclose()


def get_llm_client() -> LLMClient:
    """获取 LLM 客户端实例"""
    return LLMClient()
