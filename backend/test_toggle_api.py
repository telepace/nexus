#!/usr/bin/env python3

import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlmodel import Session, select

from app.api.routes.prompts import toggle_prompt_enabled
from app.core.db import engine
from app.models import Prompt, User


def test_toggle_functionality():
    """测试 toggle API 功能"""

    with Session(engine) as session:
        # 获取一个测试提示词
        prompt = session.exec(select(Prompt).where(Prompt.name == "生成摘要")).first()
        if not prompt:
            print("❌ 未找到测试提示词 '生成摘要'")
            return False

        print(f"✅ 找到测试提示词: {prompt.name}")
        print(f"🔧 当前状态: enabled={prompt.enabled}")

        # 获取超级用户
        user = session.exec(select(User).where(User.is_superuser)).first()
        if not user:
            print("❌ 未找到超级用户")
            return False

        print(f"✅ 找到超级用户: {user.email}")

        # 创建一个简单的模拟对象
        class MockUser:
            def __init__(self, user_data):
                self.id = user_data.id
                self.email = user_data.email
                self.is_superuser = user_data.is_superuser

        mock_user = MockUser(user)

        # 测试切换功能
        original_enabled = prompt.enabled
        print(f"🔄 尝试切换状态（从 {original_enabled} 到 {not original_enabled}）")

        try:
            # 调用 toggle 函数
            result = toggle_prompt_enabled(
                db=session,
                prompt_id=prompt.id,
                current_user=mock_user
            )

            print("✅ Toggle 成功!")
            print(f"📊 返回结果: {result}")
            
            # 新的API返回字典格式，包含user_enabled字段
            if isinstance(result, dict) and 'user_enabled' in result:
                user_enabled = result['user_enabled']
                print(f"📊 用户启用状态: user_enabled={user_enabled}")
                print("✅ 用户启用状态切换成功!")
                return True
            else:
                print("❌ 返回格式不正确!")
                return False

        except Exception as e:
            print(f"❌ Toggle 失败: {e}")
            return False

if __name__ == "__main__":
    print("🧪 开始测试 Prompt Toggle API...")
    print("=" * 50)

    success = test_toggle_functionality()

    print("=" * 50)
    if success:
        print("🎉 所有测试通过!")
    else:
        print("💥 测试失败!")

    sys.exit(0 if success else 1)
