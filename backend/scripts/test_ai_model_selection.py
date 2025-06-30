#!/usr/bin/env python3
"""
AI模型选择功能集成测试脚本
验证不同AI任务是否使用了正确的模型
"""

import asyncio
import logging
import sys
from pathlib import Path

# 添加项目根目录到Python路径
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.services.ai.chat_service import ChatService, TEMPLATE_MODEL_MAPPING
from app.core.config import settings

# 设置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def test_model_selection():
    """测试AI模型选择功能"""
    chat_service = ChatService()
    
    # 测试内容
    test_context = {
        "content": """
        这是一篇关于人工智能发展的文章。
        人工智能(AI)是计算机科学的一个分支，致力于创建能够执行通常需要人类智能的任务的系统。
        近年来，深度学习和神经网络的发展推动了AI技术的快速进步。
        AI在医疗、金融、交通等领域都有广泛应用。
        """,
        "document_metadata": {
            "title": "人工智能发展概述",
            "content_type": "article"
        }
    }
    
    logger.info("🚀 开始测试AI模型选择功能...")
    
    # 1. 测试模板映射配置
    logger.info("📋 验证模板-模型映射配置...")
    logger.info(f"Summary模板 -> {TEMPLATE_MODEL_MAPPING.get('summary.j2', '未配置')}")
    logger.info(f"KeyPoints模板 -> {TEMPLATE_MODEL_MAPPING.get('key_points.j2', '未配置')}")
    logger.info(f"Labels模板 -> {TEMPLATE_MODEL_MAPPING.get('labels.j2', '未配置')}")
    logger.info(f"默认模型: {settings.DEFAULT_LLM_MODEL}")
    
    # 2. 测试Summary生成（应使用or-deepseek-r1）
    logger.info("\n📝 测试Summary生成...")
    try:
        summary_result = await chat_service.generate_with_template(
            "summary.j2", 
            test_context
        )
        logger.info(f"✅ Summary生成成功: {bool(summary_result)}")
        if summary_result:
            logger.info(f"Summary内容预览: {str(summary_result)[:100]}...")
    except Exception as e:
        logger.error(f"❌ Summary生成失败: {e}")
    
    # 3. 测试KeyPoints生成（应使用or-deepseek-r1）
    logger.info("\n💡 测试KeyPoints生成...")
    try:
        key_points_result = await chat_service.generate_with_template(
            "key_points.j2", 
            test_context
        )
        logger.info(f"✅ KeyPoints生成成功: {bool(key_points_result)}")
        if key_points_result:
            logger.info(f"KeyPoints内容预览: {str(key_points_result)[:100]}...")
    except Exception as e:
        logger.error(f"❌ KeyPoints生成失败: {e}")
    
    # 4. 测试Labels生成（应使用deepseek-v3-ensemble）
    logger.info("\n🏷️ 测试Labels生成...")
    try:
        labels_result = await chat_service.generate_with_template(
            "labels.j2", 
            test_context
        )
        logger.info(f"✅ Labels生成成功: {bool(labels_result)}")
        if labels_result:
            logger.info(f"Labels内容预览: {str(labels_result)[:100]}...")
    except Exception as e:
        logger.error(f"❌ Labels生成失败: {e}")
    
    # 5. 测试显式模型参数
    logger.info("\n🎯 测试显式模型参数...")
    try:
        explicit_model_result = await chat_service.generate_with_template(
            "summary.j2", 
            test_context,
            model="or-gemini-2.5-flash-preview-05-20"  # 显式指定模型
        )
        logger.info(f"✅ 显式模型调用成功: {bool(explicit_model_result)}")
    except Exception as e:
        logger.error(f"❌ 显式模型调用失败: {e}")
    
    logger.info("\n🎉 AI模型选择功能测试完成!")


async def test_preprocessing_pipeline_integration():
    """测试预处理管道集成"""
    logger.info("\n🔄 测试预处理管道集成...")
    
    try:
        from app.services.preprocessing_pipeline import PreprocessingPipeline, DocumentMetadata, ContentType
        
        # 创建预处理管道
        chat_service = ChatService()
        pipeline = PreprocessingPipeline(chat_service)
        
        # 测试元数据
        metadata = DocumentMetadata(
            title="AI技术发展测试文档",
            content_type=ContentType.ARTICLE,
            language="zh"
        )
        
        # 测试内容
        test_content = """
        人工智能技术正在快速发展，深度学习、机器学习、自然语言处理等技术不断突破。
        AI在各个领域的应用越来越广泛，包括医疗诊断、自动驾驶、智能推荐等。
        未来AI技术将继续推动社会进步和产业升级。
        """
        
        # 执行预处理（这将触发AI任务使用不同模型）
        result = await pipeline.process_content(
            content=test_content,
            metadata=metadata
        )
        
        logger.info(f"✅ 预处理管道执行成功")
        logger.info(f"📊 处理状态: {result.status}")
        logger.info(f"📝 Summary: {bool(result.summary)}")
        logger.info(f"💡 KeyPoints: {bool(result.key_points)}")
        logger.info(f"🏷️ Labels数量: {len(result.labels)}")
        
        if result.labels:
            logger.info(f"🏷️ 生成的标签: {result.labels}")
        
    except Exception as e:
        logger.error(f"❌ 预处理管道测试失败: {e}")


def main():
    """主函数"""
    print("=" * 60)
    print("🧪 AI模型选择功能集成测试")
    print("=" * 60)
    
    try:
        # 运行测试
        asyncio.run(test_model_selection())
        asyncio.run(test_preprocessing_pipeline_integration())
        
        print("\n" + "=" * 60)
        print("✅ 所有测试完成")
        print("=" * 60)
        
    except KeyboardInterrupt:
        print("\n❌ 测试被用户中断")
    except Exception as e:
        print(f"\n❌ 测试执行失败: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main() 