#!/usr/bin/env python3
"""
Dashboard 重构数据库迁移脚本

执行数据库表结构重构，支持智能问答界面的后端需求。
"""

import logging
import sys
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

# Local imports after path modification
from alembic import command  # noqa: E402
from alembic.config import Config  # noqa: E402
from sqlmodel import Session  # noqa: E402

from app.core.db import engine  # noqa: E402

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def run_migration():
    """运行数据库迁移"""

    logger.info("🚀 开始执行 Dashboard 重构数据库迁移...")

    try:
        # 配置 Alembic
        alembic_cfg = Config(str(backend_dir / "alembic.ini"))
        alembic_cfg.set_main_option(
            "script_location", str(backend_dir / "app" / "alembic")
        )

        # 执行迁移到最新版本
        logger.info("执行数据库迁移到最新版本...")
        command.upgrade(alembic_cfg, "head")

        logger.info("✅ 数据库迁移完成！")

        # 验证新表结构
        with Session(engine) as session:
            # 尝试查询新表来验证迁移是否成功
            result = session.execute(
                "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('projects', 'project_tags', 'contentitem_tags', 'query_routes')"
            )
            tables = [row[0] for row in result.fetchall()]

            expected_tables = [
                "projects",
                "project_tags",
                "contentitem_tags",
                "query_routes",
            ]
            missing_tables = [t for t in expected_tables if t not in tables]

            if missing_tables:
                logger.warning(f"⚠️  以下表未找到: {missing_tables}")
            else:
                logger.info("✅ 所有新表创建成功")

            # 检查 contentitem 表是否有新的 project_id 字段
            result = session.execute("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = 'contentitem' AND column_name = 'project_id'
            """)

            if result.fetchone():
                logger.info("✅ contentitem 表的 project_id 字段添加成功")
            else:
                logger.warning("⚠️  contentitem 表的 project_id 字段未找到")

    except Exception as e:
        logger.error(f"❌ 数据库迁移失败: {e}")
        return False

    return True


def migrate_existing_data():
    """迁移现有数据到新结构"""

    logger.info("🔄 开始迁移现有数据...")

    try:
        with Session(engine) as session:
            # 检查是否有现有的 item 数据需要迁移
            result = session.execute("SELECT COUNT(*) FROM projects")
            projects_count = result.fetchone()[0]

            if projects_count > 0:
                logger.info(f"发现 {projects_count} 个项目已存在")

                # 为现有项目设置默认的新字段值
                session.execute("""
                    UPDATE projects
                    SET
                        ai_context = COALESCE(ai_context, '{}'),
                        project_type = COALESCE(project_type, 'general'),
                        is_active = COALESCE(is_active, true),
                        created_at = COALESCE(created_at, CURRENT_TIMESTAMP),
                        updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP)
                    WHERE
                        ai_context IS NULL OR
                        project_type IS NULL OR
                        is_active IS NULL OR
                        created_at IS NULL OR
                        updated_at IS NULL
                """)

                session.commit()
                logger.info("✅ 现有项目数据更新完成")
            else:
                logger.info("未发现现有项目数据")

    except Exception as e:
        logger.error(f"❌ 数据迁移失败: {e}")
        return False

    return True


def main():
    """主函数"""

    logger.info("=" * 60)
    logger.info("Dashboard 重构数据库迁移工具")
    logger.info("=" * 60)

    # 1. 执行结构迁移
    if not run_migration():
        logger.error("数据库结构迁移失败，停止执行")
        sys.exit(1)

    # 2. 迁移现有数据
    if not migrate_existing_data():
        logger.error("现有数据迁移失败，但表结构已更新")
        sys.exit(1)

    logger.info("=" * 60)
    logger.info("🎉 Dashboard 重构数据库迁移完成！")
    logger.info("=" * 60)
    logger.info("")
    logger.info("新增功能：")
    logger.info("- ✅ 项目智能分类和管理")
    logger.info("- ✅ 智能问答路由系统")
    logger.info("- ✅ 内容项目关联")
    logger.info("- ✅ 标签智能关联")
    logger.info("- ✅ AI 活动记录和分析")
    logger.info("")
    logger.info("可以开始使用新的 Dashboard 智能问答功能了！")


if __name__ == "__main__":
    main()
