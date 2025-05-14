from typing import Any

from fastapi import HTTPException, status
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError

from app.models import ApiResponse


class AppError(Exception):
    """应用自定义错误基类"""
    status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR
    error_code: str = "INTERNAL_SERVER_ERROR"
    message: str = "服务器内部错误"

    def __init__(
        self,
        message: str | None = None,
        status_code: int | None = None,
        error_code: str | None = None,
        **kwargs
    ):
        self.message = message or self.message
        self.status_code = status_code or self.status_code
        self.error_code = error_code or self.error_code
        self.details = kwargs
        super().__init__(self.message)


class NotFoundError(AppError):
    """资源未找到错误"""
    status_code = status.HTTP_404_NOT_FOUND
    error_code = "NOT_FOUND"
    message = "请求的资源不存在"


class ValidationFailedError(AppError):
    """数据校验失败错误"""
    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    error_code = "VALIDATION_ERROR"
    message = "数据验证失败"


class PermissionError(AppError):
    """权限不足错误"""
    status_code = status.HTTP_403_FORBIDDEN
    error_code = "PERMISSION_DENIED"
    message = "没有足够的权限执行此操作"


class AuthenticationError(AppError):
    """认证失败错误"""
    status_code = status.HTTP_401_UNAUTHORIZED
    error_code = "AUTHENTICATION_FAILED"
    message = "认证失败或凭证已过期"


def create_error_response(
    error: AppError | HTTPException | Exception | ValidationError | RequestValidationError,
    include_details: bool = True
) -> tuple[ApiResponse[None], int]:
    """
    从各种类型的错误创建统一的API错误响应
    
    Args:
        error: 错误实例
        include_details: 是否包含详细错误信息
        
    Returns:
        统一格式的API响应和状态码的元组
    """
    meta: dict[str, Any] = {}
    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR

    if isinstance(error, AppError):
        message = error.message
        status_code = error.status_code
        meta = {"error_code": error.error_code}
        if include_details and error.details:
            meta["details"] = {k: str(v) if callable(v) else v for k, v in error.details.items()}

    elif isinstance(error, HTTPException):
        message = error.detail
        status_code = error.status_code

    elif isinstance(error, (ValidationError, RequestValidationError)):
        message = "数据验证失败"
        status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
        if include_details:
            try:
                # 以安全的方式提取错误
                serializable_details = []

                # RequestValidationError特殊处理
                if isinstance(error, RequestValidationError):
                    for err in error.errors():
                        if isinstance(err, dict):
                            error_detail = {}
                            for k, v in err.items():
                                # 安全处理值，避免方法对象问题
                                if isinstance(v, (str, int, float, bool, type(None))):
                                    error_detail[k] = v
                                else:
                                    error_detail[k] = str(v)
                            serializable_details.append(error_detail)
                        else:
                            # 如果不是字典，只添加错误消息
                            serializable_details.append({"msg": str(err)})

                # Pydantic ValidationError处理
                elif isinstance(error, ValidationError):
                    for err in error.errors():
                        if isinstance(err, dict):
                            error_detail = {}
                            for k, v in err.items():
                                # 安全处理值，避免方法对象问题
                                if isinstance(v, (str, int, float, bool, type(None))):
                                    error_detail[k] = v
                                else:
                                    error_detail[k] = str(v)
                            serializable_details.append(error_detail)
                        else:
                            # 如果不是字典，只添加错误消息
                            serializable_details.append({"msg": str(err)})

                # 如果没有找到详细信息，添加通用错误
                if not serializable_details:
                    serializable_details.append({"msg": "验证错误，但无法提取详细信息"})

                meta["details"] = serializable_details
            except Exception as e:
                meta["details"] = [{"msg": f"Error processing details: {str(e)}"}]

    else:
        message = str(error) or "服务器内部错误"

    return ApiResponse[None](
        data=None,
        meta=meta,
        error=message
    ), status_code
