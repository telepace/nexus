import logging
import os
import secrets
import warnings
from typing import Annotated, Any, ClassVar, Literal

from pydantic import (
    AnyUrl,
    BeforeValidator,
    EmailStr,
    HttpUrl,
    PostgresDsn,
    computed_field,
    model_validator,
    field_validator,
)
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing_extensions import Self
from cryptography.fernet import Fernet
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

    # Static files directory
    STATIC_DIR: str = os.path.join(
        os.path.dirname(os.path.abspath(__file__)), "../../static"
    )

    # Flag to indicate we're running tests
    TESTING: bool = os.environ.get("TESTING", "").lower() == "true"
    # We also check for TEST_MODE for compatibility
    TEST_MODE: bool = os.environ.get("TEST_MODE", "").lower() == "true"

    APP_SYMMETRIC_ENCRYPTION_KEY: str

    # Optional: Add a validator if Fernet key format is strict
    @field_validator("APP_SYMMETRIC_ENCRYPTION_KEY")
    def validate_symmetric_key(cls, v: str) -> str:
        if not v:
            raise ValueError("APP_SYMMETRIC_ENCRYPTION_KEY must be set")
        # Add more specific validation if needed, e.g., for Fernet key format/length
        # For Fernet, it must be a URL-safe base64-encoded 32-byte key.
        # Example basic check (not exhaustive for Fernet format):
        try:
            Fernet(v.encode()) # Attempt to initialize Fernet to check key validity
        except Exception as e:
            raise ValueError(f"APP_SYMMETRIC_ENCRYPTION_KEY is not a valid Fernet key: {e}")
        return v

    BACKEND_CORS_ORIGINS: Annotated[
        list[AnyUrl] | str, BeforeValidator(parse_cors)
    ] = []

    @computed_field  # type: ignore[prop-decorator]
    @property
    def all_cors_origins(self) -> list[str]:
        return [str(origin).rstrip("/") for origin in self.BACKEND_CORS_ORIGINS] + [
            self.FRONTEND_HOST
        ]

    PROJECT_NAME: str = "nexus"
    SENTRY_DSN: HttpUrl | None = None

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
    FIRST_SUPERUSER: EmailStr = "admin@example.com"
    FIRST_SUPERUSER_PASSWORD: str = "telepace"

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

    @property
    def google_oauth_redirect_uri(self) -> str:
        """Generate Google OAuth redirect URI pointing to backend API."""
        # 使用后端 API URL 而不是前端 URL
        redirect_uri = f"{self.BACKEND_API_URL}/api/v1/login/google/callback"
        # 打印调试信息
        logger.info(f"Configured Google OAuth redirect_uri: {redirect_uri}")
        logger.info("Make sure this matches your Google Console configuration")
        return redirect_uri

    # 静态文件URL前缀
    STATIC_URL: str = "/static"

    # 存储服务配置
    STORAGE_BACKEND: str = "local"  # 可选值: local, s3, r2

    # S3 配置
    S3_ACCESS_KEY_ID: str = ""
    S3_SECRET_ACCESS_KEY: str = ""
    S3_REGION: str = "us-east-1"
    S3_BUCKET: str = ""
    S3_PUBLIC_URL: str = ""
    S3_ENDPOINT_URL: str | None = None

    # Cloudflare R2 配置
    R2_ACCOUNT_ID: str = ""
    R2_ACCESS_KEY_ID: str = ""
    R2_SECRET_ACCESS_KEY: str = ""
    R2_BUCKET: str = ""
    R2_PUBLIC_URL: str = ""

    def _check_default_secret(self, var_name: str, value: str | None) -> None:
        """Check if the provided secret value is "nexus" and raise a warning or error."""
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


settings = Settings()
