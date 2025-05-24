#!/usr/bin/env python3
"""
Debug script to check test database superuser.
"""

import os
import logging
from sqlmodel import Session, select

# Set test environment
os.environ["TESTING"] = "true"
os.environ["TEST_MODE"] = "true"
os.environ["FIRST_SUPERUSER_PASSWORD"] = "telepace"
os.environ["FIRST_SUPERUSER"] = "admin@example.com"

from app.core.config import settings
from app.core.security import verify_password
from app.models import User
from app.tests.utils.test_db import setup_test_db

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def debug_test_user():
    """Debug test database superuser."""
    logger.info("🔍 Debugging test database superuser...")
    logger.info(f"FIRST_SUPERUSER: {settings.FIRST_SUPERUSER}")
    logger.info(f"FIRST_SUPERUSER_PASSWORD: {settings.FIRST_SUPERUSER_PASSWORD}")
    
    # Setup test database
    test_engine = setup_test_db()
    
    with Session(test_engine) as session:
        user = session.exec(
            select(User).where(User.email == settings.FIRST_SUPERUSER)
        ).first()
        
        if not user:
            logger.error(f"❌ User {settings.FIRST_SUPERUSER} not found!")
            return False
            
        logger.info(f"✅ User found: {user.email}")
        logger.info(f"Is superuser: {user.is_superuser}")
        logger.info(f"Is active: {user.is_active}")
        
        # Test password
        if verify_password(settings.FIRST_SUPERUSER_PASSWORD, user.hashed_password):
            logger.info("✅ Password verification successful!")
            return True
        else:
            logger.error("❌ Password verification failed!")
            logger.error(f"Expected: {settings.FIRST_SUPERUSER_PASSWORD}")
            return False

if __name__ == "__main__":
    success = debug_test_user()
    exit(0 if success else 1) 