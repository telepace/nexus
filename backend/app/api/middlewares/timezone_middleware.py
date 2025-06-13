"""
时区中间件

处理API请求和响应中的时区信息，自动为用户提供本地化的时间显示
"""

from collections.abc import Callable
from typing import Any

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from app.utils.timezone import TimezoneMiddleware, TimezoneUtil


class TimezoneHTTPMiddleware(BaseHTTPMiddleware):
    """
    时区HTTP中间件

    功能：
    1. 从请求头中提取用户时区信息
    2. 在响应中添加时区感知的时间格式
    3. 支持API级别的时区转换
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # 从请求头中提取用户时区
        user_timezone = self._extract_timezone_from_request(request)

        # 将时区信息添加到请求状态中，供路由处理函数使用
        request.state.user_timezone = user_timezone

        # 处理请求
        response = await call_next(request)

        # 如果是JSON响应，处理时间格式
        if isinstance(response, JSONResponse) and user_timezone:
            response = await self._process_response_timezone(response, user_timezone)

        return response

    def _extract_timezone_from_request(self, request: Request) -> str | None:
        """从请求中提取时区信息"""
        # 优先级：
        # 1. 请求头 X-User-Timezone
        # 2. 查询参数 timezone
        # 3. 默认为None

        timezone_header = request.headers.get("x-user-timezone")
        if timezone_header and TimezoneUtil.is_valid_timezone(timezone_header):
            return timezone_header

        timezone_param = request.query_params.get("timezone")
        if timezone_param and TimezoneUtil.is_valid_timezone(timezone_param):
            return timezone_param

        return None

    async def _process_response_timezone(
        self, response: JSONResponse, user_timezone: str
    ) -> JSONResponse:
        """处理响应中的时区信息"""
        try:
            # 获取响应体
            if hasattr(response, "body") and response.body:
                import json

                body_bytes = response.body
                if isinstance(body_bytes, memoryview):
                    body_bytes = bytes(body_bytes)
                response_data = json.loads(
                    body_bytes.decode("utf-8")
                )  # 明确指定UTF-8编码

                # 递归处理时间字段
                processed_data = TimezoneMiddleware.add_timezone_to_response(
                    response_data, user_timezone
                )

                # 创建新的响应
                return JSONResponse(
                    content=processed_data,
                    status_code=response.status_code,
                    headers=dict(response.headers),
                )
        except Exception as e:
            # 如果处理失败，返回原响应
            print(f"时区处理失败: {e}")
            pass

        return response


def get_user_timezone(request: Request) -> str | None:
    """从请求中获取用户时区的便捷函数"""
    return getattr(request.state, "user_timezone", None)


class TimezoneResponseHelper:
    """时区响应帮助类"""

    @staticmethod
    def format_datetime_fields(
        data: dict[str, Any], user_timezone: str | None = None
    ) -> dict[str, Any]:
        """格式化响应数据中的日期时间字段"""
        return TimezoneMiddleware.add_timezone_to_response(data, user_timezone)

    @staticmethod
    def create_timezone_aware_response(
        data: Any, user_timezone: str | None = None, status_code: int = 200
    ) -> JSONResponse:
        """创建时区感知的JSON响应"""
        if isinstance(data, dict):
            processed_data = TimezoneResponseHelper.format_datetime_fields(
                data, user_timezone
            )
            return JSONResponse(content=processed_data, status_code=status_code)
        elif isinstance(data, list):
            processed_list = []
            for item in data:
                if isinstance(item, dict):
                    processed_list.append(
                        TimezoneResponseHelper.format_datetime_fields(
                            item, user_timezone
                        )
                    )
                else:
                    processed_list.append(item)
            return JSONResponse(content=processed_list, status_code=status_code)
        else:
            return JSONResponse(content=data, status_code=status_code)
