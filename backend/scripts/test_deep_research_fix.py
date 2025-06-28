#!/usr/bin/env python3
"""
测试深度研究分段修复的脚本

验证深度研究生成的内容是否能正确创建分段数据
"""

import asyncio
import sys
from pathlib import Path

# 添加项目根目录到路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from sqlmodel import Session, select  # noqa: E402

from app.core.db import engine  # noqa: E402
from app.crud.content import get_content_chunks  # noqa: E402
from app.models.content import ContentItem, DeepResearchJob, Segment  # noqa: E402


async def test_deep_research_segmentation():
    """测试深度研究的分段功能"""

    print("🔍 开始测试深度研究分段修复...")

    # 查找最近的一个完成的深度研究任务
    with Session(engine) as session:
        # 查找最近完成的深度研究任务
        statement = (
            select(DeepResearchJob)
            .where(DeepResearchJob.status == "completed")
            .order_by(DeepResearchJob.completed_at.desc())
            .limit(1)
        )
        recent_job = session.exec(statement).first()

        if not recent_job:
            print("❌ 没有找到已完成的深度研究任务")
            return False

        print(f"📋 找到深度研究任务: {recent_job.id}")
        print(f"   查询: {recent_job.query}")
        print(f"   完成时间: {recent_job.completed_at}")

        # 查找对应的 ContentItem
        statement = select(ContentItem).where(
            ContentItem.source_uri == f"deep_research:{recent_job.id}"
        )
        content_item = session.exec(statement).first()

        if not content_item:
            print("❌ 没有找到对应的 ContentItem")
            return False

        print(f"📄 找到 ContentItem: {content_item.id}")
        print(f"   标题: {content_item.title}")
        print(f"   处理状态: {content_item.processing_status}")

        # 检查是否有分段数据
        statement = (
            select(Segment)
            .where(Segment.content_item_id == content_item.id)
            .order_by(Segment.segment_index)
        )
        segments = session.exec(statement).all()

        print("📊 分段统计:")
        print(f"   分段数量: {len(segments)}")

        if len(segments) == 0:
            print("❌ 没有找到分段数据 - 这说明问题仍然存在")
            return False
        else:
            print("✅ 找到分段数据 - 修复成功！")

            # 显示分段详情
            total_chars = 0
            total_words = 0
            for segment in segments[:3]:  # 只显示前3个分段
                total_chars += segment.char_count or 0
                total_words += segment.word_count or 0
                content_preview = (
                    segment.content[:100] + "..."
                    if len(segment.content) > 100
                    else segment.content
                )
                print(
                    f"   分段 {segment.segment_index + 1}: {segment.char_count} 字符, {segment.word_count} 词"
                )
                print(f"     内容预览: {content_preview}")

            if len(segments) > 3:
                for segment in segments[3:]:
                    total_chars += segment.char_count or 0
                    total_words += segment.word_count or 0
                print(f"   ... 还有 {len(segments) - 3} 个分段")

            print(f"   总计: {total_chars} 字符, {total_words} 词")

        return True


async def test_api_endpoints():
    """测试相关的API端点"""

    print("\n🌐 测试API端点...")

    with Session(engine) as session:
        # 查找一个有分段的 ContentItem
        statement = (
            select(ContentItem)
            .join(Segment)
            .where(ContentItem.source_uri.like("deep_research:%"))
            .limit(1)
        )
        content_item = session.exec(statement).first()

        if not content_item:
            print("❌ 没有找到有分段的深度研究内容")
            return False

        print(f"📄 测试内容: {content_item.id}")

        # 模拟 /api/v1/content/{id}/chunks 接口的查询逻辑

        try:
            chunks, total_count = get_content_chunks(
                session=session, content_item_id=content_item.id, page=1, size=10
            )

            print("📊 API 测试结果:")
            print(f"   分块数量: {len(chunks)}")
            print(f"   总计数量: {total_count}")

            if len(chunks) > 0:
                print("✅ chunks API 能够正确返回分段数据")
                return True
            else:
                print("❌ chunks API 没有返回分段数据")
                return False

        except Exception as e:
            print(f"❌ API 测试失败: {e}")
            return False


async def main():
    """主函数"""

    print("=" * 60)
    print("深度研究分段修复测试")
    print("=" * 60)

    # 测试分段功能
    segmentation_ok = await test_deep_research_segmentation()

    # 测试API端点
    api_ok = await test_api_endpoints()

    print("\n" + "=" * 60)
    print("测试总结:")
    print(f"分段功能: {'✅ 正常' if segmentation_ok else '❌ 异常'}")
    print(f"API端点: {'✅ 正常' if api_ok else '❌ 异常'}")

    if segmentation_ok and api_ok:
        print("\n🎉 深度研究分段修复验证成功！")
        print("前端现在应该能够正常显示分段内容了。")
    else:
        print("\n⚠️  仍存在问题，需要进一步调试。")

    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
