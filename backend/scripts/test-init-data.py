#!/usr/bin/env python3
"""
Test initialization data script.

This script initializes the test database with default admin user and basic prompts.
Used specifically for testing environment.
"""

import logging
import os
import sys
from pathlib import Path

# Set test environment variables
os.environ["TESTING"] = "true"
os.environ["TEST_MODE"] = "true"

# Add the backend directory to Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

# Local imports after path modification
from sqlalchemy import create_engine  # noqa: E402
from sqlmodel import Session  # noqa: E402

from app.core.db import init_db  # noqa: E402
from app.tests.utils.test_db import get_test_db_url  # noqa: E402

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def main() -> None:
    """Initialize test data."""
    logger.info("🧪 开始初始化测试数据...")

    try:
        # Use test database URL instead of main database
        test_db_url = get_test_db_url()
        test_engine = create_engine(test_db_url)

        with Session(test_engine) as session:
            init_db(session)

        logger.info("✅ 测试数据初始化完成！")
        logger.info("")
        logger.info("📋 测试环境初始化内容包括:")
        logger.info("👤 管理员账户: admin@telepace.cc")
        logger.info("🔑 管理员密码: telepace")
        logger.info(
            "📝 基础提示词: 4个 (总结全文、提取核心要点、用大白话解释、生成讨论问题)"
        )
        logger.info("🏷️  基础标签: 4个 (文章分析、内容理解、学习辅助、思维拓展)")

    except Exception as e:
        logger.error(f"❌ 测试数据初始化失败: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
