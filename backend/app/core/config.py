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
)
from pydantic_core import MultiHostUrl
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing_extensions import Self

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

            return MultiHostUrl.build(
                scheme="postgresql+psycopg",
                username=self.SUPABASE_DB_USER or "",
                password=password,
                host=self.SUPABASE_DB_HOST,
                port=port,
                path=self.SUPABASE_DB_NAME or "",
            )
        else:
            # Use standard PostgreSQL connection
            # URL encode the password to handle special characters
            import urllib.parse

            password = urllib.parse.quote_plus(self.POSTGRES_PASSWORD)

            return MultiHostUrl.build(
                scheme="postgresql+psycopg",
                username=self.POSTGRES_USER,
                password=password,
                host=self.POSTGRES_SERVER,
                port=self.POSTGRES_PORT,
                path=self.POSTGRES_DB,
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
    FIRST_SUPERUSER_PASSWORD: str = "admin"

    # PostHog Configuration
    POSTHOG_API_KEY: str | None = None
    POSTHOG_HOST: str = "https://app.posthog.com"
    POSTHOG_CAPTURE_PERSONAL_INFO: bool = False

    @computed_field  # type: ignore[prop-decorator]
    @property
    def posthog_enabled(self) -> bool:
        return bool(self.POSTHOG_API_KEY and self.ENVIRONMENT != "local")

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
