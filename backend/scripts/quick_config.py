#!/usr/bin/env python3
"""
快速配置内容处理器的脚本

使用方法:
python scripts/quick_config.py --processor jina
python scripts/quick_config.py --processor readability
python scripts/quick_config.py --show-current
"""

import argparse
import os
import sys
from pathlib import Path

# 添加项目根目录到 Python 路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))


def set_processor(processor_name: str):
    """设置内容处理器"""
    valid_processors = {"jina", "firecrawl", "scrapingbee", "readability", "markitdown"}

    if processor_name not in valid_processors:
        print(f"❌ 无效的处理器名称: {processor_name}")
        print(f"有效选项: {', '.join(valid_processors)}")
        return False

    print(f"🎯 设置内容处理器为: {processor_name}")
    print("=" * 50)
    print(f"CONTENT_PROCESSOR={processor_name}")

    # 根据处理器类型给出API Key提示
    if processor_name == "jina":
        print("\n⚠️  注意: 需要配置 JINA_API_KEY")
        print("获取地址: https://cloud.jina.ai/")
    elif processor_name == "firecrawl":
        print("\n⚠️  注意: 需要配置 FIRECRAWL_API_KEY")
        print("获取地址: https://firecrawl.dev/")
    elif processor_name == "scrapingbee":
        print("\n⚠️  注意: 需要配置 SCRAPINGBEE_API_KEY")
        print("获取地址: https://www.scrapingbee.com/")
    elif processor_name == "readability":
        print("\n✅ 免费处理器，无需API Key")
        print("说明: 使用 BeautifulSoup 提取网页内容")
    elif processor_name == "markitdown":
        print("\n✅ 免费处理器，无需API Key")
        print("说明: 使用 Microsoft MarkItDown 处理内容")

    return True


def show_current_config():
    """显示当前配置"""
    try:
        from app.core.config import settings

        print("🔧 当前内容处理器配置:")
        print("=" * 50)
        print(f"📌 选择的处理器: {settings.CONTENT_PROCESSOR}")

        # 检查API Key状态
        api_keys = {
            "jina": settings.JINA_API_KEY,
            "firecrawl": settings.FIRECRAWL_API_KEY,
            "scrapingbee": settings.SCRAPINGBEE_API_KEY,
        }

        print("\n🔑 API Key 状态:")
        for processor, api_key in api_keys.items():
            status = "✅ 已配置" if api_key else "❌ 未配置"
            print(f"   {processor.upper()}: {status}")

        return True

    except Exception as e:
        print(f"❌ 无法读取配置: {e}")
        return False


def test_config():
    """测试当前配置"""
    try:
        from app.core.config import settings
        from app.utils.content_processors import ProcessingPipeline

        print("🧪 测试当前配置...")
        print("=" * 50)

        print(f"✅ 选择的处理器: {settings.CONTENT_PROCESSOR}")

        # 创建处理器管道并测试
        pipeline = ProcessingPipeline()

        if len(pipeline.steps) > 0:
            processor = pipeline.steps[0]
            processor_name = processor.__class__.__name__
            print(f"📊 实际使用的处理器: {processor_name}")

            # 检查是否能处理URL
            can_handle = processor.can_handle("url")
            print(f"🔗 支持URL处理: {'是' if can_handle else '否'}")

            return True
        else:
            print("❌ 没有可用的处理器")
            return False

    except Exception as e:
        print(f"❌ 测试失败: {e}")
        return False


def show_env_instructions(processor_name: str):
    """显示如何应用配置的说明"""
    print("\n📝 应用配置方法:")
    print("=" * 50)
    print("方法1: 直接修改 .env 文件")
    print("在 .env 文件中添加或修改:")
    print(f"CONTENT_PROCESSOR={processor_name}")

    print("\n方法2: 使用环境变量")
    print("在启动应用前设置:")
    print(f"export CONTENT_PROCESSOR={processor_name}")

    env_file = project_root.parent / ".env"  # 指向根目录的.env文件
    print("\n方法3: 编辑配置文件")
    print(f"编辑文件: {env_file}")


def main():
    """主函数"""
    parser = argparse.ArgumentParser(description="快速配置 Nexus 内容处理器")
    parser.add_argument(
        "--processor",
        choices=["jina", "firecrawl", "scrapingbee", "readability", "markitdown"],
        help="选择要使用的处理器",
    )
    parser.add_argument("--test", action="store_true", help="测试当前配置")
    parser.add_argument("--show-current", action="store_true", help="显示当前配置")

    args = parser.parse_args()

    if args.test:
        return 0 if test_config() else 1

    if args.show_current:
        return 0 if show_current_config() else 1

    if args.processor:
        if set_processor(args.processor):
            show_env_instructions(args.processor)

            # 询问是否要测试配置
            try:
                response = input("\n🧪 是否要测试新配置？(y/N): ").strip().lower()
                if response in ["y", "yes"]:
                    # 临时设置环境变量进行测试
                    os.environ["CONTENT_PROCESSOR"] = args.processor

                    print("\n" + "=" * 50)
                    test_config()
            except KeyboardInterrupt:
                print("\n操作取消")

            return 0
        else:
            return 1

    parser.print_help()
    return 1


if __name__ == "__main__":
    sys.exit(main())
