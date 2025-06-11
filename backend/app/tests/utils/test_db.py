"""
Test database utilities for isolating tests from production database.

这个模块提供了测试数据库的隔离机制，确保测试不会影响真实的数据库环境。
主要功能包括：
1. 创建和准备测试数据库
2. 创建和管理测试专用的数据库引擎
3. 测试后清理测试数据库

设计决策：
- 测试数据库使用主数据库名称加 _test 后缀，明确区分测试环境
- 使用 SQLModel.metadata.create_all() 直接创建表，避免 Alembic 迁移的复杂性
- 测试完成后自动删除测试数据库，确保环境干净
- 使用直接的 psycopg 连接进行数据库管理操作，避免 SQLAlchemy 事务限制
"""

import importlib.util
import logging
import os
import warnings
from typing import Any

import psycopg
from sqlalchemy import Engine, create_engine, text
from sqlalchemy.exc import OperationalError, ProgrammingError
from sqlmodel import Session, SQLModel

from app.core.config import settings
from alembic import command
from alembic.config import Config

# Suppress Alembic warnings
warnings.filterwarnings("ignore", category=UserWarning, module="alembic")

logger = logging.getLogger(__name__)

# Constants for test database
TEST_DB_SUFFIX = "_test"
DEFAULT_DB = "postgres"  # Default database to connect when creating test DB


def get_test_db_name() -> str:
    """Get the name of the test database, based on the main DB name with a suffix."""
    return f"{settings.POSTGRES_DB}{TEST_DB_SUFFIX}"


def get_test_db_url() -> str:
    """
    Constructs and returns the test database URL.
    Uses the production database settings but changes the database name to nexus_test.
    """
    if settings.POSTGRES_SERVER:
        return (
            f"postgresql+psycopg://{settings.POSTGRES_USER}:{settings.POSTGRES_PASSWORD}"
            f"@{settings.POSTGRES_SERVER}:{settings.POSTGRES_PORT}/{settings.POSTGRES_DB}_test"
        )
    else:
        return "sqlite:///./test.db"  # Fallback for testing


def get_connection_string() -> str:
    """Get the psycopg connection string for the default database."""
    # 连接到默认数据库而非测试数据库，用于创建/删除测试数据库
    return f"postgresql://{settings.POSTGRES_USER}:{settings.POSTGRES_PASSWORD}@{settings.POSTGRES_SERVER}:{settings.POSTGRES_PORT}/{DEFAULT_DB}"


def create_test_database() -> None:
    """Create the test database if it doesn't exist."""
    db_url = get_test_db_url()
    admin_db_url = None

    if settings.POSTGRES_SERVER:
        # Create database URL for admin operations (connecting to 'postgres' database)
        admin_db_url = (
            f"postgresql+psycopg://{settings.POSTGRES_USER}:{settings.POSTGRES_PASSWORD}"
            f"@{settings.POSTGRES_SERVER}:{settings.POSTGRES_PORT}/postgres"
        )

        admin_engine = None
        try:
            # Create an engine to connect to the admin database
            admin_engine = create_engine(
                admin_db_url, 
                isolation_level="AUTOCOMMIT",
                pool_pre_ping=True,
                pool_recycle=300,
                connect_args={"connect_timeout": 10}
            )

            # Check if test database exists and create if it doesn't
            db_name = f"{settings.POSTGRES_DB}_test"
            
            with admin_engine.connect() as conn:
                # Check if database exists - use text() for raw SQL
                result = conn.execute(
                    text("SELECT 1 FROM pg_database WHERE datname = :db_name"), 
                    {"db_name": db_name}
                )
                if not result.fetchone():
                    # Use text() for raw SQL when creating database
                    conn.execute(text(f'CREATE DATABASE "{db_name}"'))
                    logger.info(f"Test database '{db_name}' created successfully")
                else:
                    logger.info(f"Test database '{db_name}' already exists")
            
            admin_engine.dispose()

        except Exception as e:
            logger.error(f"Error creating test database: {e}")
            if admin_engine:
                admin_engine.dispose()
            raise
    else:
        logger.info("Using SQLite for testing")


def drop_test_database() -> None:
    """Drop the test database if it exists."""
    if not settings.POSTGRES_SERVER:
        # For SQLite, just remove the file
        if os.path.exists("./test.db"):
            os.remove("./test.db")
        return

    admin_db_url = (
        f"postgresql+psycopg://{settings.POSTGRES_USER}:{settings.POSTGRES_PASSWORD}"
        f"@{settings.POSTGRES_SERVER}:{settings.POSTGRES_PORT}/postgres"
    )

    admin_engine = None
    try:
        admin_engine = create_engine(
            admin_db_url, 
            isolation_level="AUTOCOMMIT",
            pool_pre_ping=True,
            pool_recycle=300,
            connect_args={"connect_timeout": 10}
        )

        db_name = f"{settings.POSTGRES_DB}_test"
        
        with admin_engine.connect() as conn:
            # Terminate all connections to the test database - use text() for raw SQL
            conn.execute(
                text("""
                    SELECT pg_terminate_backend(pg_stat_activity.pid) 
                    FROM pg_stat_activity 
                    WHERE pg_stat_activity.datname = :db_name 
                    AND pid <> pg_backend_pid()
                """),
                {"db_name": db_name}
            )
            
            # Check if database exists before dropping - use text() for raw SQL
            result = conn.execute(
                text("SELECT 1 FROM pg_database WHERE datname = :db_name"),
                {"db_name": db_name}
            )
            if result.fetchone():
                conn.execute(text(f'DROP DATABASE "{db_name}"'))
                logger.info(f"Test database '{db_name}' dropped successfully")
        
        admin_engine.dispose()

    except Exception as e:
        logger.warning(f"Error dropping test database: {e}")
        if admin_engine:
            admin_engine.dispose()


def apply_migrations(db_url: str = None) -> None:
    """Apply Alembic migrations to the test database."""
    if db_url is None:
        db_url = get_test_db_url()

    try:
        # 确保所有模型被导入
        from app.models import (
            ContentChunk,
            ContentItem,
            ContentItemTag,
            ContentShare,
            Project,
            QueryRoute,
            User,
        )

        # Configure Alembic
        alembic_cfg = Config("alembic.ini")
        alembic_cfg.set_main_option("sqlalchemy.url", db_url)

        # Apply migrations
        command.upgrade(alembic_cfg, "head")
        logger.info("Migrations applied successfully")
        
    except Exception as e:
        logger.error(f"Error applying migrations: {e}")
        raise


def apply_migrations_with_engine(engine: Engine) -> None:
    """Apply Alembic migrations using an existing engine."""
    try:
        # 确保所有模型被导入
        from app.models import (
            ContentChunk,
            ContentItem,
            ContentItemTag,
            ContentShare,
            Project,
            QueryRoute,
            User,
        )

        # Get the database URL from the engine
        db_url = str(engine.url)

        # Configure Alembic
        alembic_cfg = Config("alembic.ini")
        alembic_cfg.set_main_option("sqlalchemy.url", db_url)

        # Apply migrations
        command.upgrade(alembic_cfg, "head")
        logger.info("Migrations applied successfully using existing engine")
        
    except Exception as e:
        logger.error(f"Error applying migrations with engine: {e}")
        raise


def create_tables(engine: Engine) -> None:
    """Create all tables using SQLModel metadata (fallback if migrations fail)."""
    try:
        # 确保所有模型被导入
        from app.models import (
            ContentChunk,
            ContentItem,
            ContentItemTag,
            ContentShare,
            Project,
            QueryRoute,
            User,
        )

        # Create all tables
        SQLModel.metadata.create_all(engine)
        logger.info("Tables created successfully using SQLModel metadata")
        
    except Exception as e:
        logger.error(f"Error creating tables: {e}")
        raise


def setup_test_db() -> Engine:
    """
    Set up the test database.
    
    1. Create the test database
    2. Apply migrations or create tables
    3. Return the engine for use in tests
    """
    try:
        # Create test database
        create_test_database()

        # Create engine for test database
        test_db_url = get_test_db_url()
        test_engine = create_engine(
            test_db_url,
            pool_pre_ping=True,
            pool_recycle=300,
            pool_size=5,
            max_overflow=10,
            connect_args={"connect_timeout": 10} if settings.POSTGRES_SERVER else {}
        )

        # Test the connection
        with test_engine.connect() as conn:
            pass  # Just test if we can connect

        # Try to apply migrations first, fall back to creating tables if that fails
        try:
            apply_migrations_with_engine(test_engine)
        except Exception as e:
            logger.warning(f"Migration failed, falling back to creating tables: {e}")
            create_tables(test_engine)

        logger.info("Test database setup completed successfully")
        return test_engine

    except Exception as e:
        logger.error(f"Failed to set up test database: {e}")  
        raise


def teardown_test_db() -> None:
    """Clean up the test database."""
    try:
        drop_test_database()
        logger.info("Test database cleanup completed")
    except Exception as e:
        logger.warning(f"Error during test database cleanup: {e}")
        # Don't raise exception during cleanup to avoid masking original errors


def test_database_connection() -> bool:
    """测试与测试数据库的连接，用于单元测试。"""
    test_db_url = get_test_db_url()

    # 检查并确保我们使用的驱动在当前环境可用
    driver_name = "postgresql+psycopg"

    # 使用importlib.util.find_spec检查模块可用性
    if importlib.util.find_spec("psycopg"):
        driver_name = "postgresql+psycopg"
    elif importlib.util.find_spec("psycopg2"):
        driver_name = "postgresql+psycopg2"
    else:
        return False  # 如果两个驱动都不可用，则连接失败

    # 确保 URL 使用正确的驱动前缀
    if "postgresql+" in test_db_url:
        parts = test_db_url.split("://", 1)
        prefix = parts[0]
        if prefix != driver_name:
            test_db_url = test_db_url.replace(prefix, driver_name)

    # 创建引擎并测试连接
    engine = create_engine(test_db_url)

    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1")).scalar()
            return result == 1
    except Exception as e:
        logger.warning(f"Database connection test failed: {e}")
        return False
