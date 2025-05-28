import os
import sys
from logging.config import fileConfig
from pathlib import Path
import logging

from alembic import context
from sqlalchemy import engine_from_config, pool

# Add the project root directory to the Python path
# Get the directory of the current file
script_dir = Path(__file__).resolve().parent
# Add the project root directory to the Python path, ensuring that the project's modules can be correctly imported
backend_dir = script_dir.parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
fileConfig(config.config_file_name)  # type: ignore

# Get the logger
logger = logging.getLogger("alembic.env")

# add your model's MetaData object here
# for 'autogenerate' support
# from myapp import mymodel
# target_metadata = mymodel.Base.metadata
# target_metadata = None

# Use explicit imports instead of importing from app.models
from sqlmodel import SQLModel  # noqa
# Then import all models, ensuring they are registered to SQLModel.metadata
from app.models import User, Item  # noqa
from app.models.prompt import Prompt, PromptVersion, Tag, PromptTagLink  # noqa
from app.core.config import settings  # noqa
from app.core.db_factory import get_engine_args  # noqa

target_metadata = SQLModel.metadata

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def get_url():
    # Check if we're in testing mode
    """Returns the appropriate database URL based on environment settings."""
    testing_env = os.environ.get("TESTING", "").lower() == "true"
    test_mode_env = os.environ.get("TEST_MODE", "").lower() == "true"

    if testing_env and test_mode_env:
        # Import test database utilities to get test database URL
        try:
            from app.tests.utils.test_db import get_test_db_url
            test_url = get_test_db_url()
            logger.info(f"Using test database URL for migrations: {test_url}")
            return test_url
        except ImportError:
            logger.warning("Could not import test database utilities, falling back to main database")

    return str(settings.SQLALCHEMY_DATABASE_URI)


def print_db_info():
    """Print database connection information"""
    url = get_url()

    # Mask password information for security
    safe_url = url
    if "@" in url:
        # Find the username and password part and replace the password with ****
        userpass_part = url.split("@")[0]
        if ":" in userpass_part:
            username = userpass_part.split("://")[1].split(":")[0]
            safe_url = url.replace(userpass_part, f"{url.split('://')[0]}://{username}:****")

    # Print related configuration information
    logger.info("-" * 50)
    logger.info("Database Connection Information:")
    logger.info(f"Database URL: {safe_url}")
    logger.info(f"Database Type: {settings.DATABASE_TYPE}")

    if settings.DATABASE_TYPE == "supabase":
        logger.info(f"Supabase Pool Mode: {settings.SUPABASE_DB_POOL_MODE}")
        logger.info(f"Supabase Host: {settings.SUPABASE_DB_HOST}")
        logger.info(f"Supabase Port: {settings.SUPABASE_DB_PORT}")
        logger.info(f"Supabase User: {settings.SUPABASE_DB_USER}")
        logger.info(f"Supabase Database: {settings.SUPABASE_DB_NAME}")
    else:
        logger.info(f"Postgres Host: {settings.POSTGRES_SERVER}")
        logger.info(f"Postgres Port: {settings.POSTGRES_PORT}")
        logger.info(f"Postgres User: {settings.POSTGRES_USER}")
        logger.info(f"Postgres Database: {settings.POSTGRES_DB}")

    # Print connection arguments
    engine_args = get_engine_args()
    if engine_args and "connect_args" in engine_args:
        logger.info("Connection Arguments:")
        for key, value in engine_args["connect_args"].items():
            logger.info(f"  - {key}: {value}")

    logger.info("-" * 50)


def run_migrations_offline():
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = get_url()

    # Print database connection information
    print_db_info()

    context.configure(
        url=url, target_metadata=target_metadata, literal_binds=True, compare_type=True
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    # Print database connection information
    print_db_info()

    configuration = config.get_section(config.config_ini_section)
    configuration["sqlalchemy.url"] = get_url()

    # Get database engine specific arguments
    engine_args = get_engine_args()

    # Create engine - directly pass connect_args instead of through configuration
    if engine_args and "connect_args" in engine_args:
        connect_args = engine_args["connect_args"]
    else:
        connect_args = {}

    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
        connect_args=connect_args,  # directly pass connect_args
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata, compare_type=True
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
