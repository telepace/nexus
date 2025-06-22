#!/usr/bin/env python3
"""
修复重复segments问题的脚本
删除重复的segment记录，只保留最新的一条
"""

import logging
import uuid
from datetime import datetime

from sqlalchemy import create_engine, text
from sqlmodel import Session, select

from app.core.config import settings
from app.models.content import AIResult, ContentItem, ProcessingJob, Segment

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def cleanup_duplicate_segments():
    """清理重复的segments，只保留最新的记录"""
    engine = create_engine(str(settings.SQLALCHEMY_DATABASE_URI))

    with Session(engine) as session:
        # 查找重复的segments
        duplicate_query = text("""
            SELECT content_item_id, segment_index, COUNT(*) as cnt
            FROM segments
            GROUP BY content_item_id, segment_index
            HAVING COUNT(*) > 1
        """)

        duplicates = session.exec(duplicate_query).fetchall()
        logger.info(f"发现 {len(duplicates)} 组重复的segments")

        if not duplicates:
            logger.info("没有发现重复的segments")
            return

        # 删除重复的segments，保留最新的
        delete_query = text("""
            WITH ranked AS (
                SELECT id, ROW_NUMBER() OVER (
                    PARTITION BY content_item_id, segment_index
                    ORDER BY created_at DESC
                ) AS rnk
                FROM segments
            )
            DELETE FROM segments
            WHERE id IN (SELECT id FROM ranked WHERE rnk > 1)
        """)

        result = session.exec(delete_query)
        deleted_count = result.rowcount
        session.commit()

        logger.info(f"成功删除 {deleted_count} 条重复的segment记录")


def check_content_item_status(content_item_id: str):
    """检查指定content item的处理状态"""
    engine = create_engine(str(settings.SQLALCHEMY_DATABASE_URI))

    with Session(engine) as session:
        # 转换为UUID
        try:
            content_uuid = uuid.UUID(content_item_id)
        except ValueError:
            logger.error(f"无效的UUID格式: {content_item_id}")
            return

        # 查找ContentItem
        content_item = session.exec(
            select(ContentItem).where(ContentItem.id == content_uuid)
        ).first()

        if not content_item:
            logger.error(f"未找到ContentItem: {content_item_id}")
            return

        logger.info(f"ContentItem状态: {content_item.processing_status}")
        logger.info(f"内容长度: {len(content_item.content_text or '')}")

        # 检查segments
        segments = session.exec(
            select(Segment).where(Segment.content_item_id == content_uuid)
        ).all()
        logger.info(f"Segments数量: {len(segments)}")

        # 检查重复的segment_index
        segment_indices = [s.segment_index for s in segments]
        duplicates = [
            idx for idx in set(segment_indices) if segment_indices.count(idx) > 1
        ]
        if duplicates:
            logger.warning(f"发现重复的segment_index: {duplicates}")

        # 检查AI结果
        ai_result = session.exec(
            select(AIResult).where(AIResult.content_item_id == content_uuid)
        ).first()

        if ai_result:
            logger.info("AI结果存在")
            logger.info(f"摘要: {'是' if ai_result.summary else '否'}")
            logger.info(f"要点: {'是' if ai_result.key_points else '否'}")
            logger.info(f"标签: {len(ai_result.labels or [])}")
        else:
            logger.warning("AI结果不存在")

        # 检查ProcessingJob
        processing_jobs = session.exec(
            select(ProcessingJob).where(ProcessingJob.content_item_id == content_uuid)
        ).all()
        logger.info(f"ProcessingJob数量: {len(processing_jobs)}")
        for job in processing_jobs:
            logger.info(f"  - {job.processor_name}: {job.status}")


def create_processing_job_for_ai(content_item_id: str):
    """为指定内容创建AI处理任务"""
    engine = create_engine(str(settings.SQLALCHEMY_DATABASE_URI))

    with Session(engine) as session:
        try:
            content_uuid = uuid.UUID(content_item_id)
        except ValueError:
            logger.error(f"无效的UUID格式: {content_item_id}")
            return

        # 检查是否已存在AI处理任务
        existing_job = session.exec(
            select(ProcessingJob).where(
                ProcessingJob.content_item_id == content_uuid,
                ProcessingJob.processor_name == "ai_initialization",
            )
        ).first()

        if existing_job:
            logger.info(f"AI处理任务已存在，状态: {existing_job.status}")
            return

        # 创建新的处理任务
        job = ProcessingJob(
            content_item_id=content_uuid,
            processor_name="ai_initialization",
            status="pending",
            parameters='{"retry_count": 0}',
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )

        session.add(job)
        session.commit()

        logger.info(f"已创建AI处理任务: {job.id}")


if __name__ == "__main__":
    # 问题内容ID
    problematic_content_id = "c0bfa00e-49d1-429b-bef0-81b1f0d47b63"

    logger.info("开始修复重复segments问题...")

    # 1. 检查问题内容状态
    logger.info(f"检查内容 {problematic_content_id} 的状态...")
    check_content_item_status(problematic_content_id)

    # 2. 清理重复segments
    logger.info("清理重复的segments...")
    cleanup_duplicate_segments()

    # 3. 再次检查状态
    logger.info("清理后再次检查状态...")
    check_content_item_status(problematic_content_id)

    # 4. 创建AI处理任务
    logger.info("创建AI处理任务...")
    create_processing_job_for_ai(problematic_content_id)

    logger.info("修复完成！")
