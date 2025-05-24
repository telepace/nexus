#!/usr/bin/env python3
"""
Test configuration verification script.

This script verifies that the test environment is properly configured
and that the superuser credentials are consistent.
"""

import logging
import os
import sys

from sqlmodel import Session, select

from app.core.config import settings
from app.core.security import verify_password
from app.models import User
from app.tests.utils.test_db import get_test_db_engine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def verify_test_config() -> bool:
    """Verify test configuration and superuser credentials."""
    try:
        # Check environment variables
        testing = os.environ.get("TESTING", "").lower() == "true"
        test_mode = os.environ.get("TEST_MODE", "").lower() == "true"
        
        logger.info("🔍 Verifying test configuration...")
        logger.info(f"  TESTING: {testing}")
        logger.info(f"  TEST_MODE: {test_mode}")
        logger.info(f"  FIRST_SUPERUSER: {settings.FIRST_SUPERUSER}")
        logger.info(f"  FIRST_SUPERUSER_PASSWORD: {'***' if settings.FIRST_SUPERUSER_PASSWORD else 'NOT SET'}")
        
        if not testing or not test_mode:
            logger.error("❌ Test environment variables not properly set")
            return False
            
        # Check superuser in test database
        test_engine = get_test_db_engine()
        with Session(test_engine) as session:
            user = session.exec(
                select(User).where(User.email == settings.FIRST_SUPERUSER)
            ).first()
            
            if not user:
                logger.error(f"❌ Superuser {settings.FIRST_SUPERUSER} not found in test database")
                return False
                
            # Verify password
            if not verify_password(settings.FIRST_SUPERUSER_PASSWORD, user.hashed_password):
                logger.error("❌ Superuser password does not match")
                logger.error(f"Expected password: {settings.FIRST_SUPERUSER_PASSWORD}")
                return False
                
            logger.info("✅ Test configuration verified successfully")
            logger.info(f"✅ Superuser {settings.FIRST_SUPERUSER} found with correct password")
            return True
            
    except Exception as e:
        logger.error(f"❌ Failed to verify test configuration: {e}")
        return False


def main() -> None:
    """Main function."""
    if not verify_test_config():
        sys.exit(1)
    logger.info("✅ All test configuration checks passed")


if __name__ == "__main__":
    main() 