import logging
import os
import secrets
import warnings
from typing import Annotated, Any, ClassVar, Literal

from cryptography.fernet import Fernet
from pydantic import (
    AnyUrl,
    BeforeValidator,
    EmailStr,
    Field,
    HttpUrl,
    PostgresDsn,
    computed_field,
    field_validator,
    model_validator,
)
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing_extensions import Self
from yarl import URL

# Set up logger
logger = logging.getLogger("app.config")


def parse_cors(v: Any) -> list[str] | str:
    if isinstance(v, str) and not v.startswith("["):
        return [i.strip() for i in v.split(",")]
    elif isinstance(v, list | str):
        return v
    raise ValueError(v)


class Settings(BaseSettings):
    # Use ClassVar to indicate this is not a model field
    env_file_path: ClassVar[str] = os.environ.get("ENV_FILE", "../.env")

    model_config = SettingsConfigDict(
        # Use dynamic environment file path
        env_file=env_file_path,
        env_ignore_empty=True,
        extra="ignore",
    )

    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = secrets.token_urlsafe(32)
    # 60 minutes * 24 hours * 8 days = 8 days
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8
    FRONTEND_HOST: str = "http://localhost:5173"
    ENVIRONMENT: Literal["local", "staging", "production"] = "local"

    # Flag to indicate we're running tests
    TESTING: bool = os.environ.get("TESTING", "").lower() == "true"
    # We also check for TEST_MODE for compatibility
    TEST_MODE: bool = os.environ.get("TEST_MODE", "").lower() == "true"

    APP_SYMMETRIC_ENCRYPTION_KEY: str = Field(
        default_factory=lambda: Fernet.generate_key().decode()
        if os.environ.get("TESTING", "").lower() == "true"
        or os.environ.get("DOCS_GENERATION", "").lower() == "true"
        else "",
        description="Symmetric encryption key for password encryption (Fernet key)",
    )

    # Optional: Add a validator if Fernet key format is strict
    @field_validator("APP_SYMMETRIC_ENCRYPTION_KEY")
    def validate_symmetric_key(cls, v: str) -> str:
        if not v:
            raise ValueError("APP_SYMMETRIC_ENCRYPTION_KEY must be set")
        # Add more specific validation if needed, e.g., for Fernet key format/length
        # For Fernet, it must be a URL-safe base64-encoded 32-byte key.
        # Example basic check (not exhaustive for Fernet format):
        try:
            Fernet(v.encode())  # Attempt to initialize Fernet to check key validity
        except Exception as e:
            raise ValueError(
                f"APP_SYMMETRIC_ENCRYPTION_KEY is not a valid Fernet key: {e}"
            )
        return v

    BACKEND_CORS_ORIGINS: Annotated[
        list[AnyUrl] | str, BeforeValidator(parse_cors)
    ] = []

    @computed_field  # type: ignore[prop-decorator]
    @property
    def all_cors_origins(self) -> list[str]:
        """
        获取所有允许的 CORS 源地址
        包含配置的 BACKEND_CORS_ORIGINS 和 FRONTEND_HOST，
        同时自动添加常用的本地开发地址
        """
        origins = []

        # 添加配置的 CORS 源
        if self.BACKEND_CORS_ORIGINS:
            if isinstance(self.BACKEND_CORS_ORIGINS, str):
                # 如果是字符串，按逗号分割
                for origin_str in self.BACKEND_CORS_ORIGINS.split(","):
                    origin_str = origin_str.strip()
                    if origin_str:
                        origins.append(origin_str.rstrip("/"))
            else:
                # 如果是列表
                for origin_url in self.BACKEND_CORS_ORIGINS:
                    url_str: str = str(origin_url)
                    origins.append(url_str.rstrip("/"))

        # 添加前端主机
        if self.FRONTEND_HOST:
            origins.append(self.FRONTEND_HOST.rstrip("/"))

        # 自动添加常用的本地开发地址（避免重复）
        additional_origins = [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "https://localhost:3000",
            "https://127.0.0.1:3000",
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "https://localhost:5173",
            "https://127.0.0.1:5173",
        ]

        for origin in additional_origins:
            if origin not in origins:
                origins.append(origin)

        logger.info(f"Configured CORS origins: {origins}")
        return origins

    PROJECT_NAME: str = "nexus"
    SENTRY_DSN: HttpUrl | None = None
    LITELLM_PROXY_URL: str = "http://litellm:4000"
    LITELLM_MASTER_KEY: str | None = None

    # LLM 配置
    DEFAULT_LLM_MODEL: str = "or-kimi-k2"

    # Token 配置系统 - 支持不同任务类型的token限制
    DEFAULT_MAX_TOKENS: int = Field(
        default=8000,
        ge=100,
        le=100000,
        description="默认最大token数"
    )

    # 不同任务类型的token配置
    TOKEN_LIMITS: dict[str, int] = Field(
        default={
            "chat": 10000,              # 对话聊天
            "summary": 10000,           # 摘要生成
            "key_points": 10000,        # 要点提取
            "labels": 10000,             # 标签生成
            "analysis": 10000,         # 深度分析
            "extension": 10000,         # 浏览器扩展
            "conversation": 10000,      # 对话系统
            "completion": 10000,        # 通用补全
            "research": 10000,         # 深度研究
            "segmentation": 10000,      # 文本分段
            "embedding": 10000,         # 嵌入生成
        },
        description="不同任务类型的token限制配置"
    )

    # 环境变量覆盖的单独token配置
    TOKEN_LIMIT_CHAT: int | None = Field(default=None, description="对话token限制")
    TOKEN_LIMIT_SUMMARY: int | None = Field(default=None, description="摘要token限制")
    TOKEN_LIMIT_KEY_POINTS: int | None = Field(default=None, description="要点token限制")
    TOKEN_LIMIT_LABELS: int | None = Field(default=None, description="标签token限制")
    TOKEN_LIMIT_ANALYSIS: int | None = Field(default=None, description="分析token限制")
    TOKEN_LIMIT_EXTENSION: int | None = Field(default=None, description="扩展token限制")
    TOKEN_LIMIT_CONVERSATION: int | None = Field(default=None, description="对话系统token限制")
    TOKEN_LIMIT_COMPLETION: int | None = Field(default=None, description="补全token限制")
    TOKEN_LIMIT_RESEARCH: int | None = Field(default=None, description="研究token限制")

    # 动态token配置
    ENABLE_DYNAMIC_TOKEN_ADJUSTMENT: bool = Field(
        default=True,
        description="是否启用基于内容长度的动态token调整"
    )

    TOKEN_CONTENT_RATIO: float = Field(
        default=0.3,
        ge=0.1,
        le=0.8,
        description="输出token与输入内容长度的比例（用于动态调整）"
    )

    MIN_OUTPUT_TOKENS: int = Field(
        default=500,
        ge=100,
        le=2000,
        description="最小输出token数"
    )

    MAX_OUTPUT_TOKENS: int = Field(
        default=50000,
        ge=1000,
        le=200000,
        description="最大输出token数"
    )

    @computed_field  # type: ignore[prop-decorator]
    @property
    def resolved_token_limits(self) -> dict[str, int]:
        """
        解析最终的token限制配置

        优先级：
        1. 环境变量中的具体任务token配置 (TOKEN_LIMIT_CHAT等)
        2. TOKEN_LIMITS 配置
        3. DEFAULT_MAX_TOKENS 全局默认

        Returns:
            dict: 最终的任务->token限制映射
        """
        resolved = self.TOKEN_LIMITS.copy()

        # 环境变量覆盖具体任务token限制
        env_overrides = {
            "chat": self.TOKEN_LIMIT_CHAT,
            "summary": self.TOKEN_LIMIT_SUMMARY,
            "key_points": self.TOKEN_LIMIT_KEY_POINTS,
            "labels": self.TOKEN_LIMIT_LABELS,
            "analysis": self.TOKEN_LIMIT_ANALYSIS,
            "extension": self.TOKEN_LIMIT_EXTENSION,
            "conversation": self.TOKEN_LIMIT_CONVERSATION,
            "completion": self.TOKEN_LIMIT_COMPLETION,
            "research": self.TOKEN_LIMIT_RESEARCH,
        }

        for task, token_limit in env_overrides.items():
            if token_limit is not None:  # 如果环境变量设置了具体token限制
                resolved[task] = token_limit

        # 确保所有值都有回退到默认token数
        for task in resolved:
            if not resolved[task] or resolved[task] <= 0:
                resolved[task] = self.DEFAULT_MAX_TOKENS

        return resolved

    def get_token_limit(
        self,
        task_type: str = "default",
        content_length: int | None = None,
        base_tokens: int | None = None
    ) -> int:
        """
        获取指定任务类型的token限制

        Args:
            task_type: 任务类型
            content_length: 输入内容长度（用于动态调整）
            base_tokens: 基础token数（覆盖默认配置）

        Returns:
            int: 最终的token限制
        """
        # 获取基础token限制
        if base_tokens is not None:
            token_limit = base_tokens
        else:
            token_limit = self.resolved_token_limits.get(task_type, self.DEFAULT_MAX_TOKENS)

        # 动态调整token限制
        if self.ENABLE_DYNAMIC_TOKEN_ADJUSTMENT and content_length is not None:
            # 基于内容长度计算推荐的输出token数
            estimated_output_tokens = int(content_length * self.TOKEN_CONTENT_RATIO)

            # 应用最小值和最大值限制
            estimated_output_tokens = max(self.MIN_OUTPUT_TOKENS, estimated_output_tokens)
            estimated_output_tokens = min(self.MAX_OUTPUT_TOKENS, estimated_output_tokens)

            # 如果估算值更大，使用估算值；否则使用配置值
            token_limit = max(token_limit, estimated_output_tokens)

            logger.debug(f"动态调整token限制: 任务={task_type}, 内容长度={content_length}, "
                        f"原始限制={self.resolved_token_limits.get(task_type, self.DEFAULT_MAX_TOKENS)}, "
                        f"估算需求={estimated_output_tokens}, 最终限制={token_limit}")

        return min(token_limit, self.MAX_OUTPUT_TOKENS)  # 确保不超过绝对最大值

    # AI任务模型配置 - 支持为不同任务指定不同模型，可通过环境变量覆盖
    AI_TASK_MODELS: dict[str, str] = Field(
        default={
            "summary": "or-kimi-k2",  # Summary生成模型
            "key_points": "deepseek-v3-ensemble",  # KeyPoint提取模型
            "labels": "deepseek-v3-ensemble",  # Labels生成模型
            "chat": "or-kimi-k2",  # 对话聊天模型
            "analysis": "or-kimi-k2",  # 通用分析模型
        },
        description="AI任务模型映射配置，可通过环境变量覆盖，如：AI_MODEL_SUMMARY=gpt-4",
    )

    # 单独的模板模型配置，方便精细控制
    AI_MODEL_SUMMARY: str | None = Field(
        default=None, description="Summary模板专用模型"
    )
    AI_MODEL_KEY_POINTS: str | None = Field(
        default=None, description="KeyPoints模板专用模型"
    )
    AI_MODEL_LABELS: str | None = Field(default=None, description="Labels模板专用模型")
    AI_MODEL_CHAT: str | None = Field(default=None, description="Chat对话专用模型")
    AI_MODEL_ANALYSIS: str | None = Field(default=None, description="通用分析专用模型")

    @computed_field  # type: ignore[prop-decorator]
    @property
    def resolved_ai_task_models(self) -> dict[str, str]:
        """
        解析最终的AI任务模型配置

        优先级：
        1. 环境变量中的具体模型配置 (AI_MODEL_SUMMARY等)
        2. AI_TASK_MODELS 配置
        3. DEFAULT_LLM_MODEL 全局默认

        Returns:
            dict: 最终的任务->模型映射
        """
        resolved = self.AI_TASK_MODELS.copy()

        # 环境变量覆盖具体任务模型
        env_overrides = {
            "summary": self.AI_MODEL_SUMMARY,
            "key_points": self.AI_MODEL_KEY_POINTS,
            "labels": self.AI_MODEL_LABELS,
            "chat": self.AI_MODEL_CHAT,
            "analysis": self.AI_MODEL_ANALYSIS,
        }

        for task, model in env_overrides.items():
            if model:  # 如果环境变量设置了具体模型
                resolved[task] = model

        # 确保所有值都有回退到默认模型
        for task in resolved:
            if not resolved[task]:
                resolved[task] = self.DEFAULT_LLM_MODEL

        return resolved

    # OpenAI / ChatAnywhere 配置
    OPENAI_API_KEY: str | None = None
    OPENAI_BASE_URL: str = (
        "https://api.openai.com"  # 默认为官方端点，可通过环境变量覆盖
    )

    # Redis 配置
    REDIS_HOST: str = Field(default="localhost", description="Redis 服务器主机地址")
    REDIS_PORT: int = Field(default=6379, description="Redis 服务器端口")
    REDIS_DB: int = Field(default=0, description="Redis 数据库编号")
    REDIS_PASSWORD: str | None = Field(default=None, description="Redis 密码")

    @computed_field  # type: ignore[prop-decorator]
    @property
    def redis_url(self) -> str:
        """构建 Redis 连接 URL"""
        if self.REDIS_PASSWORD:
            return f"redis://:{self.REDIS_PASSWORD}@{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"

    REDIS_TTL_SECONDS: int = Field(
        default=86400, description="Redis 缓存 TTL，默认 24 小时"
    )
    REDIS_ENABLED: bool = Field(default=True, description="是否启用 Redis 缓存")

    # Database configuration
    DATABASE_TYPE: Literal["postgres", "supabase"] = "postgres"

    # Supabase configuration - these will not be used when using postgres database type
    SUPABASE_URL: str | None = None
    SUPABASE_API_KEY: str | None = None
    SUPABASE_JWT_SECRET: str | None = None

    # When using Supabase, we can still use the PostgreSQL connection directly
    SUPABASE_DB_HOST: str | None = None
    SUPABASE_DB_PORT: int | None = None
    SUPABASE_DB_USER: str | None = None
    SUPABASE_DB_PASSWORD: str | None = None
    SUPABASE_DB_NAME: str | None = None
    # Connection pool mode configuration - supports session and transaction modes
    SUPABASE_DB_POOL_MODE: Literal["session", "transaction"] = "session"

    # Direct PostgreSQL connection settings
    # Set default values to connect to the local database
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_DB: str = "postgres"

    @computed_field  # type: ignore[prop-decorator]
    @property
    def SQLALCHEMY_DATABASE_URI(self) -> PostgresDsn:
        # Check if we're running in test mode and modify database name if needed
        postgres_db = self.POSTGRES_DB

        # Log information about test status
        if self.TESTING or self.TEST_MODE:
            logger.info("Test mode detected. Using test database configuration.")
            # Note: We don't modify the database name here
            # That will be handled by the test_db.py utilities

        # Return different connection URI based on database type
        """Returns the SQLAlchemy database URI based on the configured database type.

        This method constructs a connection URI using either Supabase's PostgreSQL
        configuration or standard PostgreSQL settings. It handles URL encoding for
        passwords to ensure compatibility with special characters and logs the port
        used for Supabase connections. The connection URI is built using the
        `MultiHostUrl` class, specifying the scheme, username, password, host, port,
        and database name.

        Args:
            self: An instance of the class containing the configuration attributes.

        Returns:
            A PostgresDsn object representing the constructed database URI.
        """
        if self.DATABASE_TYPE == "supabase" and self.SUPABASE_DB_HOST:
            # Use Supabase's PostgreSQL connection (direct connection)
            # Choose port based on connection pool mode
            port = self.SUPABASE_DB_PORT or (
                6543 if self.SUPABASE_DB_POOL_MODE == "transaction" else 5432
            )

            # Log the port used
            logger.debug(
                f"Using {self.SUPABASE_DB_POOL_MODE} mode to connect to Supabase, port: {port}"
            )

            # URL encode the password to handle special characters
            import urllib.parse

            password = urllib.parse.quote_plus(self.SUPABASE_DB_PASSWORD or "")

            return PostgresDsn(
                str(
                    URL.build(
                        scheme="postgresql+psycopg",
                        user=self.SUPABASE_DB_USER or "",
                        password=password,
                        host=self.SUPABASE_DB_HOST,
                        port=port,
                        path=f"/{self.SUPABASE_DB_NAME or ''}",
                    )
                )
            )
        else:
            # Use standard PostgreSQL connection
            # URL encode the password to handle special characters
            import urllib.parse

            password = urllib.parse.quote_plus(self.POSTGRES_PASSWORD)

            return PostgresDsn(
                str(
                    URL.build(
                        scheme="postgresql+psycopg",
                        user=self.POSTGRES_USER,
                        password=password,
                        host=self.POSTGRES_SERVER,
                        port=self.POSTGRES_PORT,
                        path=f"/{postgres_db}",
                    )
                )
            )

    SMTP_TLS: bool = True
    SMTP_SSL: bool = False
    SMTP_PORT: int = 587
    SMTP_HOST: str | None = None
    SMTP_USER: str | None = None
    SMTP_PASSWORD: str | None = None
    EMAILS_FROM_EMAIL: EmailStr | None = None
    EMAILS_FROM_NAME: EmailStr | None = None

    @model_validator(mode="after")
    def _set_default_emails_from(self) -> Self:
        if not self.EMAILS_FROM_NAME:
            self.EMAILS_FROM_NAME = self.PROJECT_NAME
        return self

    EMAIL_RESET_TOKEN_EXPIRE_HOURS: int = 48

    @computed_field  # type: ignore[prop-decorator]
    @property
    def emails_enabled(self) -> bool:
        return bool(self.SMTP_HOST and self.EMAILS_FROM_EMAIL)

    EMAIL_TEST_USER: EmailStr = "test@example.com"
    FIRST_SUPERUSER: EmailStr = "admin@telepace.cc"
    FIRST_SUPERUSER_PASSWORD: str = "telepace"
    FIRST_SUPERUSER_ID: str | None = None  # 可选的管理员用户ID，如果不设置则自动生成

    # PostHog Configuration
    POSTHOG_API_KEY: str | None = None
    POSTHOG_HOST: str = "https://app.posthog.com"
    POSTHOG_CAPTURE_PERSONAL_INFO: bool = False

    @computed_field  # type: ignore[prop-decorator]
    @property
    def posthog_enabled(self) -> bool:
        return bool(self.POSTHOG_API_KEY and self.ENVIRONMENT != "local")

    # Google OAuth
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    # 后端 API URL 配置，可通过环境变量覆盖
    BACKEND_API_URL: str = "http://localhost:8000"

    # Static files configuration
    STATIC_DIR: str = "static"
    STATIC_URL: str | None = "/static"
    STORAGE_BACKEND: str = "local"

    # S3 Storage Configuration
    S3_ACCESS_KEY_ID: str | None = None
    S3_SECRET_ACCESS_KEY: str | None = None
    S3_REGION: str = "us-east-1"
    S3_BUCKET: str | None = None
    S3_PUBLIC_URL: str | None = None
    S3_ENDPOINT_URL: str | None = None

    # Cloudflare R2 Storage Configuration
    R2_ACCOUNT_ID: str | None = None
    R2_ACCESS_KEY_ID: str | None = None
    R2_SECRET_ACCESS_KEY: str | None = None
    R2_BUCKET: str | None = None
    R2_PUBLIC_URL: str | None = None

    # Jina AI Configuration
    JINA_API_KEY: str | None = None

    # 内容处理器选择 - 简单配置
    CONTENT_PROCESSOR: str = Field(
        default="readability",
        description="选择使用的内容处理器: jina, firecrawl, scrapingbee, readability, markitdown",
    )

    # 内容处理器配置
    CONTENT_PROCESSOR_MAX_RETRIES: int = Field(
        default=2, description="内容处理器最大重试次数"
    )

    CONTENT_PROCESSOR_FALLBACK_ON_ERROR: bool = Field(
        default=True, description="当处理器失败时是否启用回退到其他处理器"
    )

    # 第三方API配置
    FIRECRAWL_API_KEY: str | None = None
    SCRAPINGBEE_API_KEY: str | None = None

    @field_validator("CONTENT_PROCESSOR")
    def validate_content_processor(cls, v):
        """验证内容处理器选择是否有效"""
        DEFAULT_PROCESSOR = "readability"
        valid_processors = {
            "jina",
            "firecrawl",
            "scrapingbee",
            "readability",
            "markitdown",
        }
        if v not in valid_processors:
            raise ValueError(f"无效的处理器名称: {v}. 有效选项: {valid_processors}")
        return v or DEFAULT_PROCESSOR

    @property
    def google_oauth_redirect_uri(self) -> str:
        """Generate Google OAuth redirect URI pointing to backend API."""
        # 使用后端 API URL 而不是前端 URL
        redirect_uri = f"{self.BACKEND_API_URL}/api/v1/login/google/callback"
        # 打印调试信息
        logger.info(f"Configured Google OAuth redirect_uri: {redirect_uri}")
        logger.info("Make sure this matches your Google Console configuration")
        return redirect_uri

    def _check_default_secret(self, var_name: str, value: str | None) -> None:
        """Check if the provided secret value is 'nexus' and raise a warning or error."""
        if value == "nexus":
            message = (
                f'The value of {var_name} is "nexus", '
                "for security, please change it, at least for deployments."
            )
            if self.ENVIRONMENT == "local":
                warnings.warn(message, stacklevel=1)
            else:
                raise ValueError(message)

    @model_validator(mode="after")
    def _enforce_non_default_secrets(self) -> Self:
        self._check_default_secret("SECRET_KEY", self.SECRET_KEY)
        # Check the corresponding password based on the database type
        if self.DATABASE_TYPE == "postgres":
            self._check_default_secret("POSTGRES_PASSWORD", self.POSTGRES_PASSWORD)
        elif self.DATABASE_TYPE == "supabase" and self.SUPABASE_DB_PASSWORD:
            self._check_default_secret(
                "SUPABASE_DB_PASSWORD", self.SUPABASE_DB_PASSWORD
            )

        self._check_default_secret(
            "FIRST_SUPERUSER_PASSWORD", self.FIRST_SUPERUSER_PASSWORD
        )

        # Log database configuration information
        if self.DATABASE_TYPE == "supabase":
            logger.info(
                f"Using Supabase connection pool mode: {self.SUPABASE_DB_POOL_MODE}"
            )

            # Check if the port matches the connection pool mode
            if self.SUPABASE_DB_PORT:
                expected_port = (
                    6543 if self.SUPABASE_DB_POOL_MODE == "transaction" else 5432
                )
                if self.SUPABASE_DB_PORT != expected_port:
                    logger.warning(
                        f"Supabase port ({self.SUPABASE_DB_PORT}) does not match the connection pool mode ({self.SUPABASE_DB_POOL_MODE})."
                        f"Recommended port for {self.SUPABASE_DB_POOL_MODE} mode is {expected_port}"
                    )

        return self


settings = Settings()  # type: ignore[call-arg]
