#!/usr/bin/env python3
"""
手动为指定内容触发AI处理的脚本
用于补跑缺失的AI结果
"""

import asyncio
import logging
import uuid
from datetime import datetime

from sqlmodel import Session, create_engine, select

from app.core.config import settings
from app.models.content import AIResult, ContentItem, ProcessingJob
from app.services.ai.chat_service import ChatService
from app.services.preprocessing_pipeline import (
    ContentType,
    DocumentMetadata,
    PreprocessingPipeline,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def process_ai_for_content_item(content_item_id: str):
    """为指定的content item手动触发AI处理"""
    engine = create_engine(str(settings.SQLALCHEMY_DATABASE_URI))

    # 首先获取内容数据
    content_text = None
    title = None
    source_uri = None

    with Session(engine) as session:
        # 查找ContentItem
        try:
            content_uuid = uuid.UUID(content_item_id)
        except ValueError:
            logger.error(f"无效的UUID格式: {content_item_id}")
            return False

        content_item = session.exec(
            select(ContentItem).where(ContentItem.id == content_uuid)
        ).first()

        if not content_item:
            logger.error(f"未找到ContentItem: {content_item_id}")
            return False

        if not content_item.content_text:
            logger.error(f"ContentItem内容为空: {content_item_id}")
            return False

        # 获取需要的数据
        content_text = content_item.content_text
        title = content_item.title
        source_uri = content_item.source_uri

        logger.info(f"找到ContentItem: {title or '无标题'}")
        logger.info(f"内容长度: {len(content_text)} 字符")

        # 检查是否已有AI结果
        existing_ai_result = session.exec(
            select(AIResult).where(AIResult.content_item_id == content_uuid)
        ).first()

        if existing_ai_result:
            logger.warning("AI结果已存在，将重新生成")

        # 创建ProcessingJob记录
        processing_job = ProcessingJob(
            content_item_id=content_uuid,
            processor_name="manual_ai_processing",
            status="in_progress",
            parameters='{"manual_trigger": true}',
            started_at=datetime.now(),
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )
        session.add(processing_job)
        session.commit()
        session.refresh(processing_job)

        logger.info(f"已创建ProcessingJob: {processing_job.id}")
        processing_job_id = processing_job.id

    try:
        # 创建ChatService和Pipeline
        chat_service = ChatService()
        pipeline = PreprocessingPipeline(chat_service)

        # 构建metadata
        metadata = DocumentMetadata(
            title=title,
            source_url=source_uri,
            content_type=ContentType.WEB_PAGE,
            language="zh"
            if any(ord(char) > 127 for char in content_text[:100])
            else "en",
            estimated_words=len(content_text.split()),
        )

        logger.info("开始AI处理...")

        # 执行AI初始化层
        ai_results, ai_stats = await pipeline._ai_initialization_layer(
            content_text, metadata, user_preferences=None
        )

        logger.info(f"AI处理完成，统计: {ai_stats}")

        # 手动存储AI结果
        with Session(engine) as session:
            # 更新或创建AI结果
            existing_ai_result = session.exec(
                select(AIResult).where(AIResult.content_item_id == content_uuid)
            ).first()

            ai_result_data = {
                "content_item_id": content_uuid,
                "summary": ai_results.get("summary"),
                "key_points": ai_results.get("key_points"),
                "labels": ai_results.get("labels"),
                "content_analysis": ai_results.get("content_analysis"),
                "reading_time_minutes": max(1, metadata.estimated_words // 200),
                "difficulty_level": ai_results.get("content_analysis", {}).get(
                    "difficulty_level", "intermediate"
                ),
                "content_quality_score": pipeline._calculate_quality_score(
                    content_text, ai_results, metadata
                ),
                "updated_at": datetime.now(),
            }

            if existing_ai_result:
                # 更新现有结果
                for key, value in ai_result_data.items():
                    if key != "content_item_id":  # 不更新主键
                        setattr(existing_ai_result, key, value)
                session.add(existing_ai_result)
                logger.info("已更新现有AI结果")
            else:
                # 创建新结果
                ai_result = AIResult(**ai_result_data, created_at=datetime.now())
                session.add(ai_result)
                logger.info("已创建新AI结果")

            # 更新ProcessingJob状态
            job = session.get(ProcessingJob, processing_job_id)
            if job:
                job.status = "completed"
                job.completed_at = datetime.now()
                job.updated_at = datetime.now()
                job.result = '{"success": true, "ai_results_generated": true}'
                session.add(job)

            session.commit()

        logger.info("AI处理完成并已保存")
        return True

    except Exception as e:
        logger.error(f"AI处理失败: {str(e)}")

        # 更新ProcessingJob状态为失败
        with Session(engine) as session:
            job = session.get(ProcessingJob, processing_job_id)
            if job:
                job.status = "failed"
                job.error_message = str(e)
                job.completed_at = datetime.now()
                job.updated_at = datetime.now()
                session.add(job)
                session.commit()

        return False


async def main():
    """主函数"""
    # 问题内容ID
    problematic_content_id = "c0bfa00e-49d1-429b-bef0-81b1f0d47b63"

    logger.info(f"开始为内容 {problematic_content_id} 手动触发AI处理...")

    success = await process_ai_for_content_item(problematic_content_id)

    if success:
        logger.info("AI处理成功完成！")
    else:
        logger.error("AI处理失败！")

    return success


if __name__ == "__main__":
    asyncio.run(main())
