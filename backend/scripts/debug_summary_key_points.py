#!/usr/bin/env python3
"""
Summary和Key Points处理调试脚本
用于排查 summary 和 key_points 没有经历 LLM 处理的问题
"""

import asyncio
import logging
import sys
from pathlib import Path

# 添加项目根目录到路径
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlmodel import Session, select

from app.core.config import settings
from app.core.db import engine
from app.models.content import ContentItem
from app.services.ai.chat_service import ChatService
from app.services.preprocessing_pipeline import (
    ContentType,
    DocumentMetadata,
    PreprocessingPipeline,
)

# 设置详细日志
logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


class SummaryKeyPointsDebugger:
    """Summary和Key Points处理调试器"""

    def __init__(self):
        self.chat_service = ChatService()
        self.pipeline = PreprocessingPipeline(self.chat_service)

    async def test_direct_llm_call(self):
        """测试直接的LLM调用"""
        logger.info("🔍 测试直接LLM调用...")

        try:
            test_content = """
            人工智能技术正在快速发展，深度学习、机器学习、自然语言处理等技术不断突破。
            AI在各个领域的应用越来越广泛，包括医疗诊断、自动驾驶、智能推荐等。
            未来AI技术将继续推动社会进步和产业升级。
            """

            # 测试直接调用 _call_litellm_proxy
            response = await self.chat_service._call_litellm_proxy(
                system_content=test_content,
                user_prompt="请为以下内容生成一个简洁的摘要（200-300字）：",
                model="or-gemini-2.5-pro"
            )

            logger.info("✅ 直接LLM调用成功")
            logger.info(f"📝 响应长度: {len(response)}")
            logger.info(f"📄 响应内容预览: {response[:200]}...")
            return True

        except Exception as e:
            logger.error(f"❌ 直接LLM调用失败: {e}")
            return False

    async def test_template_generation(self):
        """测试模板生成"""
        logger.info("🔍 测试模板生成...")

        test_content = """
        人工智能技术正在快速发展，深度学习、机器学习、自然语言处理等技术不断突破。
        AI在各个领域的应用越来越广泛，包括医疗诊断、自动驾驶、智能推荐等。
        未来AI技术将继续推动社会进步和产业升级。
        这是一个关于AI发展的重要文档，包含了多个技术领域的分析。
        """

        context = {
            "content": test_content,
            "content_with_segment_numbers": test_content,
            "document_metadata": {
                "title": "AI技术发展测试文档",
                "content_type": "article"
            }
        }

        # 测试summary生成
        try:
            logger.info("📝 测试Summary模板...")
            summary_result = await self.chat_service.generate_with_template(
                template_name="summary.j2",
                context=context,
                model="or-gemini-2.5-pro"
            )
            logger.info(f"✅ Summary生成成功: {type(summary_result)}")
            logger.info(f"📊 Summary结果: {summary_result}")

        except Exception as e:
            logger.error(f"❌ Summary生成失败: {e}")

        # 测试key_points生成
        try:
            logger.info("💡 测试Key Points模板...")
            key_points_result = await self.chat_service.generate_with_template(
                template_name="key_points.j2",
                context=context,
                model="or-gemini-2.5-pro"
            )
            logger.info(f"✅ Key Points生成成功: {type(key_points_result)}")
            logger.info(f"📊 Key Points结果: {key_points_result}")

        except Exception as e:
            logger.error(f"❌ Key Points生成失败: {e}")

    async def test_preprocessing_pipeline(self):
        """测试完整的预处理管道"""
        logger.info("🔍 测试完整预处理管道...")

        try:
            # 创建测试元数据
            metadata = DocumentMetadata(
                title="AI技术发展测试文档",
                content_type=ContentType.ARTICLE,
                language="zh"
            )

            # 测试内容
            test_content = """
            # AI技术发展报告

            ## 概述
            人工智能技术正在快速发展，深度学习、机器学习、自然语言处理等技术不断突破。

            ## 应用领域
            AI在各个领域的应用越来越广泛，包括：
            - 医疗诊断：通过图像识别技术提高诊断准确率
            - 自动驾驶：利用计算机视觉和传感器融合技术
            - 智能推荐：基于用户行为分析和协同过滤算法

            ## 发展趋势
            未来AI技术将继续推动社会进步和产业升级，特别是在以下方面：
            1. 算法优化和模型压缩
            2. 边缘计算和移动AI
            3. 可解释AI和伦理AI

            ## 结论
            AI技术的发展将为人类社会带来深远的影响。
            """

            # 执行预处理管道的AI初始化层
            logger.info("🚀 开始执行AI初始化层...")
            ai_results, ai_stats = await self.pipeline._ai_initialization_layer(
                content=test_content,
                metadata=metadata,
                user_preferences={}
            )

            logger.info("✅ AI初始化层执行完成")
            logger.info(f"📊 AI统计: {ai_stats}")
            logger.info(f"📝 Summary存在: {'summary' in ai_results and bool(ai_results['summary'])}")
            logger.info(f"💡 Key Points存在: {'key_points' in ai_results and bool(ai_results['key_points'])}")

            if ai_results.get('summary'):
                logger.info(f"📄 Summary内容: {ai_results['summary']}")

            if ai_results.get('key_points'):
                logger.info(f"📄 Key Points内容: {ai_results['key_points']}")

        except Exception as e:
            logger.error(f"❌ 预处理管道测试失败: {e}")

    async def test_with_real_content(self):
        """使用真实内容测试"""
        logger.info("🔍 使用数据库中的真实内容测试...")

        try:
            with Session(engine) as session:
                # 查找最近的一个内容项
                stmt = select(ContentItem).order_by(ContentItem.created_at.desc()).limit(1)
                content_item = session.exec(stmt).first()

                if not content_item:
                    logger.warning("⚠️ 数据库中没有找到内容项")
                    return

                logger.info(f"📄 找到内容项: {content_item.title}")
                logger.info(f"📊 内容长度: {len(content_item.content_text or '')}")

                if not content_item.content_text:
                    logger.warning("⚠️ 内容项没有文本内容")
                    return

                # 创建元数据
                metadata = DocumentMetadata(
                    title=content_item.title,
                    source_url=content_item.source_uri,
                    content_type=ContentType.WEB_PAGE,
                    language="zh"
                )

                # 执行AI初始化层
                logger.info("🚀 使用真实内容执行AI初始化层...")
                ai_results, ai_stats = await self.pipeline._ai_initialization_layer(
                    content=content_item.content_text[:5000],  # 限制长度避免超时
                    metadata=metadata,
                    user_preferences={}
                )

                logger.info("✅ 真实内容AI处理完成")
                logger.info(f"📊 处理统计: {ai_stats}")

                # 检查结果
                summary_exists = bool(ai_results.get('summary'))
                key_points_exists = bool(ai_results.get('key_points'))

                logger.info(f"📝 Summary生成: {'✅' if summary_exists else '❌'}")
                logger.info(f"💡 Key Points生成: {'✅' if key_points_exists else '❌'}")

                if summary_exists:
                    summary = ai_results['summary']
                    if isinstance(summary, dict) and 'summary' in summary:
                        logger.info("📄 Summary是结构化数据（可能是Mock）")
                    else:
                        logger.info("📄 Summary是LLM生成的数据")

                if key_points_exists:
                    key_points = ai_results['key_points']
                    if isinstance(key_points, dict) and 'key_points' in key_points:
                        logger.info("📄 Key Points是结构化数据（可能是Mock）")
                    else:
                        logger.info("📄 Key Points是LLM生成的数据")

        except Exception as e:
            logger.error(f"❌ 真实内容测试失败: {e}")

    async def run_all_tests(self):
        """运行所有测试"""
        logger.info("🚀 开始Summary和Key Points调试测试...")

        # 显示配置信息
        logger.info(f"⚙️ LiteLLM代理: {settings.LITELLM_PROXY_URL}")
        logger.info(f"⚙️ 默认模型: {settings.DEFAULT_LLM_MODEL}")
        logger.info(f"⚙️ 认证密钥: {'已配置' if settings.LITELLM_MASTER_KEY else '未配置'}")

        # 运行各项测试
        await self.test_direct_llm_call()
        await self.test_template_generation()
        await self.test_preprocessing_pipeline()
        await self.test_with_real_content()

        logger.info("✅ 所有测试完成")


async def main():
    """主函数"""
    debugger = SummaryKeyPointsDebugger()
    await debugger.run_all_tests()


if __name__ == "__main__":
    asyncio.run(main())
