#!/usr/bin/env python3
"""
Test script for custom user ID functionality.

This script tests the ability to specify a custom UUID for the admin user.
"""

import os
import sys
import uuid
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

# Local imports after path modification
from sqlmodel import Session, select  # noqa: E402

from app.base import User  # noqa: E402
from app.core.db import engine  # noqa: E402


def test_custom_user_id():
    """测试自定义用户ID功能"""
    print("🧪 测试自定义用户ID功能")

    # 检查当前管理员用户
    with Session(engine) as session:
        admin_user = session.exec(
            select(User).where(User.email == "admin@telepace.cc")
        ).first()

        if admin_user:
            print("✅ 找到管理员用户")
            print(f"📧 邮箱: {admin_user.email}")
            print(f"🆔 用户ID: {admin_user.id}")
            print(f"👑 超级用户: {admin_user.is_superuser}")

            # 检查是否使用了环境变量中指定的ID
            env_user_id = os.environ.get("FIRST_SUPERUSER_ID")
            if env_user_id:
                try:
                    expected_id = uuid.UUID(env_user_id)
                    if admin_user.id == expected_id:
                        print(f"✅ 用户ID与环境变量中指定的ID匹配: {expected_id}")
                    else:
                        print(
                            f"❌ 用户ID不匹配！期望: {expected_id}, 实际: {admin_user.id}"
                        )
                except ValueError:
                    print(f"❌ 环境变量中的用户ID格式无效: {env_user_id}")
            else:
                print("ℹ️  未设置 FIRST_SUPERUSER_ID 环境变量，使用自动生成的ID")
        else:
            print("❌ 未找到管理员用户")


def test_uuid_validation():
    """测试UUID验证功能"""
    print("\n🧪 测试UUID验证功能")

    # 测试有效的UUID
    valid_uuid = "e8ccbeed-f588-4b9a-95ca-000000000000"
    try:
        uuid.UUID(valid_uuid)
        print(f"✅ 有效的UUID: {valid_uuid}")
    except ValueError:
        print(f"❌ UUID验证失败: {valid_uuid}")

    # 测试无效的UUID
    invalid_uuid = "invalid-uuid-format"
    try:
        uuid.UUID(invalid_uuid)
        print(f"❌ 应该失败但通过了: {invalid_uuid}")
    except ValueError:
        print(f"✅ 正确识别无效UUID: {invalid_uuid}")


def main():
    """主函数"""
    print("🔬 自定义用户ID功能测试")
    print("=" * 50)

    test_custom_user_id()
    test_uuid_validation()

    print("\n" + "=" * 50)
    print("✅ 测试完成")


if __name__ == "__main__":
    main()
