"""
Chat API routes for streaming conversations with LiteLLM integration.
支持 Vercel AI SDK 的 Data Stream Protocol 格式。
"""

import json
from collections.abc import AsyncGenerator

from fastapi import APIRouter, Body, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlmodel import Session

from app.api.deps import get_current_user, get_db
from app.core.config import settings
from app.models import User
from app.schemas.llm_service import CompletionRequest, LLMMessage

router = APIRouter()


@router.post("/completions")
async def create_chat_completion(
    messages: list[dict] = Body(..., description="Chat messages in OpenAI format"),
    model: str = Body(default="or-llama-3-1-8b-instruct", description="Model to use"),
    stream: bool = Body(default=True, description="Whether to stream the response"),
    temperature: float = Body(default=0.7, description="Sampling temperature"),
    max_tokens: int = Body(default=2000, description="Maximum tokens to generate"),
    _current_user: User = Depends(get_current_user),
    _db: Session = Depends(get_db),
):
    """
    Create chat completion compatible with Vercel AI SDK.

    Supports Data Stream Protocol format for frontend integration.
    """

    # 验证消息格式
    try:
        llm_messages = [
            LLMMessage(role=msg["role"], content=msg["content"]) for msg in messages
        ]
    except (KeyError, TypeError) as e:
        raise HTTPException(status_code=400, detail=f"Invalid message format: {str(e)}")

    # 准备 LiteLLM 请求
    completion_request = CompletionRequest(
        model=model,
        messages=llm_messages,
        stream=stream,
        temperature=temperature,
        max_tokens=max_tokens,
    )

    if not stream:
        # 非流式响应处理
        return await _handle_non_streaming_completion(completion_request)

    # 流式响应处理
    return StreamingResponse(
        _stream_chat_completion(completion_request),
        media_type="text/plain",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Cache-Control",
            "X-Vercel-AI-Data-Stream": "v1",  # Vercel AI SDK 要求的头部
        },
    )


async def _stream_chat_completion(
    request: CompletionRequest,
) -> AsyncGenerator[str, None]:
    """
    生成兼容 Vercel AI SDK Data Stream Protocol 的流式响应
    """
    try:
        import aiohttp

        # LiteLLM 代理配置
        litellm_url = f"{settings.LITELLM_PROXY_URL}/v1/chat/completions"
        headers = {"Content-Type": "application/json"}

        if settings.LITELLM_MASTER_KEY:
            headers["Authorization"] = f"Bearer {settings.LITELLM_MASTER_KEY}"

        payload = request.model_dump(exclude_none=True)

        timeout = aiohttp.ClientTimeout(total=30.0)
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.post(
                litellm_url, json=payload, headers=headers
            ) as response:
                if response.status != 200:
                    # 发送错误响应
                    error_msg = f"LiteLLM error: HTTP {response.status}"
                    yield f'9:[{{"error":"{error_msg}"}}]\n'
                    return

                # 处理流式响应
                accumulated_content = ""

                async for chunk_bytes in response.content.iter_chunked(1024):
                    if not chunk_bytes:
                        continue

                    chunk_str = chunk_bytes.decode("utf-8", errors="ignore")
                    lines = chunk_str.split("\n")

                    for line in lines:
                        if line.startswith("data: "):
                            data = line[6:].strip()

                            if data == "[DONE]":
                                # 发送完成信号
                                yield '8:[{"finishReason":"stop"}]\n'
                                return

                            try:
                                parsed = json.loads(data)

                                # 检查错误
                                if "error" in parsed:
                                    yield f'9:[{{"error":"{parsed.get("message", "Unknown error")}"}}]\n'
                                    return

                                # 提取内容
                                if (
                                    parsed.get("choices")
                                    and len(parsed["choices"]) > 0
                                    and "delta" in parsed["choices"][0]
                                    and "content" in parsed["choices"][0]["delta"]
                                ):
                                    content = parsed["choices"][0]["delta"]["content"]
                                    if content:
                                        accumulated_content += content

                                        # 发送文本块 (类型 0)
                                        yield f'0:"{content}"\n'

                            except json.JSONDecodeError:
                                # 忽略非JSON数据
                                continue

                # 确保发送完成信号
                if accumulated_content:
                    yield '8:[{"finishReason":"stop"}]\n'

    except Exception as e:
        # 发送错误信息
        error_msg = str(e).replace('"', '\\"')
        yield f'9:[{{"error":"Stream error: {error_msg}"}}]\n'


async def _handle_non_streaming_completion(request: CompletionRequest):
    """
    处理非流式请求
    """
    try:
        import aiohttp

        litellm_url = f"{settings.LITELLM_PROXY_URL}/v1/chat/completions"
        headers = {"Content-Type": "application/json"}

        if settings.LITELLM_MASTER_KEY:
            headers["Authorization"] = f"Bearer {settings.LITELLM_MASTER_KEY}"

        payload = request.model_dump(exclude_none=True)

        timeout = aiohttp.ClientTimeout(total=30.0)
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.post(
                litellm_url, json=payload, headers=headers
            ) as response:
                if response.status != 200:
                    error_text = await response.text()
                    raise HTTPException(
                        status_code=response.status,
                        detail=f"LiteLLM error: {error_text}",
                    )

                result = await response.json()
                return result

    except aiohttp.ClientError as e:
        raise HTTPException(
            status_code=503, detail=f"Failed to connect to LiteLLM service: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/models")
async def list_available_models(
    _current_user: User = Depends(get_current_user),
):
    """
    列出可用的 AI 模型
    """
    # 从 LiteLLM 配置中获取可用模型
    available_models = [
        {"id": "or-llama-3-1-8b-instruct", "name": "Llama 3.1 8B Instruct"},
        {"id": "or-llama-3-3-70b-instruct", "name": "Llama 3.3 70B Instruct"},
        {"id": "github-llama-3-2-11b-vision", "name": "Llama 3.2 11B Vision"},
        {"id": "deepseek-v3-ensemble", "name": "DeepSeek V3"},
        {"id": "volcengine-doubao-pro-32k", "name": "Doubao Pro 32K"},
    ]

    return {"models": available_models}
