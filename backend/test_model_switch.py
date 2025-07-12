#!/usr/bin/env python3
"""
测试模型切换脚本
验证当前所有AI任务是否都使用了指定的模型
"""

import asyncio
import sys
from pathlib import Path

# 添加项目根目录到Python路径
sys.path.insert(0, str(Path(__file__).parent))

from app.core.config import settings


def test_configuration():
    """测试配置"""
    print("🔧 当前配置:")
    print(f"   DEFAULT_LLM_MODEL: {settings.DEFAULT_LLM_MODEL}")
    print(f"   基础AI任务模型配置:")
    for task, model in settings.AI_TASK_MODELS.items():
        print(f"     {task:15} -> {model}")
    print(f"   最终解析的模型配置:")
    for task, model in settings.resolved_ai_task_models.items():
        print(f"     {task:15} -> {model}")
    
    print(f"   环境变量覆盖:")
    env_vars = {
        "AI_MODEL_SUMMARY": settings.AI_MODEL_SUMMARY,
        "AI_MODEL_KEY_POINTS": settings.AI_MODEL_KEY_POINTS,
        "AI_MODEL_LABELS": settings.AI_MODEL_LABELS,
        "AI_MODEL_CHAT": settings.AI_MODEL_CHAT,
        "AI_MODEL_ANALYSIS": settings.AI_MODEL_ANALYSIS,
    }
    for var, value in env_vars.items():
        if value:
            print(f"     {var:20} = {value}")
    print()


async def test_model_usage():
    """测试实际模型使用"""
    from app.services.ai.chat_service import ChatService
    
    chat_service = ChatService()
    
    print("🧪 测试模板->模型映射:")
    
    # 测试不同模板的模型选择
    test_templates = ["summary.j2", "key_points.j2", "labels.j2", "segment_aware_chat.j2"]
    
    for template_name in test_templates:
        selected_model = chat_service.get_model_for_template(template_name)
        print(f"   {template_name:20} -> {selected_model}")
    
    print()


def main():
    """主函数"""
    print("=" * 80)
    print("🔄 基于环境变量的模型切换验证测试")
    print("=" * 80)
    
    # 测试配置
    test_configuration()
    
    # 测试模型使用
    asyncio.run(test_model_usage())
    
    print("=" * 80)
    print("✅ 测试完成")
    print()
    print("📝 使用说明:")
    print("   1. 通过环境变量设置全局默认: DEFAULT_LLM_MODEL=model-name")
    print("   2. 通过环境变量覆盖特定任务:")
    print("      - AI_MODEL_SUMMARY=model-name      # Summary生成")
    print("      - AI_MODEL_KEY_POINTS=model-name   # 关键点提取")
    print("      - AI_MODEL_LABELS=model-name       # 标签生成")
    print("      - AI_MODEL_CHAT=model-name         # 对话聊天")
    print("      - AI_MODEL_ANALYSIS=model-name     # 通用分析")
    print("   3. 重启服务以应用新配置")
    print("   4. 在 Langfuse 中查看实际使用的模型")
    print("=" * 80)


if __name__ == "__main__":
    main() 