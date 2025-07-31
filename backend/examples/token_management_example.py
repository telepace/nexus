#!/usr/bin/env python3
"""
Token管理系统使用示例

这个脚本展示了如何在实际项目中使用token管理系统
"""

import sys
from pathlib import Path

# 添加项目根目录到Python路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from app.utils.token_manager import (
    get_recommended_settings,
    get_token_limit,
    validate_token_request,
)


def example_basic_usage():
    """基础使用示例"""
    print("🔧 基础使用示例")
    print("=" * 40)

    # 模拟不同长度的内容
    short_content = "这是一个简短的用户提问。"
    medium_content = "这是一篇中等长度的文章，包含了一些基本信息和观点。" * 10
    long_content = "这是一篇很长的研究文档，包含了大量的数据、分析和结论。" * 50

    contents = [
        ("短内容", short_content),
        ("中等内容", medium_content),
        ("长内容", long_content)
    ]

    tasks = ["chat", "summary", "analysis", "key_points"]

    for content_name, content in contents:
        print(f"\n📄 {content_name} ({len(content)}字符):")

        for task in tasks:
            token_limit = get_token_limit(
                task_type=task,
                content_text=content
            )
            print(f"  {task:12}: {token_limit:5} tokens")


def example_quality_settings():
    """质量设置示例"""
    print("\n\n⚙️ 质量设置示例")
    print("=" * 40)

    content = "请分析这篇关于人工智能发展趋势的研究报告..." * 30
    qualities = ["fast", "balanced", "high"]

    for quality in qualities:
        settings = get_recommended_settings(
            task_type="analysis",
            content_text=content,
            target_quality=quality
        )

        print(f"\n🎯 {quality}质量:")
        print(f"  max_tokens: {settings['max_tokens']}")
        print(f"  temperature: {settings['temperature']}")
        print(f"  top_p: {settings['top_p']}")
        print(f"  estimated_total_tokens: {settings['estimated_total_tokens']}")


def example_validation():
    """验证示例"""
    print("\n\n✅ 验证示例")
    print("=" * 40)

    content = "需要验证的内容..." * 20

    test_cases = [
        (50, "太少"),
        (2000, "正常"),
        (20000, "较多"),
        (150000, "过多")
    ]

    for requested_tokens, description in test_cases:
        is_valid, error_msg, recommended = validate_token_request(
            input_content=content,
            requested_max_tokens=requested_tokens,
            task_type="analysis"
        )

        status = "✅" if is_valid else "❌"
        print(f"\n{status} {description} ({requested_tokens} tokens):")

        if not is_valid:
            print(f"  错误: {error_msg}")
            print(f"  建议: {recommended} tokens")


def example_model_differences():
    """模型差异示例"""
    print("\n\n🤖 模型差异示例")
    print("=" * 40)

    content = "这是一个测试不同模型token调整的内容。" * 25
    models = [
        "gpt-4o",
        "claude-3-5-sonnet",
        "deepseek-v3-ensemble",
        "gemini-2.5-pro",
        "unknown-model"
    ]

    print(f"内容长度: {len(content)}字符\n")

    for model in models:
        token_limit = get_token_limit(
            task_type="analysis",
            content_text=content,
            model_name=model
        )
        print(f"  {model:20}: {token_limit} tokens")


def example_practical_scenarios():
    """实际场景示例"""
    print("\n\n💼 实际场景示例")
    print("=" * 40)

    scenarios = [
        {
            "name": "📧 邮件摘要",
            "task": "summary",
            "content": "尊敬的客户，我们很高兴地宣布新产品的发布..." * 15,
            "quality": "fast"
        },
        {
            "name": "📊 数据报告分析",
            "task": "analysis",
            "content": "2024年第一季度业绩报告显示，公司收入同比增长..." * 80,
            "quality": "high"
        },
        {
            "name": "💬 客服对话",
            "task": "chat",
            "content": "用户咨询：请问如何重置密码？",
            "quality": "balanced"
        },
        {
            "name": "🔍 研究论文要点",
            "task": "key_points",
            "content": "基于深度学习的自然语言处理技术在过去几年中取得了显著进展..." * 60,
            "quality": "high"
        }
    ]

    for scenario in scenarios:
        print(f"\n{scenario['name']}:")

        settings = get_recommended_settings(
            task_type=scenario['task'],
            content_text=scenario['content'],
            target_quality=scenario['quality']
        )

        print(f"  任务类型: {scenario['task']}")
        print(f"  内容长度: {len(scenario['content'])}字符")
        print(f"  质量级别: {scenario['quality']}")
        print(f"  推荐token: {settings['max_tokens']}")
        print(f"  温度设置: {settings['temperature']}")


def example_integration_code():
    """集成代码示例"""
    print("\n\n🔗 集成代码示例")
    print("=" * 40)

    print("""
# 在你的LLM服务中使用token管理器

from app.utils.token_manager import get_recommended_settings

async def my_ai_service(content: str, task_type: str):
    # 获取推荐设置
    settings = get_recommended_settings(
        task_type=task_type,
        content_text=content,
        target_quality="balanced"
    )

    # 调用LLM API
    response = await llm_client.chat.completions.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": "你是一个助手"},
            {"role": "user", "content": content}
        ],
        max_tokens=settings['max_tokens'],
        temperature=settings['temperature'],
        top_p=settings['top_p']
    )

    return response

# 使用示例
result = await my_ai_service(
    content="用户的长文档内容...",
    task_type="analysis"
)
""")


def main():
    """主函数"""
    print("🚀 Token管理系统使用示例")
    print("=" * 50)

    try:
        example_basic_usage()
        example_quality_settings()
        example_validation()
        example_model_differences()
        example_practical_scenarios()
        example_integration_code()

        print("\n" + "=" * 50)
        print("✅ 示例演示完成！")
        print("\n📚 更多信息请参考:")
        print("  - backend/docs/token_management_zh.md")
        print("  - backend/test_token_system.py")

    except Exception as e:
        print(f"❌ 示例运行失败: {e}")
        import traceback
        traceback.print_exc()
        return 1

    return 0


if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
