#!/usr/bin/env python3
"""
最小化AI处理测试脚本 - 测试关键组件
"""

import asyncio
import os
import sys
from pathlib import Path

import httpx

# 添加项目根目录到Python路径
sys.path.insert(0, str(Path(__file__).parent))


def test_environment():
    """测试环境变量"""
    print("🧪 测试环境变量...")

    required_vars = ["LITELLM_PROXY_URL", "LITELLM_MASTER_KEY", "DEFAULT_LLM_MODEL"]

    for var in required_vars:
        value = os.getenv(var)
        if value:
            print(
                f"   ✅ {var}: {value[:20]}..."
                if len(str(value)) > 20
                else f"   ✅ {var}: {value}"
            )
        else:
            print(f"   ❌ {var}: 未设置")

    print()


async def test_litellm_connection():
    """测试LiteLLM连接"""
    print("🔗 测试LiteLLM连接...")

    proxy_url = os.getenv("LITELLM_PROXY_URL", "http://litellm:4000")
    master_key = os.getenv("LITELLM_MASTER_KEY")
    model = os.getenv("DEFAULT_LLM_MODEL", "or-deepseek-r1")

    if not master_key:
        print("   ❌ 缺少 LITELLM_MASTER_KEY")
        return False

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # 测试health端点
            health_url = f"{proxy_url}/health"
            print(f"   📍 检查健康状态: {health_url}")

            try:
                health_response = await client.get(health_url)
                if health_response.status_code == 200:
                    print("   ✅ LiteLLM 代理运行正常")
                else:
                    print(
                        f"   ❌ LiteLLM 代理健康检查失败: {health_response.status_code}"
                    )
                    return False
            except Exception as e:
                print(f"   ❌ 无法连接到LiteLLM代理: {e}")
                return False

            # 测试简单的chat请求
            chat_url = f"{proxy_url}/chat/completions"
            headers = {
                "Authorization": f"Bearer {master_key}",
                "Content-Type": "application/json",
            }

            test_payload = {
                "model": model,
                "messages": [
                    {
                        "role": "user",
                        "content": "Hello, this is a test. Please respond with 'AI working'.",
                    }
                ],
                "max_tokens": 50,
                "temperature": 0.1,
            }

            print(f"   📤 测试AI模型: {model}")
            try:
                chat_response = await client.post(
                    chat_url, json=test_payload, headers=headers
                )

                if chat_response.status_code == 200:
                    result = chat_response.json()
                    if "choices" in result and len(result["choices"]) > 0:
                        ai_response = result["choices"][0]["message"]["content"]
                        print(f"   ✅ AI响应测试成功: {ai_response[:50]}...")
                        return True
                    else:
                        print(f"   ❌ AI响应格式异常: {result}")
                        return False
                else:
                    print(
                        f"   ❌ AI请求失败: {chat_response.status_code} - {chat_response.text}"
                    )
                    return False

            except Exception as e:
                print(f"   ❌ AI请求异常: {e}")
                return False

    except Exception as e:
        print(f"   ❌ LiteLLM连接测试失败: {e}")
        return False


def test_templates():
    """测试模板文件"""
    print("📝 测试模板文件...")

    template_dir = Path(__file__).parent / "app" / "prompt_templates"
    templates = ["summary.j2", "key_points.j2", "labels.j2"]

    all_good = True
    for template in templates:
        template_path = template_dir / template
        if template_path.exists():
            try:
                content = template_path.read_text(encoding="utf-8")
                if len(content.strip()) > 50:
                    print(f"   ✅ {template}: 正常 ({len(content)} 字符)")
                else:
                    print(f"   ❌ {template}: 内容过短")
                    all_good = False
            except Exception as e:
                print(f"   ❌ {template}: 读取失败 - {e}")
                all_good = False
        else:
            print(f"   ❌ {template}: 文件不存在")
            all_good = False

    print()
    return all_good


async def main():
    """主测试函数"""
    print("🔍 AI处理关键组件测试")
    print("=" * 40)

    # 测试环境变量
    test_environment()

    # 测试模板
    templates_ok = test_templates()

    # 测试LiteLLM连接
    litellm_ok = await test_litellm_connection()

    print("=" * 40)
    print("📋 测试结果总结:")
    print(f"   - 模板文件: {'✅ 正常' if templates_ok else '❌ 异常'}")
    print(f"   - LiteLLM连接: {'✅ 正常' if litellm_ok else '❌ 异常'}")

    if templates_ok and litellm_ok:
        print("\n🎉 所有关键组件测试通过！")
        print("💡 如果AI分析仍然不出现，可能是：")
        print("   1. 数据库连接问题")
        print("   2. 后台任务队列问题")
        print("   3. 前端显示逻辑问题")
        print("\n建议检查应用日志获取更多信息。")
    else:
        print("\n❌ 发现关键组件问题，需要先修复上述问题。")

    return templates_ok and litellm_ok


if __name__ == "__main__":
    # 加载.env文件
    from pathlib import Path

    env_file = Path(__file__).parent.parent / ".env"
    if env_file.exists():
        print(f"📄 加载环境文件: {env_file}")
        with open(env_file) as f:
            for line in f:
                if "=" in line and not line.strip().startswith("#"):
                    key, value = line.strip().split("=", 1)
                    if key and value:
                        os.environ[key] = value.strip('"')
        print()

    result = asyncio.run(main())
    sys.exit(0 if result else 1)
