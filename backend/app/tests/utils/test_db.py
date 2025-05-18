"""
Test database utilities for isolating tests from production database.

This module provides functions to:
1. Create and prepare a test database
2. Create and manage database engine for tests
3. Clean up test database after tests
"""

import logging
import os
from typing import Generator

import psycopg
from alembic import command
from alembic.config import Config
from sqlalchemy import Engine, create_engine, exc, text
from sqlmodel import Session

from app.core.config import settings

logger = logging.getLogger(__name__)

# Constants for test database
TEST_DB_SUFFIX = "_test"
DEFAULT_DB = "postgres"  # Default database to connect when creating test DB


def get_test_db_name() -> str:
    """Get the name of the test database, based on the main DB name with a suffix."""
    return f"{settings.POSTGRES_DB}{TEST_DB_SUFFIX}"


def get_admin_db_url() -> str:
    """Get a connection URL to the default postgres database for admin operations."""
    admin_url = (
        f"postgresql+psycopg://{settings.POSTGRES_USER}:{settings.POSTGRES_PASSWORD}@"
        f"{settings.POSTGRES_SERVER}:{settings.POSTGRES_PORT}/{DEFAULT_DB}"
    )
    return admin_url


def get_test_db_url() -> str:
    """Get the connection URL for the test database."""
    test_db_name = get_test_db_name()
    test_url = (
        f"postgresql+psycopg://{settings.POSTGRES_USER}:{settings.POSTGRES_PASSWORD}@"
        f"{settings.POSTGRES_SERVER}:{settings.POSTGRES_PORT}/{test_db_name}"
    )
    return test_url


def create_test_database() -> None:
    """Create the test database if it doesn't exist."""
    test_db_name = get_test_db_name()
    admin_engine = create_engine(get_admin_db_url())

    try:
        with admin_engine.connect() as conn:
            # Disconnect all active connections to the test DB
            conn.execute(
                text(
                    f"""
                    SELECT pg_terminate_backend(pg_stat_activity.pid)
                    FROM pg_stat_activity
                    WHERE pg_stat_activity.datname = '{test_db_name}'
                    AND pid <> pg_backend_pid()
                    """
                )
            )
            conn.execute(text("COMMIT"))

            # Drop test database if it exists
            conn.execute(text(f"DROP DATABASE IF EXISTS {test_db_name}"))
            conn.execute(text("COMMIT"))

            # Create a new test database
            conn.execute(text(f"CREATE DATABASE {test_db_name}"))
            conn.execute(text("COMMIT"))
            logger.info(f"Created test database: {test_db_name}")
    except Exception as e:
        logger.error(f"Error creating test database: {e}")
        raise
    finally:
        admin_engine.dispose()


def apply_migrations() -> None:
    """Apply database migrations to the test database."""
    try:
        # Get the alembic.ini file path
        basedir = os.path.abspath(os.path.dirname(__file__))
        backend_dir = os.path.abspath(os.path.join(basedir, "../../../.."))
        alembic_cfg = Config(os.path.join(backend_dir, "alembic.ini"))

        # Override the SQLAlchemy URL with our test database URL
        alembic_cfg.set_main_option("sqlalchemy.url", get_test_db_url())

        # Run migrations to the latest version
        command.upgrade(alembic_cfg, "head")
        logger.info("Applied all migrations to test database")
    except Exception as e:
        logger.error(f"Error applying migrations: {e}")
        raise


def setup_test_db() -> Engine:
    """Set up the test database, create it if needed, apply migrations, and return an engine."""
    # Create test database
    create_test_database()

    # Apply migrations
    apply_migrations()

    # Create and return a new engine connected to the test database
    test_db_url = get_test_db_url()
    test_engine = create_engine(
        test_db_url,
        pool_pre_ping=True,
        pool_recycle=300,
        pool_size=5,
        max_overflow=10,
    )
    
    return test_engine


def get_test_db_session() -> Generator[Session, None, None]:
    """Get a session connected to the test database."""
    engine = create_engine(get_test_db_url())
    with Session(engine) as session:
        yield session


def teardown_test_db() -> None:
    """Clean up the test database after tests."""
    # Optional: Drop the test database if you want a totally clean slate next time
    # This can be commented out if you want to inspect the test database after tests
    try:
        admin_engine = create_engine(get_admin_db_url())
        test_db_name = get_test_db_name()

        with admin_engine.connect() as conn:
            # Disconnect all users from the test database
            conn.execute(
                text(
                    f"""
                    SELECT pg_terminate_backend(pg_stat_activity.pid)
                    FROM pg_stat_activity
                    WHERE pg_stat_activity.datname = '{test_db_name}'
                    AND pid <> pg_backend_pid()
                    """
                )
            )
            conn.execute(text("COMMIT"))

            # Drop the test database
            conn.execute(text(f"DROP DATABASE IF EXISTS {test_db_name}"))
            conn.execute(text("COMMIT"))
            logger.info(f"Dropped test database: {test_db_name}")
    except Exception as e:
        logger.warning(f"Could not drop test database: {e}")
    finally:
        if 'admin_engine' in locals():
            admin_engine.dispose() 