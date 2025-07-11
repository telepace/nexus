#!/usr/bin/env python3
"""
调试文本处理失败的脚本
"""

import sys
from pathlib import Path

# 添加项目根目录到Python路径
sys.path.insert(0, str(Path(__file__).parent))

import logging
from sqlmodel import Session

from app.core.db import engine
from app.models.content import ContentItem
from app.utils.content_processors import ModernProcessor, ProcessingPipeline, MarkItDownProcessor

# 设置详细日志
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

def test_mark_it_down_processor():
    """测试 MarkItDownProcessor 是否正常工作"""
    print("🧪 测试 MarkItDownProcessor...")
    
    processor = MarkItDownProcessor()
    
    # 测试是否能处理 text 类型
    can_handle_text = processor.can_handle("text")
    print(f"   能处理 text 类型: {can_handle_text}")
    
    if not can_handle_text:
        print("❌ MarkItDownProcessor 不能处理 text 类型")
        return False
    
    print("✅ MarkItDownProcessor 可以处理 text 类型")
    return True

def test_processing_pipeline():
    """测试 ProcessingPipeline 的处理器注册"""
    print("\n🧪 测试 ProcessingPipeline...")
    
    pipeline = ProcessingPipeline()
    
    print(f"   注册的处理步骤数量: {len(pipeline.steps)}")
    
    for i, step in enumerate(pipeline.steps):
        step_name = step.__class__.__name__
        can_handle_text = step.can_handle("text")
        print(f"   步骤 {i+1}: {step_name} - 能处理text: {can_handle_text}")
    
    if len(pipeline.steps) == 0:
        print("❌ 没有注册任何处理步骤")
        return False
    
    # 检查是否有处理器能处理 text
    text_processors = [step for step in pipeline.steps if step.can_handle("text")]
    if not text_processors:
        print("❌ 没有处理器能处理 text 类型")
        return False
    
    print(f"✅ 有 {len(text_processors)} 个处理器能处理 text 类型")
    return True

def test_modern_processor():
    """测试 ModernProcessor 的完整流程"""
    print("\n🧪 测试 ModernProcessor...")
    
    # 创建测试内容项
    test_content = ContentItem(
        id="test-id",
        user_id="test-user",
        type="text",
        content_text="这是一个测试文本内容。\n\n这是第二段。",
        title="测试标题",
        processing_status="processing"
    )
    
    processor = ModernProcessor()
    
    try:
        with Session(engine) as session:
            print("   开始处理测试内容...")
            result = processor.process_content(test_content, session)
            
            print(f"   处理结果: {'成功' if result.success else '失败'}")
            if result.success:
                print(f"   生成的 markdown 长度: {len(result.markdown_content) if result.markdown_content else 0}")
                if result.markdown_content:
                    print(f"   markdown 预览: {result.markdown_content[:200]}...")
            else:
                print(f"   错误信息: {result.error_message}")
            
            return result.success
            
    except Exception as e:
        print(f"   异常: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """主测试函数"""
    print("🔍 开始调试文本处理问题")
    print("=" * 50)
    
    # 测试各个组件
    test1 = test_mark_it_down_processor()
    test2 = test_processing_pipeline() 
    test3 = test_modern_processor()
    
    print("\n" + "=" * 50)
    print("📋 测试结果总结:")
    print(f"   MarkItDownProcessor: {'✅ 正常' if test1 else '❌ 异常'}")
    print(f"   ProcessingPipeline: {'✅ 正常' if test2 else '❌ 异常'}")
    print(f"   ModernProcessor: {'✅ 正常' if test3 else '❌ 异常'}")
    
    if all([test1, test2, test3]):
        print("\n🎉 所有测试通过！文本处理应该正常工作。")
        print("💡 问题可能在于具体的内容数据或环境配置。")
    else:
        print("\n❌ 发现问题，需要进一步调试。")
    
    return all([test1, test2, test3])

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)