#!/usr/bin/env python3
"""
简单验证脚本 - 直接检查代码结构
"""

import ast
import os
from pathlib import Path


def check_background_tasks_file():
    """检查background_tasks.py文件"""
    file_path = Path("app/utils/background_tasks.py")

    if not file_path.exists():
        print("❌ background_tasks.py not found")
        return False

    try:
        with open(file_path, "r") as f:
            content = f.read()

        # 检查关键方法是否存在
        if "def start_ai_regeneration(" in content:
            print("✅ start_ai_regeneration method found")
        else:
            print("❌ start_ai_regeneration method not found")
            return False

        if "async def _regenerate_ai_analysis_async(" in content:
            print("✅ _regenerate_ai_analysis_async method found")
        else:
            print("❌ _regenerate_ai_analysis_async method not found")
            return False

        # 检查导入是否正确
        if "from app.utils.events import content_event_manager" in content:
            print("✅ Correct event manager import found")
        else:
            print("❌ Incorrect event manager import")
            return False

        if "from app.utils.timezone import now_utc" in content:
            print("✅ Correct timezone import found")
        else:
            print("❌ Incorrect timezone import")
            return False

        return True

    except Exception as e:
        print(f"❌ Error reading background_tasks.py: {e}")
        return False


def check_content_api_file():
    """检查content.py API文件"""
    file_path = Path("app/api/routes/content.py")

    if not file_path.exists():
        print("❌ content.py not found")
        return False

    try:
        with open(file_path, "r") as f:
            content = f.read()

        # 检查regenerate_ai_analysis_endpoint是否存在
        if "def regenerate_ai_analysis_endpoint(" in content:
            print("✅ regenerate_ai_analysis_endpoint found")
        else:
            print("❌ regenerate_ai_analysis_endpoint not found")
            return False

        # 检查是否调用了start_ai_regeneration
        if "background_task_manager.start_ai_regeneration(" in content:
            print("✅ start_ai_regeneration call found")
        else:
            print("❌ start_ai_regeneration call not found")
            return False

        return True

    except Exception as e:
        print(f"❌ Error reading content.py: {e}")
        return False


def check_content_card_file():
    """检查ContentCard.tsx文件"""
    file_path = Path(
        "../frontend/app/(withSidebar)/content-library/components/ContentCard.tsx"
    )

    if not file_path.exists():
        print("❌ ContentCard.tsx not found")
        return False

    try:
        with open(file_path, "r") as f:
            content = f.read()

        # 检查重新生成AI分析按钮是否正确处理事件
        if "e.preventDefault()" in content and "e.stopPropagation()" in content:
            print("✅ Event handling in ContentCard found")
        else:
            print("❌ Event handling in ContentCard not found")
            return False

        # 检查handleRegenerateAI是否存在
        if "handleRegenerateAI" in content:
            print("✅ handleRegenerateAI function found")
        else:
            print("❌ handleRegenerateAI function not found")
            return False

        return True

    except Exception as e:
        print(f"❌ Error reading ContentCard.tsx: {e}")
        return False


def main():
    """主函数"""
    print("🔍 Simple Verification of AI Regeneration Functionality\n")

    tests = [
        ("Backend Task Manager", check_background_tasks_file),
        ("Backend API Endpoint", check_content_api_file),
        ("Frontend ContentCard", check_content_card_file),
    ]

    results = []
    for test_name, test_func in tests:
        print(f"\n📋 Testing {test_name}...")
        try:
            result = test_func()
            results.append(result)
            if result:
                print(f"✅ {test_name} passed")
            else:
                print(f"❌ {test_name} failed")
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {e}")
            results.append(False)

    print(f"\n📊 Test Results: {sum(results)}/{len(results)} passed")

    if all(results):
        print(
            "🎉 All tests passed! AI regeneration functionality appears to be correctly implemented."
        )
        return 0
    else:
        print("❌ Some tests failed. Please check the errors above.")
        return 1


if __name__ == "__main__":
    import sys

    sys.exit(main())
