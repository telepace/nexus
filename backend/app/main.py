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

import logging
import os
import traceback

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.routing import APIRoute
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from app.api.main import api_router
from app.api.middlewares.posthog import PostHogMiddleware
from app.api.middlewares.response import ApiResponseMiddleware
from app.core.config import settings
from app.utils.error import AppError, create_error_response

# 设置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("app")


def custom_generate_unique_id(route: APIRoute) -> str:
    # 修复：如果没有 tags，使用路径作为唯一 ID
    if not route.tags:
        return f"path-{route.path}"
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

# 添加 SessionMiddleware，secret_key 建议用 settings.SECRET_KEY
app.add_middleware(SessionMiddleware, secret_key=settings.SECRET_KEY)


@app.get("/api/v1/health", tags=["health"])
async def get_health_api():
    logger.info("收到API级别健康检查请求")
    return {"status": "ok"}


# Set all CORS enabled origins
if settings.ENVIRONMENT == "local":
    # 开发环境允许所有源
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    # 生产环境使用配置的源
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

# 挂载静态文件目录
if os.path.exists(settings.STATIC_DIR):
    app.mount("/static", StaticFiles(directory=settings.STATIC_DIR), name="static")
    logger.info(f"静态文件目录已挂载: {settings.STATIC_DIR}")
else:
    logger.warning(f"静态文件目录不存在: {settings.STATIC_DIR}")
    os.makedirs(settings.STATIC_DIR, exist_ok=True)
    app.mount("/static", StaticFiles(directory=settings.STATIC_DIR), name="static")
    logger.info(f"已创建并挂载静态文件目录: {settings.STATIC_DIR}")


# 异常处理器
@app.exception_handler(AppError)
async def app_error_handler(_request: Request, exc: AppError):
    """处理应用自定义错误"""
    logger.error(f"AppError: {exc.message}", exc_info=True)
    response, status_code = create_error_response(exc)
    return JSONResponse(
        status_code=status_code, content=response.model_dump(exclude_none=True)
    )


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(_request: Request, exc: StarletteHTTPException):
    """处理HTTP异常"""
    logger.error(f"HTTPException: {exc.detail}", exc_info=True)
    response, status_code = create_error_response(exc)
    return JSONResponse(
        status_code=status_code, content=response.model_dump(exclude_none=True)
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_request: Request, exc: RequestValidationError):
    """处理请求验证错误"""
    logger.error(f"ValidationError: {exc}", exc_info=True)
    response, status_code = create_error_response(exc)
    return JSONResponse(
        status_code=status_code, content=response.model_dump(exclude_none=True)
    )


@app.exception_handler(Exception)
async def general_exception_handler(_request: Request, exc: Exception):
    """处理所有其他异常"""
    logger.error(f"Unhandled exception: {str(exc)}")
    logger.error(traceback.format_exc())
    response, status_code = create_error_response(exc)
    return JSONResponse(
        status_code=status_code, content=response.model_dump(exclude_none=True)
    )


# 添加这个 SQLAlchemy 初始化确认
if settings.DATABASE_TYPE == "postgres":
    try:
        from sqlalchemy import create_engine, text

        db_url = str(settings.SQLALCHEMY_DATABASE_URI)
        engine = create_engine(db_url)
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            logger.info(f"数据库连接成功: {result.fetchone()}")
    except Exception as e:
        logger.error(f"数据库连接失败: {e}")
