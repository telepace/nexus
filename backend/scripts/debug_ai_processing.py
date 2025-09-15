#!/usr/bin/env python3
"""
AI处理调试脚本
用于排查 summary 和 key_points 处理问题
"""

import asyncio
import logging
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

# 添加项目根目录到路径
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlmodel import Session, select

from app.core.config import settings
from app.core.db import engine
from app.models.content import AIResult, ContentItem
from app.services.ai.chat_service import ChatService
from app.services.preprocessing_pipeline import DocumentMetadata, PreprocessingPipeline

# 设置日志
logging.basicConfig(
    level=logging.DEBUG, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


class AIProcessingDebugger:
    """AI处理调试器"""

    def __init__(self):
        self.chat_service = ChatService()
        self.pipeline = PreprocessingPipeline(self.chat_service)

    async def debug_content_processing(self, content_id: str = None):
        """调试内容处理流程"""
        print("🔍 开始AI处理调试...")
        print("📊 环境信息:")
        print(f"   - LiteLLM URL: {settings.LITELLM_PROXY_URL}")
        print(f"   - 默认模型: {settings.DEFAULT_LLM_MODEL}")
        print(
            f"   - Master Key: {'已设置' if settings.LITELLM_MASTER_KEY else '未设置'}"
        )
        print()

        with Session(engine) as session:
            # 1. 获取或创建测试内容
            if content_id:
                content_item = session.get(ContentItem, content_id)
                if not content_item:
                    print(f"❌ 找不到内容ID: {content_id}")
                    return
            else:
                content_item = self._get_or_create_test_content(session)

            print(f"📄 测试内容: {content_item.title}")
            print(f"   - ID: {content_item.id}")
            print(f"   - 状态: {content_item.processing_status}")
            print(f"   - 内容长度: {len(content_item.content_text or '')}")
            print()

            # 2. 测试模板渲染
            await self._test_template_rendering(content_item)

            # 3. 测试LiteLLM连接
            await self._test_litellm_connection(content_item)

            # 4. 测试完整AI处理流程
            await self._test_full_ai_processing(content_item, session)

            # 5. 检查数据库存储
            await self._check_database_storage(content_item, session)

    def _get_or_create_test_content(self, session: Session) -> ContentItem:
        """获取或创建测试内容"""
        # 查找现有的测试内容
        existing = session.exec(
            select(ContentItem).where(ContentItem.title == "AI处理调试测试")
        ).first()

        if existing:
            return existing

        # 创建新的测试内容
        test_content = ContentItem(
            id=uuid.uuid4(),
            user_id=uuid.uuid4(),  # 使用临时用户ID
            type="text",
            title="AI处理调试测试",
            content_text="""
人工智能技术的发展正在改变我们的世界。机器学习和深度学习算法使计算机能够从数据中学习，
而不需要明确的编程指令。这种技术已经在图像识别、自然语言处理、语音识别等领域取得了
显著的进展。

在商业应用中，AI技术被广泛应用于推荐系统、客户服务、金融风控、医疗诊断等场景。
企业通过AI技术可以提高效率、降低成本、改善用户体验。

然而，AI技术的发展也带来了一些挑战，包括数据隐私、算法偏见、就业影响等问题。
我们需要在推进技术发展的同时，认真考虑这些伦理和社会问题。

未来，AI技术将继续快速发展，可能会在自动驾驶、智能制造、个性化教育等领域
产生更大的影响。我们需要做好准备，迎接这个AI驱动的未来。
            """.strip(),
            processing_status="pending",
            created_at=datetime.now(timezone.utc),
        )

        session.add(test_content)
        session.commit()
        session.refresh(test_content)
        return test_content

    async def _test_template_rendering(self, content_item: ContentItem):
        """测试模板渲染"""
        print("🎨 测试模板渲染...")

        context = {
            "content": content_item.content_text,
            "document_metadata": {
                "title": content_item.title,
                "author": None,
                "source_url": content_item.source_uri,
            },
        }

        templates_to_test = ["summary.j2", "key_points.j2", "labels.j2"]

        for template_name in templates_to_test:
            try:
                template = self.chat_service.template_env.get_template(template_name)
                rendered = template.render(**context)
                print(f"   ✅ {template_name}: 渲染成功 ({len(rendered)} 字符)")
                print(f"      预览: {rendered[:100]}...")
            except Exception as e:
                print(f"   ❌ {template_name}: 渲染失败 - {str(e)}")
        print()

    async def _test_litellm_connection(self, content_item: ContentItem):
        """测试LiteLLM连接"""
        print("🔗 测试LiteLLM连接...")

        try:
            # 简单的测试请求
            test_response = await self.chat_service._call_litellm_proxy(
                system_content="你是一个AI助手", user_prompt="请简单回复'连接正常'"
            )
            print("   ✅ LiteLLM连接成功")
            print(f"      响应: {test_response[:100]}...")
        except Exception as e:
            print(f"   ❌ LiteLLM连接失败: {str(e)}")
            print("      这可能是问题的根源！")
        print()

    async def _test_full_ai_processing(
        self, content_item: ContentItem, session: Session
    ):
        """测试完整AI处理流程"""
        print("🤖 测试完整AI处理流程...")

        context = {
            "content": content_item.content_text,
            "document_metadata": {
                "title": content_item.title,
                "author": None,
                "source_url": content_item.source_uri,
            },
        }

        # 测试每个模板的处理
        templates = {
            "summary.j2": "摘要生成",
            "key_points.j2": "关键要点提取",
            "labels.j2": "标签和元数据生成",
        }

        results = {}

        for template_name, description in templates.items():
            try:
                print(f"   🔄 测试 {description}...")
                result = await self.chat_service.generate_with_template(
                    template_name, context
                )
                results[template_name] = result

                if result:
                    print(f"   ✅ {description}: 成功")
                    print(f"      结果键: {list(result.keys())}")
                    # 显示结果预览
                    for key, value in result.items():
                        if isinstance(value, dict):
                            print(f"         {key}: {list(value.keys())}")
                        elif isinstance(value, str):
                            print(f"         {key}: {value[:50]}...")
                        else:
                            print(f"         {key}: {type(value).__name__}")
                else:
                    print(f"   ⚠️  {description}: 返回空结果")

            except Exception as e:
                print(f"   ❌ {description}: 失败 - {str(e)}")
                results[template_name] = None

        print()
        return results

    async def _check_database_storage(
        self, content_item: ContentItem, session: Session
    ):
        """检查数据库存储"""
        print("💾 检查数据库存储...")

        # 查找相关的AI结果
        ai_result = session.exec(
            select(AIResult).where(AIResult.content_item_id == content_item.id)
        ).first()

        if ai_result:
            print("   ✅ 找到AI结果记录")
            print(f"      - Summary: {'有' if ai_result.summary else '无'}")
            print(f"      - Key Points: {'有' if ai_result.key_points else '无'}")
            print(f"      - Labels: {len(ai_result.labels or [])}")
            print(f"      - 阅读时间: {ai_result.reading_time_minutes}")
            print(f"      - 难度等级: {ai_result.difficulty_level}")
            print(f"      - 质量评分: {ai_result.content_quality_score}")

            # 显示详细内容
            if ai_result.summary:
                print(f"      Summary内容类型: {type(ai_result.summary)}")
                if isinstance(ai_result.summary, dict):
                    print(f"      Summary键: {list(ai_result.summary.keys())}")

            if ai_result.key_points:
                print(f"      Key Points内容类型: {type(ai_result.key_points)}")
                if isinstance(ai_result.key_points, dict):
                    print(f"      Key Points键: {list(ai_result.key_points.keys())}")
        else:
            print("   ❌ 未找到AI结果记录")
            print("      这表明AI处理可能没有正确保存到数据库")

        print()

    async def test_specific_content(self, content_id: str):
        """测试特定内容的AI处理"""
        print(f"🎯 测试特定内容: {content_id}")
        await self.debug_content_processing(content_id)

    async def test_pipeline_processing(
        self, content_text: str, title: str = "Pipeline测试"
    ):
        """测试预处理管道"""
        print("🔧 测试预处理管道...")

        metadata = DocumentMetadata(
            title=title,
            author=None,
            source_url=None,
            content_type="article",
            language="zh",
            domain="technology",
        )

        try:
            result = await self.pipeline._ai_initialization_layer(
                content_text, metadata, user_preferences=None
            )

            ai_results, ai_stats = result
            print("   ✅ 管道处理成功")
            print(f"      - AI结果键: {list(ai_results.keys())}")
            print(f"      - 统计信息: {ai_stats}")

            return ai_results

        except Exception as e:
            print(f"   ❌ 管道处理失败: {str(e)}")
            return None


async def main():
    """主函数"""
    import argparse

    parser = argparse.ArgumentParser(description="AI处理调试工具")
    parser.add_argument("--content-id", help="指定要调试的内容ID")
    parser.add_argument("--test-pipeline", action="store_true", help="测试预处理管道")
    parser.add_argument(
        "--test-connection", action="store_true", help="仅测试LiteLLM连接"
    )

    args = parser.parse_args()

    debugger = AIProcessingDebugger()

    if args.test_connection:
        print("🔗 测试LiteLLM连接...")
        try:
            response = await debugger.chat_service._call_litellm_proxy(
                "你是一个AI助手", "请回复'连接测试成功'"
            )
            print(f"✅ 连接成功: {response}")
        except Exception as e:
            print(f"❌ 连接失败: {str(e)}")
        return

    if args.test_pipeline:
        await debugger.test_pipeline_processing(
            "这是一个测试文档，用于验证AI处理管道是否正常工作。"
        )
        return

    if args.content_id:
        await debugger.test_specific_content(args.content_id)
    else:
        await debugger.debug_content_processing()


if __name__ == "__main__":
    asyncio.run(main())
