# 尝试导入posthog，如果无法导入则使用空的替代
try:
    import posthog

    POSTHOG_AVAILABLE = True
except ImportError:
    print("Warning: posthog not found, PostHog integration will be disabled")
    POSTHOG_AVAILABLE = False

# 尝试导入sentry_sdk，如果无法导入则使用空的替代
try:
    import sentry_sdk

    SENTRY_AVAILABLE = True
except ImportError:
    print("Warning: sentry_sdk not found, Sentry integration will be disabled")
    SENTRY_AVAILABLE = False

from fastapi import FastAPI, Request
from fastapi.routing import APIRoute
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.cors import CORSMiddleware

from app.api.main import api_router
from app.api.middlewares.posthog import PostHogMiddleware
from app.api.middlewares.response import ApiResponseMiddleware
from app.core.config import settings
from app.utils.error import AppError, create_error_response


def custom_generate_unique_id(route: APIRoute) -> str:
    return f"{route.tags[0]}-{route.name}"


# 只有当sentry_sdk可用时才初始化Sentry
if SENTRY_AVAILABLE and settings.SENTRY_DSN and settings.ENVIRONMENT != "local":
    sentry_sdk.init(dsn=str(settings.SENTRY_DSN), enable_tracing=True)

# Initialize PostHog
if POSTHOG_AVAILABLE and settings.posthog_enabled:
    posthog.api_key = settings.POSTHOG_API_KEY
    posthog.host = settings.POSTHOG_HOST

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    generate_unique_id_function=custom_generate_unique_id,
)

# Set all CORS enabled origins
if settings.all_cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.all_cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Add PostHog middleware
if POSTHOG_AVAILABLE and settings.posthog_enabled:
    app.add_middleware(PostHogMiddleware)

# 添加API响应格式中间件
app.add_middleware(ApiResponseMiddleware)

app.include_router(api_router, prefix=settings.API_V1_STR)

# 异常处理器
@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError):
    """处理应用自定义错误"""
    response, status_code = create_error_response(exc)
    return JSONResponse(
        status_code=status_code,
        content=response.model_dump(exclude_none=True)
    )

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """处理HTTP异常"""
    response, status_code = create_error_response(exc)
    return JSONResponse(
        status_code=status_code,
        content=response.model_dump(exclude_none=True)
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """处理请求验证错误"""
    response, status_code = create_error_response(exc)
    return JSONResponse(
        status_code=status_code,
        content=response.model_dump(exclude_none=True)
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """处理所有其他异常"""
    response, status_code = create_error_response(exc)
    return JSONResponse(
        status_code=status_code,
        content=response.model_dump(exclude_none=True)
    )
