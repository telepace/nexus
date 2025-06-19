#!/usr/bin/env python
"""
测试登录功能脚本

用于验证修复后的登录功能是否正常工作
"""

import json
import sys
from pathlib import Path

import requests

# 添加项目根目录到 Python 路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from app.core.config import settings  # noqa: E402


def test_login_api():
    """测试登录API"""

    base_url = "http://localhost:8000"

    print("🔄 测试登录功能...")

    # 测试数据
    test_cases = [
        {
            "name": "超级用户登录",
            "email": settings.FIRST_SUPERUSER,
            "password": settings.FIRST_SUPERUSER_PASSWORD,
            "should_succeed": True,
        },
        {
            "name": "错误密码登录",
            "email": settings.FIRST_SUPERUSER,
            "password": "wrongpassword",
            "should_succeed": False,
        },
    ]

    for test_case in test_cases:
        print(f"\n🧪 测试: {test_case['name']}")

        # 准备登录数据
        login_data = {"email": test_case["email"], "password": test_case["password"]}

        try:
            # 测试 JSON 登录端点
            response = requests.post(
                f"{base_url}/api/v1/auth/login",
                json=login_data,
                headers={"Content-Type": "application/json"},
                timeout=10,
            )

            print("📤 请求: POST /api/v1/auth/login")
            print(f"📦 数据: {json.dumps(login_data, ensure_ascii=False)}")
            print(f"📥 响应状态: {response.status_code}")

            if test_case["should_succeed"]:
                if response.status_code == 200:
                    data = response.json()
                    if "access_token" in data:
                        print("✅ 登录成功！获得访问令牌")
                    else:
                        print(f"❌ 登录成功但未获得访问令牌: {data}")
                else:
                    print(f"❌ 登录失败: {response.text}")
            else:
                if response.status_code == 400:
                    print("✅ 正确拒绝了错误的登录")
                else:
                    print(f"❌ 应该拒绝登录但却成功了: {response.status_code}")

        except requests.exceptions.RequestException as e:
            print(f"❌ 网络错误: {e}")

        except Exception as e:
            print(f"❌ 其他错误: {e}")


def test_server_health():
    """测试服务器健康状态"""

    base_url = "http://localhost:8000"

    try:
        response = requests.get(f"{base_url}/api/v1/health/check", timeout=5)
        if response.status_code == 200:
            print("✅ 后端服务运行正常")
            return True
        else:
            print(f"❌ 后端服务状态异常: {response.status_code}")
            return False
    except requests.exceptions.RequestException:
        print("❌ 无法连接到后端服务")
        return False


if __name__ == "__main__":
    print("🔧 密码修复验证测试")
    print("=" * 50)

    # 首先检查服务器是否运行
    if not test_server_health():
        print("\n💡 请先启动后端服务:")
        print("   make backend-start")
        sys.exit(1)

    # 测试登录功能
    test_login_api()

    print("\n🎉 测试完成！")
    print("\n💡 如果登录仍然失败，请:")
    print("1. 确认已运行密码迁移脚本: make backend-migrate-passwords")
    print("2. 检查前端是否正确加密密码")
    print("3. 检查环境变量 NEXT_PUBLIC_APP_SYMMETRIC_ENCRYPTION_KEY 是否设置正确")
