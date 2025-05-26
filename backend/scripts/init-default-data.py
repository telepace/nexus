#!/usr/bin/env python3
"""
Initialize default data script.

This script initializes the database with default admin user and basic prompts.
Can be run independently to set up initial data.
"""

import logging
import sys
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

# Local imports after path modification
from sqlmodel import Session  # noqa: E402

from app.core.db import engine, init_db  # noqa: E402

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def main() -> None:
    """Initialize default data."""
    logger.info("🌱 开始初始化默认数据...")

    try:
        with Session(engine) as session:
            init_db(session)

        logger.info("✅ 默认数据初始化完成！")
        logger.info("")
        logger.info("📋 初始化内容包括:")
        logger.info("👤 管理员账户: admin@telepace.cc")
        logger.info("🔑 管理员密码: telepace")
        logger.info(
            "📝 基础提示词: 4个 (总结全文、提取核心要点、用大白话解释、生成讨论问题)"
        )
        logger.info("🏷️  基础标签: 4个 (文章分析、内容理解、学习辅助、思维拓展)")

    except Exception as e:
        logger.error(f"❌ 初始化失败: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
