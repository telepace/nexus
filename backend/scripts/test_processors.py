#!/usr/bin/env python3
"""
测试内容处理器的脚本

使用方法:
python scripts/test_processors.py
"""

import os
import sys
from pathlib import Path

# 添加项目根目录到 Python 路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

# 设置环境变量
os.environ.setdefault("PYTHONPATH", str(project_root))


def test_url_processing(url: str, expected_chinese_chars: int = 50):
    """测试URL处理"""
    try:
        import uuid
        from datetime import datetime

        from app.models.content import ContentItem
        from app.utils.content_processors import (
            ProcessingPipeline,
        )
        from app.utils.storage.base import StorageService

        print(f"🧪 测试URL处理: {url}")
        print("=" * 60)

        # 创建测试内容项
        content_item = ContentItem(
            id=uuid.uuid4(),
            user_id=uuid.uuid4(),
            type="url",
            source_uri=url,
            title="测试内容",
            processing_status="pending",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )

        # 创建处理管道
        pipeline = ProcessingPipeline()

        # 显示可用处理器
        available_processors = pipeline.get_available_processors("url")
        print("📋 可用处理器:")
        for proc in available_processors:
            status_emoji = "✅" if proc["status"] == "available" else "❌"
            print(f"   {status_emoji} {proc['name']} (优先级: {proc['priority']})")
        print()

        # 创建模拟session和storage
        class MockSession:
            def add(self, obj):
                pass

            def commit(self):
                pass

            def rollback(self):
                pass

        class MockStorageService(StorageService):
            def upload_file(
                self, file_data, file_path: str, content_type: str = None
            ) -> str:
                return file_path

            def download_file(self, file_path: str) -> bytes:
                return b""

            def delete_file(self, file_path: str) -> bool:
                return True

            def file_exists(self, file_path: str) -> bool:
                return False

            def get_file_url(self, file_path: str, expires_in: int = 3600) -> str:
                return f"mock://storage/{file_path}"

        session = MockSession()

        # 处理内容
        print("🔄 开始处理...")
        result = pipeline.process(content_item, session)

        print("📊 处理结果:")
        print(f"   成功: {'✅' if result.success else '❌'}")

        if result.success:
            markdown_content = result.markdown_content or ""
            chinese_chars = len(
                [c for c in markdown_content[:2000] if "\u4e00" <= c <= "\u9fff"]
            )

            print(f"   内容长度: {len(markdown_content)} 字符")
            print(f"   中文字符数: {chinese_chars}")
            print(
                f"   处理器: {result.metadata.get('successful_processor', 'unknown')}"
            )

            # 显示前500字符的预览
            preview = markdown_content[:500]
            print("   内容预览:")
            print("   " + "-" * 50)
            for line in preview.split("\n")[:10]:
                if line.strip():
                    print(f"   {line[:80]}...")
            print("   " + "-" * 50)

            # 检查质量
            if chinese_chars >= expected_chinese_chars:
                print(
                    f"   质量检查: ✅ 中文字符数量正常 ({chinese_chars} >= {expected_chinese_chars})"
                )
                return True
            else:
                print(
                    f"   质量检查: ⚠️  中文字符数量偏少 ({chinese_chars} < {expected_chinese_chars})"
                )
                return False
        else:
            print(f"   错误信息: {result.error_message}")

            if result.metadata:
                print(
                    f"   尝试的处理器: {result.metadata.get('attempted_processors', [])}"
                )
                print(f"   建议: {result.metadata.get('recommendations', [])}")

            return False

    except Exception as e:
        print(f"❌ 测试过程中出现错误: {e}")
        import traceback

        traceback.print_exc()
        return False


def main():
    """运行测试"""
    print("🚀 启动内容处理器测试...")
    print()

    # 测试URL列表
    test_urls = [
        {
            "url": "https://nsddd.top/zh/posts/2024-annual-review/",
            "description": "原问题URL - 中文博客",
            "expected_chinese": 200,
        },
        {
            "url": "https://www.sina.com.cn/",
            "description": "新浪首页 - 中文新闻网站",
            "expected_chinese": 100,
        },
        {
            "url": "https://example.com",
            "description": "简单测试页面",
            "expected_chinese": 0,
        },
    ]

    results = []

    for test_case in test_urls:
        print(f"🧪 测试案例: {test_case['description']}")
        success = test_url_processing(test_case["url"], test_case["expected_chinese"])
        results.append(
            {
                "url": test_case["url"],
                "description": test_case["description"],
                "success": success,
            }
        )
        print()
        print("=" * 80)
        print()

    # 总结
    print("📈 测试总结:")
    successful_tests = sum(1 for r in results if r["success"])
    total_tests = len(results)

    print(f"   总测试数: {total_tests}")
    print(f"   成功测试: {successful_tests}")
    print(f"   失败测试: {total_tests - successful_tests}")
    print(f"   成功率: {successful_tests / total_tests * 100:.1f}%")

    print("\n📋 详细结果:")
    for result in results:
        status = "✅" if result["success"] else "❌"
        print(f"   {status} {result['description']}")
        print(f"      URL: {result['url']}")

    if successful_tests == total_tests:
        print("\n🎉 所有测试都通过了！")
        return 0
    else:
        print(f"\n⚠️  {total_tests - successful_tests} 个测试失败")
        return 1


if __name__ == "__main__":
    sys.exit(main())
