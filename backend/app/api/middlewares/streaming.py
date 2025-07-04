from __future__ import annotations

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.types import Message


class StreamingResponseHeaderMiddleware(BaseHTTPMiddleware):
    """为 text/event-stream 或自定义 Data-Stream 流式响应自动附加防缓冲头"""

    async def dispatch(self, request: Request, call_next):  # type: ignore[override]
        response = await call_next(request)

        content_type = response.headers.get("content-type", "")
        if content_type.startswith("text/event-stream") or content_type.startswith("text/plain"):
            # 关闭 Nginx 代理缓冲，确保 chunk 及时 flush
            response.headers.setdefault("X-Accel-Buffering", "no")
            # 防止浏览器/中间层缓存
            response.headers.setdefault("Cache-Control", "no-cache")
            # 明确保持连接
            response.headers.setdefault("Connection", "keep-alive")
        return response 