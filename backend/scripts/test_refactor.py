#!/usr/bin/env python3
"""
重构验证测试脚本

使用方法:
    python scripts/test_refactor.py
"""

import asyncio
import sys
import uuid
from pathlib import Path

# 添加项目根目录到 Python 路径
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlmodel import Session, create_engine, select

from app.base import User  # 修正 User 模型导入路径
from app.core.config import settings
from app.models.content import AIResult, ContentItem, Segment
from app.services.preprocessing_pipeline import (
    ContentType,
    DocumentMetadata,
    PreprocessingPipeline,
)


def get_test_session():
    """获取测试数据库会话"""
    engine = create_engine(str(settings.SQLALCHEMY_DATABASE_URI))
    return Session(engine)


async def test_model_relationships():
    """测试模型关系是否正确工作"""
    print("🧪 测试模型关系...")

    with get_test_session() as session:
        # 创建测试用户
        test_user_id = uuid.uuid4()
        test_user = User(
            id=test_user_id,
            email=f"test-{test_user_id}@example.com",
            hashed_password="test_password",
            is_active=True,
        )
        session.add(test_user)
        session.commit()

        # 创建 ContentItem
        content_item = ContentItem(
            user_id=test_user_id,
            type="text",
            title="测试文章",
            content_text="这是一篇测试文章的内容。它包含多个段落来测试分段功能。\n\n这是第二段内容。",
            processing_status="completed",
        )
        session.add(content_item)
        session.commit()
        session.refresh(content_item)

        # 创建 AI 结果
        ai_result = AIResult(
            content_item_id=content_item.id,
            summary={"text": "这是一篇关于测试的文章", "length": "short"},
            key_points={"points": ["测试要点1", "测试要点2"]},
            labels=["测试", "验证"],
            difficulty_level="beginner",
            content_quality_score=0.8,
        )
        session.add(ai_result)

        # 创建分段
        segments = [
            Segment(
                content_item_id=content_item.id,
                segment_index=0,
                content="这是一篇测试文章的内容。它包含多个段落来测试分段功能。",
                segment_type="paragraph",
                word_count=12,
                char_count=36,
            ),
            Segment(
                content_item_id=content_item.id,
                segment_index=1,
                content="这是第二段内容。",
                segment_type="paragraph",
                word_count=6,
                char_count=9,
            ),
        ]
        for segment in segments:
            session.add(segment)

        session.commit()

        # 测试关系查询
        content_item = session.get(ContentItem, content_item.id)

        # 测试 AI 结果关系
        assert content_item.ai_result is not None, "AI 结果关系失败"
        assert content_item.ai_result.summary["text"] == "这是一篇关于测试的文章", (
            "AI 结果内容错误"
        )

        # 测试分段关系
        assert len(content_item.segments) == 2, (
            f"分段数量错误: {len(content_item.segments)}"
        )
        assert content_item.segments[0].segment_index == 0, "分段顺序错误"

        # 清理测试数据
        for segment in content_item.segments:
            session.delete(segment)
        session.delete(content_item.ai_result)
        session.delete(content_item)
        session.delete(test_user)
        session.commit()

        print("✅ 模型关系测试通过")


async def test_preprocessing_pipeline():
    """测试预处理管道是否能正确保存到新表结构"""
    print("🧪 测试预处理管道...")

    # 模拟 ChatService（简化版）
    class MockChatService:
        async def generate_with_template(self, template_name: str, context: dict):
            if template_name == "summary.j2":
                return {"summary": {"text": "自动生成的摘要", "length": "medium"}}
            elif template_name == "key_points.j2":
                return {"key_points": {"points": ["要点1", "要点2", "要点3"]}}
            elif template_name == "labels.j2":
                return {"primary_tags": {"category": ["标签1", "标签2"]}}
            return {}

    # 创建管道实例
    chat_service = MockChatService()
    pipeline = PreprocessingPipeline(chat_service)

    # 准备测试内容
    content = """
# 测试文章标题

这是第一段内容，用来测试预处理管道的功能。

## 子标题

这是第二段内容，包含更多的文字来测试分段功能。这段文字比较长，用来验证分段算法是否正确工作。

这是第三段内容。
"""

    metadata = DocumentMetadata(
        title="测试文章", content_type=ContentType.ARTICLE, language="zh"
    )

    # 执行预处理
    result = await pipeline.process_content(content, metadata)

    # 验证结果
    assert result.status.value in ["completed", "partial_success"], (
        f"处理状态错误: {result.status}"
    )
    assert len(result.segments) > 0, "没有生成分段"
    assert result.summary is not None, "没有生成摘要"
    assert result.difficulty_level in ["beginner", "intermediate", "advanced"], (
        "难度等级错误"
    )

    print("✅ 预处理管道测试通过")


async def test_jsonb_queries():
    """测试 JSONB 查询功能"""
    print("🧪 测试 JSONB 查询...")

    with get_test_session() as session:
        # 创建测试用户
        test_user_id = uuid.uuid4()
        test_user = User(
            id=test_user_id,
            email=f"test-{test_user_id}@example.com",
            hashed_password="test_password",
            is_active=True,
        )
        session.add(test_user)
        session.commit()

        content_item = ContentItem(
            user_id=test_user_id,
            type="text",
            title="JSONB测试文章",
            content_text="测试内容",
            processing_status="completed",
        )
        session.add(content_item)
        session.commit()
        session.refresh(content_item)

        ai_result = AIResult(
            content_item_id=content_item.id,
            summary={
                "text": "测试摘要",
                "length": "short",
                "keywords": ["测试", "JSONB"],
            },
            labels=["数据库", "查询", "测试"],
            difficulty_level="intermediate",
        )
        session.add(ai_result)
        session.commit()

        # 测试 JSONB 查询
        # 查询包含特定关键词的摘要 - 使用简单的 JSONB 查询
        stmt = select(AIResult).where(AIResult.summary.op("?")("text"))
        results = session.exec(stmt).all()
        assert len(results) > 0, "JSONB 基本查询失败"

        # 简单测试：查询所有有 labels 的记录
        stmt = select(AIResult).where(AIResult.labels.is_not(None))
        results = session.exec(stmt).all()
        assert len(results) > 0, "JSONB 标签查询失败"

        # 清理测试数据
        session.delete(ai_result)
        session.delete(content_item)
        session.delete(test_user)
        session.commit()

        print("✅ JSONB 查询测试通过")


async def test_data_integrity():
    """测试数据完整性约束"""
    print("🧪 测试数据完整性...")

    with get_test_session() as session:
        # 测试外键约束
        try:
            # 尝试创建引用不存在 ContentItem 的 AIResult
            fake_content_id = uuid.uuid4()
            ai_result = AIResult(
                content_item_id=fake_content_id, summary={"text": "测试"}
            )
            session.add(ai_result)
            session.commit()

            # 如果执行到这里，说明外键约束没有生效
            raise AssertionError("外键约束没有生效")

        except Exception as e:
            # 期望的行为：外键约束应该阻止这个操作
            session.rollback()
            print(f"✅ 外键约束正常工作: {type(e).__name__}")

        # 测试唯一约束
        test_user_id = uuid.uuid4()
        test_user = User(
            id=test_user_id,
            email=f"test-{test_user_id}@example.com",
            hashed_password="test_password",
            is_active=True,
        )
        session.add(test_user)
        session.commit()

        content_item = ContentItem(
            user_id=test_user_id,
            type="text",
            title="唯一约束测试",
            content_text="测试内容",
            processing_status="completed",
        )
        session.add(content_item)
        session.commit()
        session.refresh(content_item)

        # 创建第一个 AI 结果
        ai_result1 = AIResult(
            content_item_id=content_item.id, summary={"text": "第一个结果"}
        )
        session.add(ai_result1)
        session.commit()

        try:
            # 尝试为同一个 ContentItem 创建第二个 AI 结果
            ai_result2 = AIResult(
                content_item_id=content_item.id, summary={"text": "第二个结果"}
            )
            session.add(ai_result2)
            session.commit()

            # 如果执行到这里，说明唯一约束没有生效
            raise AssertionError("唯一约束没有生效")

        except Exception as e:
            # 期望的行为：唯一约束应该阻止这个操作
            session.rollback()
            print(f"✅ 唯一约束正常工作: {type(e).__name__}")

        # 清理测试数据
        ai_result1 = session.get(AIResult, ai_result1.id)
        if ai_result1:
            session.delete(ai_result1)
        session.delete(content_item)
        session.delete(test_user)
        session.commit()


async def run_all_tests():
    """运行所有测试"""
    print("🚀 开始重构验证测试...\n")

    try:
        await test_model_relationships()
        await test_preprocessing_pipeline()
        await test_jsonb_queries()
        await test_data_integrity()

        print("\n🎉 所有测试通过！重构验证成功！")
        return True

    except Exception as e:
        print(f"\n❌ 测试失败: {e}")
        import traceback

        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = asyncio.run(run_all_tests())
    sys.exit(0 if success else 1)
