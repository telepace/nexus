#!/usr/bin/env python3
"""
流式API测试脚本

用于测试新的流式分析接口是否正常工作
"""

import asyncio
import sys
from pathlib import Path

# 添加项目路径
sys.path.append(str(Path(__file__).parent))

from app.utils.streaming_processors import (
    StreamingAIProcessor, 
    StreamingSummaryProcessor, 
    StreamingKeyPointsProcessor
)
from app.models.content import ContentItem
from sqlmodel import Session, create_engine
from app.core.config import settings

async def test_streaming_processors():
    """测试流式处理器"""
    
    # 创建测试内容项
    test_content = """
    人工智能（AI）正在快速改变我们的世界。从自动驾驶汽车到智能语音助手，AI技术已经深入到我们生活的方方面面。

    ## 主要应用领域

    1. **医疗健康**: AI在疾病诊断、药物研发等方面发挥重要作用
    2. **金融服务**: 智能风控、算法交易、客户服务自动化
    3. **教育培训**: 个性化学习、智能辅导系统
    4. **制造业**: 智能制造、预测性维护、质量控制

    ## 关键技术

    - 机器学习: 让计算机从数据中学习
    - 深度学习: 模拟人脑神经网络的学习方式
    - 自然语言处理: 让机器理解和生成人类语言
    - 计算机视觉: 让机器"看懂"图像和视频

    ## 未来展望

    随着技术的不断进步，AI将在更多领域发挥作用，但同时也需要关注伦理、安全等问题。
    """
    
    # 创建模拟的ContentItem
    content_item = ContentItem(
        id="test-id",
        title="人工智能技术发展现状",
        content_text=test_content,
        type="text",
        user_id="test-user"
    )
    
    print("🚀 开始测试流式处理器...")
    
    # 测试流式摘要处理器
    print("\n📝 测试流式摘要生成:")
    summary_processor = StreamingSummaryProcessor()
    
    summary_chunks = []
    async for chunk in summary_processor.generate_summary_stream(content_item, None):
        print(f"  📦 收到chunk: type={chunk.type}, finished={chunk.finished}")
        if chunk.content:
            print(f"     内容: {chunk.content[:50]}...")
        summary_chunks.append(chunk)
    
    print(f"✅ 摘要生成完成，共收到 {len(summary_chunks)} 个chunks")
    
    # 测试流式关键要点处理器
    print("\n🔑 测试流式关键要点提取:")
    keypoints_processor = StreamingKeyPointsProcessor()
    
    keypoints_chunks = []
    async for chunk in keypoints_processor.generate_key_points_stream(content_item, None):
        print(f"  📦 收到chunk: type={chunk.type}, finished={chunk.finished}")
        if chunk.content:
            print(f"     内容: {chunk.content[:50]}...")
        keypoints_chunks.append(chunk)
    
    print(f"✅ 关键要点提取完成，共收到 {len(keypoints_chunks)} 个chunks")
    
    print("\n🎉 所有测试完成!")

async def test_template_rendering():
    """测试模板渲染功能"""
    
    print("🧪 测试模板渲染...")
    
    processor = StreamingAIProcessor()
    
    # 创建测试内容项
    content_item = ContentItem(
        id="test-id",
        title="测试文章",
        content_text="这是一篇测试文章的内容。",
        type="text",
        user_id="test-user"
    )
    
    try:
        # 测试摘要模板
        summary_prompt = await processor._render_template(content_item, "summary")
        print("✅ 摘要模板渲染成功")
        print(f"   提示词长度: {len(summary_prompt)} 字符")
        
        # 测试关键要点模板
        keypoints_prompt = await processor._render_template(content_item, "key_points")
        print("✅ 关键要点模板渲染成功")
        print(f"   提示词长度: {len(keypoints_prompt)} 字符")
        
    except Exception as e:
        print(f"❌ 模板渲染失败: {e}")

if __name__ == "__main__":
    print("🔧 流式API测试开始...")
    
    # 首先测试模板渲染
    asyncio.run(test_template_rendering())
    
    # 如果LLM配置可用，测试完整的流式处理
    if hasattr(settings, 'LITELLM_PROXY_URL') and settings.LITELLM_PROXY_URL:
        print("\n🌐 检测到LLM配置，开始完整测试...")
        asyncio.run(test_streaming_processors())
    else:
        print("\n⚠️  未检测到LLM配置，跳过完整测试")
    
    print("\n✨ 测试完成!") 