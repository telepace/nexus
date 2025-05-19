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

import psycopg
from sqlalchemy import Engine, create_engine, text

from app.core.config import settings

logger = logging.getLogger(__name__)

# Constants for test database
TEST_DB_SUFFIX = "_test"
DEFAULT_DB = "postgres"  # Default database to connect when creating test DB


def get_test_db_name() -> str:
    """Get the name of the test database, based on the main DB name with a suffix."""
    return f"{settings.POSTGRES_DB}{TEST_DB_SUFFIX}"


def get_test_db_url() -> str:
    """Get the SQLAlchemy URL for the test database."""
    # 从主数据库 URL 构建测试数据库 URL
    main_url = str(settings.SQLALCHEMY_DATABASE_URI)
    test_db_name = get_test_db_name()

    # 替换数据库名称部分，并确保使用 psycopg 驱动
    if "postgres://" in main_url or "postgresql://" in main_url:
        # 替换数据库名称
        db_name_part = main_url.split("/")[-1]
        new_url = main_url.replace(db_name_part, test_db_name)

        # 确保使用 psycopg 驱动 (不是 psycopg2)
        if "+psycopg2" in new_url:
            new_url = new_url.replace("+psycopg2", "+psycopg")
        elif (
            "postgresql://" in new_url
            and "+psycopg" not in new_url
            and "+psycopg2" not in new_url
        ):
            new_url = new_url.replace("postgresql://", "postgresql+psycopg://")

        return new_url

    # 如无法解析，则构建新的 URL，显式使用 psycopg
    return f"postgresql+psycopg://{settings.POSTGRES_USER}:{settings.POSTGRES_PASSWORD}@{settings.POSTGRES_SERVER}:{settings.POSTGRES_PORT}/{test_db_name}"


def get_connection_string() -> str:
    """Get the psycopg connection string for the default database."""
    # 连接到默认数据库而非测试数据库，用于创建/删除测试数据库
    return f"postgresql://{settings.POSTGRES_USER}:{settings.POSTGRES_PASSWORD}@{settings.POSTGRES_SERVER}:{settings.POSTGRES_PORT}/{DEFAULT_DB}"


def create_test_database() -> None:
    """Create the test database if it does not exist."""
    test_db_name = get_test_db_name()
    conn_str = get_connection_string()

    logger.info(f"Checking if test database {test_db_name} exists")

    try:
        # 使用 psycopg 直接连接默认数据库
        with psycopg.connect(conn_str) as conn:
            # 设置自动提交，确保每条语句在自己的事务中执行
            conn.autocommit = True

            with conn.cursor() as cur:
                # 检查数据库是否存在
                cur.execute(
                    "SELECT 1 FROM pg_database WHERE datname = %s", (test_db_name,)
                )
                exists = cur.fetchone()

                if exists:
                    logger.info(
                        f"Test database {test_db_name} already exists, dropping it for a clean start"
                    )
                    # 断开可能的所有连接
                    cur.execute(
                        """
                        SELECT pg_terminate_backend(pg_stat_activity.pid)
                        FROM pg_stat_activity
                        WHERE pg_stat_activity.datname = %s
                        AND pid <> pg_backend_pid()
                        """,
                        (test_db_name,),
                    )
                    # 删除数据库
                    cur.execute(f"DROP DATABASE IF EXISTS {test_db_name}")

                # 创建新的测试数据库
                logger.info(f"Creating test database {test_db_name}")
                cur.execute(f"CREATE DATABASE {test_db_name}")
                # 设置所有者和权限
                cur.execute(
                    f"GRANT ALL PRIVILEGES ON DATABASE {test_db_name} TO {settings.POSTGRES_USER}"
                )
                logger.info(f"Test database {test_db_name} created successfully")

    except Exception as e:
        logger.error(f"Error creating test database: {e}")
        # 如果连接失败或数据库已存在的错误，尝试修复
        try:
            # 打印更详细的错误信息以帮助调试
            logger.warning(f"Attempting to recover from error: {str(e)}")
            logger.warning(
                f"Connection string (password hidden): {conn_str.replace(settings.POSTGRES_PASSWORD, '********')}"
            )

            # 重新尝试创建
            with psycopg.connect(conn_str) as conn:
                conn.autocommit = True
                with conn.cursor() as cur:
                    # 强制删除数据库（如果存在）
                    cur.execute(f"DROP DATABASE IF EXISTS {test_db_name}")
                    # 创建数据库
                    cur.execute(f"CREATE DATABASE {test_db_name}")
                    # 设置所有者
                    cur.execute(
                        f"GRANT ALL PRIVILEGES ON DATABASE {test_db_name} TO {settings.POSTGRES_USER}"
                    )
                    logger.info(
                        f"Successfully recovered and created test database {test_db_name}"
                    )
        except Exception as recovery_error:
            logger.error(f"Recovery attempt failed: {recovery_error}")
            raise


def apply_migrations() -> None:
    """Apply database migrations to the test database."""
    try:
        # 我们不再使用 alembic 迁移，因为 env.py 中使用了 fileConfig，在测试中会有问题
        # 改用直接创建表的方式
        from sqlmodel import SQLModel

        # 创建连接到测试数据库的引擎
        test_db_url = get_test_db_url()
        test_engine = create_engine(test_db_url)

        logger.info(f"Creating all tables in test database: {get_test_db_name()}")
        # 直接创建所有表
        SQLModel.metadata.create_all(test_engine)
        logger.info("Created all tables in test database")
    except Exception as e:
        logger.error(f"Error creating tables: {e}")
        raise


def apply_migrations_with_engine(engine: Engine) -> None:
    """Apply database migrations to the test database using an existing engine."""
    try:
        # 使用直接创建表的方式
        from sqlmodel import SQLModel

        logger.info(f"Creating all tables in test database: {get_test_db_name()}")
        # 直接创建所有表
        SQLModel.metadata.create_all(engine)
        logger.info("Created all tables in test database")
    except Exception as e:
        logger.error(f"Error creating tables: {e}")
        raise


def create_tables(engine: Engine) -> None:
    """Create all tables directly using SQLModel metadata."""
    from sqlmodel import SQLModel

    logger.info("Creating tables directly with SQLModel")
    SQLModel.metadata.create_all(engine)
    logger.info("Tables created successfully")


def setup_test_db() -> Engine:
    """Set up the test database, create it if needed, create all tables, and return an engine."""
    # Create test database
    create_test_database()

    # Create and return a new engine connected to the test database
    test_db_url = get_test_db_url()

    # 检查并确保我们使用的驱动在当前环境可用
    driver_name = "postgresql+psycopg"

    # 使用 importlib.util.find_spec 检查模块可用性
    if importlib.util.find_spec("psycopg"):
        driver_name = "postgresql+psycopg"
        logger.info("Using psycopg (v3) driver for database connection")
    elif importlib.util.find_spec("psycopg2"):
        driver_name = "postgresql+psycopg2"
        logger.info("Using psycopg2 driver for database connection")
    else:
        # 如果两者都不可用，尝试安装
        logger.error(
            "Neither psycopg nor psycopg2 is available. Please install one of them."
        )
        logger.info("Attempting to install psycopg[binary]...")
        import subprocess

        try:
            subprocess.check_call(["uv", "pip", "install", "psycopg[binary]"])
            driver_name = "postgresql+psycopg"
            logger.info("Successfully installed and imported psycopg")
        except Exception as e:
            logger.error(f"Failed to install psycopg: {e}")
            raise ImportError(
                "Database driver not available. Install either psycopg2-binary or psycopg[binary]"
            )

    # 确保 URL 使用正确的驱动前缀
    if "postgresql+" in test_db_url:
        parts = test_db_url.split("://", 1)
        prefix = parts[0]
        if prefix != driver_name:
            test_db_url = test_db_url.replace(prefix, driver_name)

    # 使用确定的驱动创建引擎
    test_engine = create_engine(
        test_db_url,
        pool_pre_ping=True,
        pool_recycle=300,
        pool_size=5,
        max_overflow=10,
    )

    # Create all tables using the same engine
    apply_migrations_with_engine(test_engine)

    return test_engine


def teardown_test_db() -> None:
    """Clean up the test database after tests."""
    test_db_name = get_test_db_name()
    conn_str = get_connection_string()

    try:
        # 使用 psycopg 直接连接
        with psycopg.connect(conn_str) as conn:
            conn.autocommit = True

            with conn.cursor() as cur:
                # 断开所有到测试数据库的连接
                logger.info(f"Terminating all connections to {test_db_name}")
                cur.execute(
                    """
                    SELECT pg_terminate_backend(pg_stat_activity.pid)
                    FROM pg_stat_activity
                    WHERE pg_stat_activity.datname = %s
                    AND pid <> pg_backend_pid()
                    """,
                    (test_db_name,),
                )

                # 删除测试数据库
                logger.info(f"Dropping test database {test_db_name}")
                cur.execute(f"DROP DATABASE IF EXISTS {test_db_name}")
                logger.info(f"Test database {test_db_name} dropped successfully")

    except Exception as e:
        logger.warning(f"Error during test database cleanup: {e}")
        # 不抛出异常，避免测试因清理问题而失败


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
