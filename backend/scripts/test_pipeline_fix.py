#!/usr/bin/env python3
"""
测试修复后的预处理管道是否正常工作
"""

import asyncio
import logging
import uuid

from sqlmodel import Session, create_engine, select

from app.core.config import settings
from app.models.content import AIResult, ContentItem, ProcessingJob, Segment
from app.services.ai.chat_service import ChatService
from app.services.preprocessing_pipeline import (
    ContentType,
    DocumentMetadata,
    PreprocessingPipeline,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def test_pipeline_with_sample_content():
    """测试预处理管道处理示例内容"""

    sample_content = """
# 测试文档标题

这是一个测试文档，用于验证预处理管道的功能。

## 第一部分：介绍

这个文档包含了多个段落和章节，用于测试分段功能。我们希望确保：

1. 内容能正确分段
2. AI结果能正确生成
3. ProcessingJob能正确追踪
4. 不会出现重复数据

## 第二部分：技术细节

在这个部分，我们会讨论一些技术实现细节。包括：

- 数据库设计
- API接口
- 前端展示
- 性能优化

## 结论

通过这个测试，我们可以验证整个流水线是否正常工作。
"""

    try:
        # 创建ChatService和Pipeline
        chat_service = ChatService()
        pipeline = PreprocessingPipeline(chat_service)

        # 构建metadata
        metadata = DocumentMetadata(
            title="测试文档",
            content_type=ContentType.DOCUMENT,
            language="zh",
            estimated_words=len(sample_content.split()),
        )

        logger.info("开始测试预处理管道...")

        # 执行预处理
        result = await pipeline.process_content(
            content=sample_content, metadata=metadata, user_preferences=None
        )

        logger.info(f"处理结果状态: {result.status}")
        logger.info(f"生成segments数量: {len(result.segments)}")
        logger.info(f"摘要: {bool(result.summary)}")
        logger.info(f"要点: {bool(result.key_points)}")
        logger.info(f"标签数量: {len(result.labels)}")
        logger.info(f"阅读时间: {result.reading_time_minutes}分钟")
        logger.info(f"难度等级: {result.difficulty_level}")
        logger.info(f"质量评分: {result.content_quality_score}")

        if result.errors:
            logger.warning(f"处理过程中的错误: {result.errors}")

        # 检查AI处理层是否成功
        ai_success = (
            bool(result.summary)
            and bool(result.key_points)
            and len(result.labels) > 0
            and result.content_quality_score > 0
        )

        if ai_success:
            logger.info("✅ AI处理层功能正常")
        else:
            logger.error("❌ AI处理层存在问题")

        # 检查分段是否正常
        segment_success = len(result.segments) > 0
        if segment_success:
            logger.info("✅ 分段功能正常")
        else:
            logger.error("❌ 分段功能存在问题")

        return ai_success and segment_success

    except Exception as e:
        logger.error(f"测试失败: {str(e)}")
        return False


async def verify_database_records(content_id: str):
    """验证数据库中的记录（仅用于已存在的ContentItem）"""
    engine = create_engine(str(settings.SQLALCHEMY_DATABASE_URI))

    try:
        content_uuid = uuid.UUID(content_id)
    except ValueError:
        logger.warning(f"跳过数据库验证，content_id格式不是UUID: {content_id}")
        return

    with Session(engine) as session:
        # 检查ContentItem
        content_item = session.exec(
            select(ContentItem).where(ContentItem.id == content_uuid)
        ).first()

        if content_item:
            logger.info(f"✅ ContentItem存在: {content_item.processing_status}")
        else:
            logger.warning("❌ ContentItem不存在")
            return

        # 检查Segments
        segments = session.exec(
            select(Segment).where(Segment.content_item_id == content_uuid)
        ).all()

        logger.info(f"✅ Segments数量: {len(segments)}")

        # 检查重复的segment_index
        segment_indices = [s.segment_index for s in segments]
        duplicates = [
            idx for idx in set(segment_indices) if segment_indices.count(idx) > 1
        ]
        if duplicates:
            logger.error(f"❌ 发现重复的segment_index: {duplicates}")
        else:
            logger.info("✅ 没有重复的segments")

        # 检查AI结果
        ai_result = session.exec(
            select(AIResult).where(AIResult.content_item_id == content_uuid)
        ).first()

        if ai_result:
            logger.info("✅ AI结果存在")
            logger.info(f"  - 摘要: {'是' if ai_result.summary else '否'}")
            logger.info(f"  - 要点: {'是' if ai_result.key_points else '否'}")
            logger.info(f"  - 标签: {len(ai_result.labels or [])}")
            logger.info(f"  - 质量评分: {ai_result.content_quality_score}")
        else:
            logger.error("❌ AI结果不存在")

        # 检查ProcessingJob
        processing_jobs = session.exec(
            select(ProcessingJob).where(ProcessingJob.content_item_id == content_uuid)
        ).all()

        logger.info(f"✅ ProcessingJob数量: {len(processing_jobs)}")
        for job in processing_jobs:
            logger.info(f"  - {job.processor_name}: {job.status}")


async def test_concurrent_processing():
    """测试并发处理AI层功能"""
    logger.info("开始测试AI处理层并发功能...")

    sample_content = "这是一个并发测试文档。包含一些技术内容用于测试AI处理。" * 20

    chat_service = ChatService()
    pipeline = PreprocessingPipeline(chat_service)

    metadata = DocumentMetadata(
        title="并发测试文档",
        content_type=ContentType.DOCUMENT,
        language="zh",
        estimated_words=len(sample_content.split()),
    )

    # 测试AI处理层
    try:
        ai_results, ai_stats = await pipeline._ai_initialization_layer(
            sample_content, metadata, None
        )

        logger.info("✅ AI初始化层功能正常")
        logger.info(f"  - 处理统计: {ai_stats}")
        logger.info(f"  - 摘要: {bool(ai_results.get('summary'))}")
        logger.info(f"  - 要点: {bool(ai_results.get('key_points'))}")
        logger.info(f"  - 标签: {len(ai_results.get('labels', []))}")

        return True

    except Exception as e:
        logger.error(f"❌ AI初始化层测试失败: {str(e)}")
        return False


async def main():
    """主测试函数"""
    logger.info("🧪 开始测试修复后的预处理管道...")

    # 测试1：基本功能测试
    logger.info("\n=== 测试1：基本功能测试 ===")
    basic_test_passed = await test_pipeline_with_sample_content()

    if basic_test_passed:
        logger.info("✅ 基本功能测试通过")
    else:
        logger.error("❌ 基本功能测试失败")

    # 测试2：AI处理层测试
    logger.info("\n=== 测试2：AI处理层测试 ===")
    ai_test_passed = await test_concurrent_processing()

    if ai_test_passed:
        logger.info("✅ AI处理层测试通过")
    else:
        logger.error("❌ AI处理层测试失败")

    logger.info("\n🎉 测试完成！")

    if basic_test_passed and ai_test_passed:
        logger.info("✅ 所有测试通过，修复成功！")
        return True
    else:
        logger.error("❌ 部分测试失败，需要进一步调试")
        return False


if __name__ == "__main__":
    success = asyncio.run(main())
    exit(0 if success else 1)
