#!/usr/bin/env python
"""
密码迁移脚本

由于前端密码加密方式的修复，现有用户的密码哈希是基于加密的密码，
需要重新设置为基于明文密码的哈希。

这个脚本会为所有现有用户重新设置默认密码，用户需要使用密码重置功能来设置新密码。
"""

import sys
from pathlib import Path

from sqlmodel import Session, select

# 添加项目根目录到 Python 路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from app.core.config import settings  # noqa: E402
from app.core.db_factory import engine  # noqa: E402
from app.core.security import get_password_hash  # noqa: E402
from app.models import User  # noqa: E402


def migrate_user_passwords():
    """迁移用户密码"""

    print("🔄 开始迁移用户密码...")

    with Session(engine) as session:
        # 获取所有用户
        users = session.exec(select(User)).all()

        if not users:
            print("📭 没有找到需要迁移的用户")
            return

        print(f"👥 找到 {len(users)} 个用户需要迁移")

        migrated_count = 0

        for user in users:
            # 跳过超级用户，因为他们已经有正确的密码
            if user.email == settings.FIRST_SUPERUSER:
                print(f"⏭️  跳过超级用户: {user.email}")
                continue

            try:
                # 为普通用户设置临时密码
                # 他们需要使用密码重置功能来设置新密码
                temp_password = "temp123456"  # 临时密码
                user.hashed_password = get_password_hash(temp_password)
                session.add(user)

                print(f"✅ 已迁移用户: {user.email} (临时密码: {temp_password})")
                migrated_count += 1

            except Exception as e:
                print(f"❌ 迁移用户 {user.email} 失败: {e}")
                continue

        # 提交更改
        session.commit()

        print("\n🎉 迁移完成！")
        print(f"✅ 成功迁移: {migrated_count} 个用户")
        print("🔑 临时密码: temp123456")
        print("\n⚠️  重要提示:")
        print("1. 所有用户（除超级用户外）的密码已重置为临时密码: temp123456")
        print("2. 用户需要使用密码重置功能来设置新的安全密码")
        print("3. 建议立即通知用户进行密码重置")


def check_password_compatibility():
    """检查密码兼容性"""
    print("🔍 检查密码兼容性...")

    with Session(engine) as session:
        # 获取超级用户
        superuser = session.exec(
            select(User).where(User.email == settings.FIRST_SUPERUSER)
        ).first()

        if not superuser:
            print("❌ 未找到超级用户")
            return False

        from app.core.security import verify_password

        # 测试超级用户密码是否能正确验证
        if verify_password(
            settings.FIRST_SUPERUSER_PASSWORD, superuser.hashed_password
        ):
            print("✅ 超级用户密码验证正常")
            return True
        else:
            print("❌ 超级用户密码验证失败，需要重新设置")

            # 重新设置超级用户密码
            superuser.hashed_password = get_password_hash(
                settings.FIRST_SUPERUSER_PASSWORD
            )
            session.add(superuser)
            session.commit()

            print("✅ 已重新设置超级用户密码")
            return True


if __name__ == "__main__":
    try:
        # 首先检查密码兼容性
        check_password_compatibility()

        # 然后迁移用户密码
        migrate_user_passwords()

    except Exception as e:
        print(f"💥 迁移过程中发生错误: {e}")
        sys.exit(1)
