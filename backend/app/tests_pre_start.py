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
        from app.tests.utils.test_db import get_test_db_url
        from sqlmodel import create_engine
        logger.info("Test mode detected. Using test database.")
        test_engine = create_engine(get_test_db_url())
        init(test_engine)
    else:
        # Use the default engine for normal operation
        init(engine)
    
    logger.info("Service finished initializing")


if __name__ == "__main__":
    main()
