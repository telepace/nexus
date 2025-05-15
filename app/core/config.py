from typing import Annotated, Any, ClassVar, Literal
import os
import secrets
import warnings

import logging
from pydantic import (
    AnyUrl,
    BaseModel,
    BeforeValidator,
    EmailStr,
    HttpUrl,
    PostgresDsn,
    computed_field,
    model_validator,
)
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing_extensions import Self
from yarl import URL as MultiHostUrl

# Create a logger for this module
logger = logging.getLogger(__name__)


def parse_cors(v: Any) -> list[str] | str:
    """Parse CORS origins from environment variable.

    Args:
        v: A comma-separated string of allowed origins or a list of origins.

    Returns:
        list: A list of allowed CORS origins.
    """
    if isinstance(v, str) and not v.startswith("["):
        return [i.strip() for i in v.split(",") if i]
    elif isinstance(v, (list, str)):
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

            db_uri = str(MultiHostUrl.build(
                scheme="postgresql+psycopg",
                user=self.SUPABASE_DB_USER or "",
                password=password,
                host=self.SUPABASE_DB_HOST,
                port=port,
                path=f"/{self.SUPABASE_DB_NAME or ''}",
            ))
            return PostgresDsn(db_uri)
        else:
            # Use standard PostgreSQL connection
            # URL encode the password to handle special characters
            import urllib.parse

            password = urllib.parse.quote_plus(self.POSTGRES_PASSWORD)

            db_uri = str(MultiHostUrl.build(
                scheme="postgresql+psycopg",
                user=self.POSTGRES_USER,
                password=password,
                host=self.POSTGRES_SERVER,
                port=self.POSTGRES_PORT,
                path=f"/{self.POSTGRES_DB}",
            ))
            return PostgresDsn(db_uri) 