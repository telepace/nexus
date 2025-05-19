import logging
import os

from sqlalchemy import Engine
from sqlmodel import Session, select
from tenacity import after_log, before_log, retry, stop_after_attempt, wait_fixed

from app.core.db import engine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

max_tries = 60 * 5  # 5 minutes
wait_seconds = 1


@retry(
    stop=stop_after_attempt(max_tries),
    wait=wait_fixed(wait_seconds),
    before=before_log(logger, logging.INFO),
    after=after_log(logger, logging.WARN),
)
def init(db_engine: Engine) -> None:
    try:
        # Try to create session to check if DB is awake
        with Session(db_engine) as session:
            session.exec(select(1))
    except Exception as e:
        logger.error(e)
        raise e


def main() -> None:
    logger.info("Initializing service")

    # Check if we're running in test mode and should use test database
    is_testing = os.environ.get("TESTING", "").lower() == "true"

    if is_testing:
        # 从 sqlmodel 导入 create_engine 而不是 sqlalchemy，确保使用 psycopg
        from sqlmodel import create_engine

        from app.tests.utils.test_db import (
            create_test_database,
            get_test_db_url,
            setup_test_db,
        )

        logger.info("Test mode detected. Using test database configuration.")

        # 首先创建测试数据库
        try:
            logger.info("Creating test database if it doesn't exist...")
            create_test_database()
        except Exception as e:
            logger.error(f"Failed to create test database: {e}")
            # 如果失败，尝试使用 setup_test_db，它会尝试重新创建
            logger.info("Trying alternative setup approach...")
            test_engine = setup_test_db()
            init(test_engine)
            return

        # 创建数据库引擎并进行连接测试
        test_engine = create_engine(get_test_db_url())
        init(test_engine)
    else:
        # Use the default engine for normal operation
        init(engine)

    logger.info("Service finished initializing")


if __name__ == "__main__":
    main()
