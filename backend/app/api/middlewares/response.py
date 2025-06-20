from collections.abc import Awaitable, Callable
from typing import Any

from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.utils.response import ApiResponse


class ApiResponseMiddleware(BaseHTTPMiddleware):
    """
    中间件，用于统一处理API响应格式，确保所有响应都符合 ApiResponse 格式
    """

    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        response = await call_next(request)

        # 仅处理API路径的响应
        if not request.url.path.startswith("/api"):
            return response

        # 如果不是JSON响应，直接返回
        if not isinstance(response, JSONResponse):
            return response

        # 获取原始响应内容
        response_body = response.body

        # 如果是字节串或memoryview，则解码
        if isinstance(response_body, bytes):
            try:
                content = response_body.decode("utf-8")  # 明确指定UTF-8编码
                import json

                content = json.loads(content)
            except Exception:
                return response
        elif isinstance(response_body, memoryview):
            try:
                content = bytes(response_body).decode("utf-8")  # 明确指定UTF-8编码
                import json

                content = json.loads(content)
            except Exception:
                return response
        else:
            # 不是可解码类型
            return response

        # 检查内容是否已经符合 ApiResponse 格式
        if isinstance(content, dict) and set(content.keys()) & {
            "data",
            "meta",
            "error",
        }:
            return response

        # 根据状态码，重新格式化响应
        status_code = response.status_code
        formatted_response: dict[str, Any] = {}

        if 200 <= status_code < 400:
            # 成功响应
            success_response: ApiResponse[Any] = ApiResponse[Any](
                data=content, meta={}, error=None
            )
            formatted_response = success_response.model_dump()
        else:
            # 错误响应
            if isinstance(content, dict) and "detail" in content:
                error_msg = content.get("detail", str(content))
            else:
                error_msg = str(content)
            error_response: ApiResponse[Any] = ApiResponse[Any](
                data=None, meta={}, error=error_msg
            )
            formatted_response = error_response.model_dump()

        return JSONResponse(
            content=formatted_response,
            status_code=status_code,
            headers=dict(response.headers),
        )
