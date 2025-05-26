import logging
import os
from typing import Literal

# Use distutils.util.strtobool for tolerant boolean parsing
try:
    from distutils.util import strtobool
except ImportError:

    def strtobool(val: str) -> Literal[0, 1]:
        return 1 if val.lower() in ("y", "yes", "t", "true", "on", "1") else 0


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

    # 更严格地检查测试环境变量
    testing_env = os.environ.get("TESTING", "").lower()
    test_mode_env = os.environ.get("TEST_MODE", "").lower()

    # 只有当明确设置为 "true" 时才视为测试模式
    is_testing = testing_env == "true" and test_mode_env == "true"

    if is_testing:
        logger.info("测试模式已激活：TESTING=true, TEST_MODE=true")

        # 不要重新创建测试数据库，只是检查连接
        # 测试数据库应该已经在 tests-start.sh 中创建和初始化了
        from app.tests.utils.test_db import get_test_db_url

        try:
            # 从 sqlmodel 导入 create_engine
            from sqlmodel import create_engine

            # 创建测试数据库引擎并进行连接测试
            test_engine = create_engine(get_test_db_url())
            logger.info("连接到现有的测试数据库进行验证...")
            init(test_engine)
            logger.info("测试数据库连接验证成功！")
        except Exception as e:
            logger.error(f"测试数据库连接失败: {e}")
            logger.error("请确保测试数据库已正确创建和初始化")
            raise
    else:
        logger.warning(
            f"当前环境变量：TESTING={testing_env}, TEST_MODE={test_mode_env}"
        )
        logger.warning("需要同时设置 TESTING=true 和 TEST_MODE=true 才能使用测试数据库")

        # 使用正常数据库连接
        logger.info("非测试模式，使用正常数据库连接")
        init(engine)

    logger.info("Service finished initializing")


if __name__ == "__main__":
    main()
