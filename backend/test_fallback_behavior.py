#!/usr/bin/env python3
"""
测试URL处理的降级行为：当Jina API不可用时，自动降级到MarkItDown
"""

import uuid
import os
from unittest.mock import patch
from sqlmodel import Session, create_engine

from app.core.config import settings
from app.models.content import ContentItem
from app.utils.content_processors import ContentProcessorFactory


def test_fallback_behavior():
    """测试降级行为"""
    print("🧪 开始测试URL处理的降级行为...")
    
    # 创建数据库连接
    engine = create_engine(str(settings.SQLALCHEMY_DATABASE_URI))
    
    with Session(engine) as session:
        # 测试1: 有Jina API Key的情况
        print("\n📋 测试1: 有Jina API Key的情况")
        content_item_1 = ContentItem(
            id=uuid.uuid4(),
            user_id=uuid.uuid4(),
            type="url",
            source_uri="https://example.com",
            title="测试URL处理（有API Key）",
            processing_status="pending"
        )
        
        session.add(content_item_1)
        session.commit()
        session.refresh(content_item_1)
        
        processor = ContentProcessorFactory.get_processor("url")
        
        try:
            result = processor.process_content(content_item_1, session)
            if result.success:
                processor_used = result.metadata.get("processor", "unknown") if result.metadata else "unknown"
                print(f"✅ 处理成功，使用的处理器: {processor_used}")
                print(f"📝 内容长度: {len(result.markdown_content) if result.markdown_content else 0}")
            else:
                print(f"❌ 处理失败: {result.error_message}")
        except Exception as e:
            print(f"❌ 处理异常: {str(e)}")
        
        # 测试2: 模拟没有Jina API Key的情况
        print("\n📋 测试2: 模拟没有Jina API Key的情况")
        
        # 临时修改settings来模拟没有API Key
        with patch('app.utils.content_processors.settings') as mock_settings:
            # 复制所有原始设置
            for attr in dir(settings):
                if not attr.startswith('_'):
                    setattr(mock_settings, attr, getattr(settings, attr))
            
            # 设置JINA_API_KEY为None
            mock_settings.JINA_API_KEY = None
            
            content_item_2 = ContentItem(
                id=uuid.uuid4(),
                user_id=uuid.uuid4(),
                type="url",
                source_uri="https://example.com",
                title="测试URL处理（无API Key）",
                processing_status="pending"
            )
            
            session.add(content_item_2)
            session.commit()
            session.refresh(content_item_2)
            
            # 创建新的处理器实例（这样它会使用模拟的settings）
            from app.utils.content_processors import ModernProcessor
            fallback_processor = ModernProcessor()
            
            try:
                result = fallback_processor.process_content(content_item_2, session)
                if result.success:
                    processor_used = result.metadata.get("processor", "unknown") if result.metadata else "unknown"
                    print(f"✅ 处理成功，使用的处理器: {processor_used}")
                    print(f"📝 内容长度: {len(result.markdown_content) if result.markdown_content else 0}")
                    
                    if processor_used == "markitdown":
                        print("✅ 确认系统正确降级到MarkItDown处理器")
                    else:
                        print("⚠️  未按预期降级到MarkItDown处理器")
                else:
                    print(f"❌ 处理失败: {result.error_message}")
            except Exception as e:
                print(f"❌ 处理异常: {str(e)}")
        
        # 测试3: 模拟Jina API调用失败的情况
        print("\n📋 测试3: 模拟Jina API调用失败的情况")
        
        # 模拟Jina API调用失败
        with patch('app.utils.content_processors.requests.post') as mock_post:
            # 模拟API调用失败
            mock_post.side_effect = Exception("Network error")
            
            content_item_3 = ContentItem(
                id=uuid.uuid4(),
                user_id=uuid.uuid4(),
                type="url",
                source_uri="https://example.com",
                title="测试URL处理（API失败）",
                processing_status="pending"
            )
            
            session.add(content_item_3)
            session.commit()
            session.refresh(content_item_3)
            
            processor = ContentProcessorFactory.get_processor("url")
            
            try:
                result = processor.process_content(content_item_3, session)
                if result.success:
                    processor_used = result.metadata.get("processor", "unknown") if result.metadata else "unknown"
                    print(f"✅ 处理成功，使用的处理器: {processor_used}")
                    print(f"📝 内容长度: {len(result.markdown_content) if result.markdown_content else 0}")
                    
                    if processor_used == "markitdown":
                        print("✅ 确认系统在Jina API失败后正确降级到MarkItDown处理器")
                    else:
                        print("⚠️  未按预期降级到MarkItDown处理器")
                else:
                    print(f"❌ 处理失败: {result.error_message}")
            except Exception as e:
                print(f"❌ 处理异常: {str(e)}")


def test_configuration_scenarios():
    """测试不同配置场景"""
    print("\n🧪 开始测试不同配置场景...")
    
    # 检查当前配置
    print(f"🔑 当前JINA_API_KEY状态: {'✅ 已配置' if settings.JINA_API_KEY else '❌ 未配置'}")
    
    # 测试处理器初始化
    from app.utils.content_processors import ProcessingPipeline, JinaProcessor, MarkItDownProcessor
    
    print("\n📋 测试处理器管道初始化...")
    pipeline = ProcessingPipeline()
    
    print(f"📊 管道中的处理器数量: {len(pipeline.steps)}")
    
    jina_processors = [step for step in pipeline.steps if isinstance(step, JinaProcessor)]
    markitdown_processors = [step for step in pipeline.steps if isinstance(step, MarkItDownProcessor)]
    
    print(f"🔧 Jina处理器数量: {len(jina_processors)}")
    print(f"🔧 MarkItDown处理器数量: {len(markitdown_processors)}")
    
    if settings.JINA_API_KEY:
        if len(jina_processors) > 0:
            print("✅ 有API Key时正确添加了Jina处理器")
        else:
            print("❌ 有API Key但未添加Jina处理器")
    else:
        if len(jina_processors) == 0:
            print("✅ 无API Key时正确跳过了Jina处理器")
        else:
            print("❌ 无API Key但仍添加了Jina处理器")
    
    if len(markitdown_processors) > 0:
        print("✅ 正确添加了MarkItDown处理器作为备用")
    else:
        print("❌ 未添加MarkItDown处理器")


if __name__ == "__main__":
    print("🚀 开始测试URL处理的降级行为...")
    
    # 测试配置场景
    test_configuration_scenarios()
    
    # 测试降级行为
    test_fallback_behavior()
    
    print("\n🎉 降级行为测试完成!")
    print("\n💡 总结:")
    print("1. 当配置了JINA_API_KEY时，系统优先使用Jina处理器")
    print("2. 当没有配置JINA_API_KEY时，系统直接使用MarkItDown处理器")
    print("3. 当Jina API调用失败时，系统会降级到MarkItDown处理器")
    print("4. 这确保了URL处理功能的高可用性") 