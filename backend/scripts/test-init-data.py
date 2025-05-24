#!/usr/bin/env python3
"""
Test database initialization script.

This script initializes the test database with the same initial data as the main database,
but uses the test database engine and settings appropriate for testing.
"""

import logging
import os

from sqlmodel import Session, create_engine

from app.core.config import settings
from app.core.db import init_db

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def init_test_db() -> None:
    """Initialize test database with initial data."""
    # Ensure we're in testing mode
    if os.environ.get("TESTING") != "true" or os.environ.get("TEST_MODE") != "true":
        logger.error("This script should only be run in testing mode")
        logger.error("Please set TESTING=true and TEST_MODE=true environment variables")
        return

    try:
        # Import test database utilities
        from app.tests.utils.test_db import get_test_db_url

        # Force set test superuser password to a known value for testing
        # This ensures consistency between test database initialization and test expectations
        test_password = "telepace"
        original_password = settings.FIRST_SUPERUSER_PASSWORD
        settings.FIRST_SUPERUSER_PASSWORD = test_password
        
        # Also set environment variable to ensure consistency
        os.environ["FIRST_SUPERUSER_PASSWORD"] = test_password
        
        logger.info(f"Set test superuser password to: {test_password}")
        logger.info(f"Original password was: {original_password}")

        # Create engine for test database
        test_db_url = get_test_db_url()
        test_engine = create_engine(test_db_url, pool_pre_ping=True)

        logger.info("Initializing test database with initial data...")
        logger.info(f"Using test database URL: {test_db_url}")

        # Create session and initialize database with test engine
        with Session(test_engine) as session:
            init_db(session, test_db_url)

        logger.info("✅ Test database initialized successfully with initial data")

    except Exception as e:
        logger.error(f"❌ Failed to initialize test database: {e}")
        raise


def main() -> None:
    """Main function."""
    logger.info("Starting test database initialization...")
    init_test_db()
    logger.info("Test database initialization completed")


if __name__ == "__main__":
    main()
