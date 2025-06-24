#!/usr/bin/env python3
"""
数据迁移脚本：将现有数据迁移到新的表结构

使用方法:
    python scripts/migrate_data.py --dry-run  # 预览迁移
    python scripts/migrate_data.py --execute  # 执行迁移
"""

import argparse
import logging
import sys
from pathlib import Path

# 添加项目根目录到 Python 路径
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlmodel import Session, create_engine, text

from app.core.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class DataMigrator:
    """数据迁移器"""

    def __init__(self, dry_run: bool = True):
        self.dry_run = dry_run
        # 直接创建数据库连接
        self.engine = create_engine(str(settings.SQLALCHEMY_DATABASE_URI))
        self.session = Session(self.engine)

    def migrate_summary_data(self):
        """迁移 ContentItem 中的 summary 数据到 AIResult 表"""
        logger.info("开始迁移 summary 数据...")

        # 由于 ContentItem 模型已经重构，没有 summary 字段了
        # 这个步骤可以跳过
        logger.info("ContentItem 模型已重构，无需迁移 summary 数据")

    def migrate_chunk_data(self):
        """迁移 ContentChunk 数据到 Segment 表"""
        logger.info("开始迁移 ContentChunk 数据...")

        # 检查 contentchunk 表是否存在
        try:
            result = self.session.execute(text("SELECT COUNT(*) FROM contentchunk"))
            chunk_count = result.scalar()
            logger.info(f"找到 {chunk_count} 个 chunk 记录")

            if chunk_count == 0:
                logger.info("没有 chunk 数据需要迁移")
                return

            # 迁移数据
            if not self.dry_run:
                self.session.execute(
                    text("""
                    INSERT INTO segments (
                        id, content_item_id, segment_index, content, segment_type,
                        word_count, char_count, meta_info, created_at
                    )
                    SELECT
                        id, content_item_id, chunk_index as segment_index,
                        chunk_content as content,
                        COALESCE(chunk_type, 'paragraph') as segment_type,
                        COALESCE(word_count, 0),
                        COALESCE(char_count, LENGTH(chunk_content)),
                        meta_info, created_at
                    FROM contentchunk
                    WHERE NOT EXISTS (
                        SELECT 1 FROM segments WHERE segments.id = contentchunk.id
                    )
                """)
                )
                self.session.commit()
                logger.info(f"成功迁移 {chunk_count} 个 chunk 记录到 segments 表")
            else:
                logger.info(
                    f"[DRY RUN] 将迁移 {chunk_count} 个 chunk 记录到 segments 表"
                )

        except Exception as e:
            logger.warning(f"ContentChunk 表可能不存在或已迁移: {e}")

    def clean_orphaned_data(self):
        """清理孤立数据"""
        logger.info("开始清理孤立数据...")

        # 清理没有对应 ContentItem 的 AIResult
        try:
            orphaned_ai_results = self.session.execute(
                text("""
                SELECT COUNT(*) FROM ai_results
                WHERE content_item_id NOT IN (SELECT id FROM contentitem)
            """)
            ).scalar()

            if orphaned_ai_results > 0:
                logger.warning(f"发现 {orphaned_ai_results} 个孤立的 AI 结果记录")
                if not self.dry_run:
                    self.session.execute(
                        text("""
                        DELETE FROM ai_results
                        WHERE content_item_id NOT IN (SELECT id FROM contentitem)
                    """)
                    )
                    logger.info(f"清理了 {orphaned_ai_results} 个孤立的 AI 结果记录")
                else:
                    logger.info(
                        f"[DRY RUN] 将清理 {orphaned_ai_results} 个孤立的 AI 结果记录"
                    )
        except Exception as e:
            logger.warning(f"清理 AI 结果时出错: {e}")

        # 清理没有对应 ContentItem 的 Segment
        try:
            orphaned_segments = self.session.execute(
                text("""
                SELECT COUNT(*) FROM segments
                WHERE content_item_id NOT IN (SELECT id FROM contentitem)
            """)
            ).scalar()

            if orphaned_segments > 0:
                logger.warning(f"发现 {orphaned_segments} 个孤立的分段记录")
                if not self.dry_run:
                    self.session.execute(
                        text("""
                        DELETE FROM segments
                        WHERE content_item_id NOT IN (SELECT id FROM contentitem)
                    """)
                    )
                    logger.info(f"清理了 {orphaned_segments} 个孤立的分段记录")
                else:
                    logger.info(
                        f"[DRY RUN] 将清理 {orphaned_segments} 个孤立的分段记录"
                    )
        except Exception as e:
            logger.warning(f"清理分段时出错: {e}")

        if not self.dry_run:
            self.session.commit()

    def validate_migration(self):
        """验证迁移结果"""
        logger.info("验证迁移结果...")

        try:
            # 检查 AI 结果统计
            ai_results_count = self.session.execute(
                text("SELECT COUNT(*) FROM ai_results")
            ).scalar()
            logger.info(f"AI 结果记录总数: {ai_results_count}")

            # 检查分段统计
            segments_count = self.session.execute(
                text("SELECT COUNT(*) FROM segments")
            ).scalar()
            logger.info(f"分段记录总数: {segments_count}")

            # 检查内容项统计
            content_items_count = self.session.execute(
                text("SELECT COUNT(*) FROM contentitem")
            ).scalar()
            logger.info(f"内容项总数: {content_items_count}")

            # 检查外键完整性
            invalid_ai_results = self.session.execute(
                text("""
                SELECT COUNT(*) FROM ai_results
                WHERE content_item_id NOT IN (SELECT id FROM contentitem)
            """)
            ).scalar()

            invalid_segments = self.session.execute(
                text("""
                SELECT COUNT(*) FROM segments
                WHERE content_item_id NOT IN (SELECT id FROM contentitem)
            """)
            ).scalar()

            if invalid_ai_results > 0 or invalid_segments > 0:
                logger.error(
                    f"数据完整性检查失败: {invalid_ai_results} 个无效 AI 结果, {invalid_segments} 个无效分段"
                )
                return False
            else:
                logger.info("数据完整性检查通过")
                return True

        except Exception as e:
            logger.error(f"验证迁移时出错: {e}")
            return False

    def run_migration(self):
        """执行完整的迁移流程"""
        logger.info(f"开始数据迁移 {'(预览模式)' if self.dry_run else '(执行模式)'}")

        try:
            # 1. 迁移 summary 数据
            self.migrate_summary_data()

            # 2. 迁移 chunk 数据
            self.migrate_chunk_data()

            # 3. 清理孤立数据
            self.clean_orphaned_data()

            # 4. 验证迁移结果
            if self.validate_migration():
                logger.info("数据迁移完成并验证通过")
                return True
            else:
                logger.error("数据迁移验证失败")
                return False

        except Exception as e:
            logger.error(f"数据迁移失败: {e}")
            if not self.dry_run:
                self.session.rollback()
            return False
        finally:
            self.session.close()


def main():
    parser = argparse.ArgumentParser(description="数据迁移脚本")
    parser.add_argument(
        "--dry-run", action="store_true", help="预览模式，不实际执行迁移"
    )
    parser.add_argument("--execute", action="store_true", help="执行迁移")

    args = parser.parse_args()

    if not args.dry_run and not args.execute:
        print("请指定 --dry-run 或 --execute 参数")
        sys.exit(1)

    if args.dry_run and args.execute:
        print("--dry-run 和 --execute 不能同时使用")
        sys.exit(1)

    migrator = DataMigrator(dry_run=args.dry_run)
    success = migrator.run_migration()

    if success:
        print("迁移完成")
        sys.exit(0)
    else:
        print("迁移失败")
        sys.exit(1)


if __name__ == "__main__":
    main()
