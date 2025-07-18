#!/usr/bin/env python3
"""
Token管理系统测试脚本

测试内容：
1. 基本token限制获取
2. 动态token调整
3. 模型特定调整
4. 推荐设置生成
5. Token请求验证
"""

import asyncio
import os
import sys
from pathlib import Path

# 添加项目根目录到Python路径
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from app.core.config import settings
from app.utils.token_manager import (
    TokenManager, 
    get_token_limit, 
    get_recommended_settings,
    validate_token_request
)


def test_basic_token_limits():
    """测试基本token限制获取"""
    print("🧪 测试基本token限制...")
    
    test_cases = [
        ("chat", "这是一个测试聊天消息"),
        ("summary", "这是一篇很长的文章，需要生成摘要。" * 50),
        ("analysis", "这是一篇需要深度分析的文档内容。" * 100),
        ("key_points", "这是需要提取要点的内容。" * 30),
        ("labels", "这是需要生成标签的简短内容"),
    ]
    
    for task_type, content in test_cases:
        token_limit = get_token_limit(task_type=task_type, content_text=content)
        print(f"  ✅ {task_type}: {len(content)}字符 -> {token_limit} tokens")
    
    print()


def test_dynamic_adjustment():
    """测试动态token调整"""
    print("🧪 测试动态token调整...")
    
    # 测试不同长度的内容
    contents = [
        ("短内容", "这是一个简短的测试内容。"),
        ("中等内容", "这是一个中等长度的测试内容。" * 50),
        ("长内容", "这是一个很长的测试内容，需要更多的输出token。" * 200),
        ("超长内容", "这是一个超长的测试内容，可能需要大量的输出token来处理。" * 500),
    ]
    
    for name, content in contents:
        # 测试禁用动态调整
        static_limit = get_token_limit(task_type="analysis", content_text=content)
        
        print(f"  📏 {name} ({len(content)}字符):")
        print(f"     Token限制: {static_limit}")
        print(f"     估算输入tokens: {TokenManager.estimate_input_tokens(content)}")
        print()


def test_model_adjustments():
    """测试模型特定调整"""
    print("🧪 测试模型特定调整...")
    
    test_content = "这是一个测试内容，用于验证不同模型的token调整。" * 20
    models = [
        "gpt-4o",
        "gpt-3.5-turbo", 
        "claude-3-5-sonnet",
        "deepseek-v3-ensemble",
        "gemini-2.5-pro",
        "llama-3.1-8b",
        "unknown-model"
    ]
    
    for model in models:
        token_limit = get_token_limit(
            task_type="analysis",
            content_text=test_content,
            model_name=model
        )
        print(f"  🤖 {model}: {token_limit} tokens")
    
    print()


def test_recommended_settings():
    """测试推荐设置生成"""
    print("🧪 测试推荐设置生成...")
    
    test_content = "这是一个需要AI分析的测试内容。" * 100
    qualities = ["fast", "balanced", "high"]
    
    for quality in qualities:
        settings_dict = get_recommended_settings(
            task_type="analysis",
            content_text=test_content,
            target_quality=quality
        )
        
        print(f"  ⚙️ {quality}质量:")
        print(f"     max_tokens: {settings_dict['max_tokens']}")
        print(f"     temperature: {settings_dict['temperature']}")
        print(f"     top_p: {settings_dict['top_p']}")
        print(f"     estimated_input_tokens: {settings_dict['estimated_input_tokens']}")
        print(f"     estimated_total_tokens: {settings_dict['estimated_total_tokens']}")
        print()


def test_validation():
    """测试token请求验证"""
    print("🧪 测试token请求验证...")
    
    test_content = "这是一个测试内容用于验证token请求。" * 50
    test_cases = [
        (100, "过少token"),
        (2000, "正常token"),
        (15000, "较多token"),
        (100000, "过多token"),
        (300000, "超大token"),
    ]
    
    for requested_tokens, description in test_cases:
        is_valid, error_msg, recommended = validate_token_request(
            input_content=test_content,
            requested_max_tokens=requested_tokens,
            task_type="analysis"
        )
        
        status = "✅" if is_valid else "❌"
        print(f"  {status} {description} ({requested_tokens} tokens):")
        if not is_valid:
            print(f"     错误: {error_msg}")
            print(f"     推荐: {recommended} tokens")
        else:
            print(f"     验证通过")
        print()


def test_config_integration():
    """测试配置集成"""
    print("🧪 测试配置集成...")
    
    print(f"  📋 默认最大token: {settings.DEFAULT_MAX_TOKENS}")
    print(f"  📋 动态调整启用: {settings.ENABLE_DYNAMIC_TOKEN_ADJUSTMENT}")
    print(f"  📋 内容比例: {settings.TOKEN_CONTENT_RATIO}")
    print(f"  📋 最小输出token: {settings.MIN_OUTPUT_TOKENS}")
    print(f"  📋 最大输出token: {settings.MAX_OUTPUT_TOKENS}")
    
    print(f"\n  📋 任务token限制:")
    for task, limit in settings.resolved_token_limits.items():
        print(f"     {task}: {limit}")
    
    print()


def test_edge_cases():
    """测试边界情况"""
    print("🧪 测试边界情况...")
    
    # 空内容
    try:
        limit1 = get_token_limit(task_type="chat", content_text="")
        print(f"  ✅ 空内容: {limit1} tokens")
    except Exception as e:
        print(f"  ❌ 空内容错误: {e}")
    
    # 超长内容
    try:
        huge_content = "测试" * 50000
        limit2 = get_token_limit(task_type="analysis", content_text=huge_content)
        print(f"  ✅ 超长内容 ({len(huge_content)}字符): {limit2} tokens")
    except Exception as e:
        print(f"  ❌ 超长内容错误: {e}")
    
    # 未知任务类型
    try:
        limit3 = get_token_limit(task_type="unknown_task", content_text="测试")
        print(f"  ✅ 未知任务类型: {limit3} tokens")
    except Exception as e:
        print(f"  ❌ 未知任务类型错误: {e}")
    
    print()


async def test_performance():
    """测试性能"""
    print("🧪 测试性能...")
    
    import time
    
    test_content = "这是一个性能测试内容。" * 100
    
    # 测试大量调用的性能
    start_time = time.time()
    for i in range(1000):
        get_token_limit(task_type="analysis", content_text=test_content)
    
    end_time = time.time()
    avg_time = (end_time - start_time) / 1000 * 1000  # 转换为毫秒
    
    print(f"  ⚡ 1000次调用平均耗时: {avg_time:.2f}ms")
    print()


def main():
    """主函数"""
    print("🚀 Token管理系统测试开始\n")
    print("=" * 50)
    
    try:
        test_basic_token_limits()
        test_dynamic_adjustment()
        test_model_adjustments()
        test_recommended_settings()
        test_validation()
        test_config_integration()
        test_edge_cases()
        
        # 异步测试
        asyncio.run(test_performance())
        
        print("=" * 50)
        print("✅ 所有测试完成！")
        
    except Exception as e:
        print(f"❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0


if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code) 