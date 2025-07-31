#!/usr/bin/env python3
"""
LiteLLM路由诊断脚本

用于调查为什么所有模型请求都被路由到同一个后端模型的问题
"""

import sys
from pathlib import Path

import requests

# 添加项目根目录到Python路径
sys.path.insert(0, str(Path(__file__).parent))

from app.core.config import settings


def test_litellm_routing():
    """测试LiteLLM的模型路由功能"""

    print("🔍 LiteLLM路由诊断开始...")
    print(f"📡 LiteLLM代理地址: {settings.LITELLM_PROXY_URL}")
    print("=" * 60)

    # 测试的模型列表
    test_models = [
        "or-gemini-2.5-flash",
        "or-gemini-2.5-pro",
        "or-deepseek-r1",
        "deepseek-v3-ensemble",
        "or-llama-3-1-8b-instruct",
        "gpt-3.5-turbo",
    ]

    headers = {"Content-Type": "application/json"}
    if hasattr(settings, "LITELLM_MASTER_KEY") and settings.LITELLM_MASTER_KEY:
        headers["Authorization"] = f"Bearer {settings.LITELLM_MASTER_KEY}"

    routing_results = {}

    for model in test_models:
        print(f"\n🧪 测试模型: {model}")

        payload = {
            "model": model,
            "messages": [{"role": "user", "content": "Hello"}],
            "max_tokens": 5,
        }

        try:
            response = requests.post(
                f"{settings.LITELLM_PROXY_URL}/v1/chat/completions",
                json=payload,
                headers=headers,
                timeout=30,
            )

            if response.status_code == 200:
                data = response.json()
                actual_model = data.get("model", "NO_MODEL_FIELD")
                usage = data.get("usage", {})

                routing_results[model] = {
                    "actual_model": actual_model,
                    "success": True,
                    "usage": usage,
                }

                status_icon = "✅" if actual_model != model else "⚠️"
                print(f"   {status_icon} 请求: {model}")
                print(f"      响应: {actual_model}")
                print(f"      状态: {'路由' if actual_model != model else '直连'}")

                if usage:
                    print(f"      Token: {usage.get('total_tokens', 'N/A')}")

            else:
                print(f"   ❌ HTTP {response.status_code}: {response.text[:100]}")
                routing_results[model] = {
                    "actual_model": None,
                    "success": False,
                    "error": f"HTTP {response.status_code}",
                }

        except Exception as e:
            print(f"   ❌ 请求失败: {str(e)}")
            routing_results[model] = {
                "actual_model": None,
                "success": False,
                "error": str(e),
            }

    # 分析路由结果
    print("\n" + "=" * 60)
    print("📊 路由分析结果:")

    actual_models = set()
    successful_models = []
    failed_models = []

    for configured, result in routing_results.items():
        if result["success"]:
            successful_models.append(configured)
            actual_models.add(result["actual_model"])
        else:
            failed_models.append(configured)

    print(f"\n✅ 成功请求: {len(successful_models)}/{len(test_models)}")
    print(f"❌ 失败请求: {len(failed_models)}")
    print(f"🎯 实际后端数量: {len(actual_models)}")

    if len(actual_models) == 1 and len(successful_models) > 1:
        print("\n⚠️  问题发现: 所有模型都路由到同一后端!")
        print(f"   实际后端: {list(actual_models)[0]}")
        print("   这解释了为什么监控中显示的都是同一个模型名称")

    print("\n🔍 实际后端模型列表:")
    for actual in sorted(actual_models):
        count = sum(
            1 for r in routing_results.values() if r.get("actual_model") == actual
        )
        print(f"   {actual}: {count} 个配置模型路由到此")

    if failed_models:
        print("\n❌ 失败的模型:")
        for model in failed_models:
            error = routing_results[model]["error"]
            print(f"   {model}: {error}")

    return routing_results


def check_litellm_config():
    """检查LiteLLM配置文件"""
    print("\n📋 检查LiteLLM配置...")

    config_path = Path(__file__).parent.parent / "litellm" / "config.yaml"

    if not config_path.exists():
        print(f"❌ 配置文件不存在: {config_path}")
        return

    try:
        with open(config_path, encoding="utf-8") as f:
            content = f.read()

        print(f"✅ 配置文件路径: {config_path}")
        print(f"📄 文件大小: {len(content)} 字符")

        # 统计配置的模型数量
        lines = content.split("\n")
        model_count = sum(1 for line in lines if "- model_name:" in line)
        print(f"🔢 配置的模型数量: {model_count}")

        # 检查是否有重复的模型映射
        models_to_backends = {}
        current_model = None

        for line in lines:
            if "- model_name:" in line:
                current_model = line.split(":")[1].strip()
            elif "model:" in line and "model_name" not in line and current_model:
                backend = line.split(":", 1)[1].strip()
                if backend in models_to_backends:
                    models_to_backends[backend].append(current_model)
                else:
                    models_to_backends[backend] = [current_model]

        print("\n🔗 后端映射统计:")
        for backend, models in models_to_backends.items():
            if len(models) > 1:
                print(f"   ⚠️  {backend}: {len(models)} 个模型 -> {models}")
            else:
                print(f"   ✅ {backend}: {models[0]}")

    except Exception as e:
        print(f"❌ 读取配置文件失败: {e}")


def suggest_solutions():
    """提供解决方案建议"""
    print("\n💡 解决方案建议:")
    print("=" * 60)

    print("1. 🔧 检查LiteLLM服务状态:")
    print("   - 重启LiteLLM代理服务")
    print("   - 检查配置文件是否正确加载")
    print("   - 验证API密钥配置")

    print("\n2. 🔍 排查路由配置:")
    print("   - 检查是否有默认路由规则")
    print("   - 验证模型名称映射是否正确")
    print("   - 确认各个后端服务是否可用")

    print("\n3. 🛠️  代码层面修复:")
    print("   - 记录配置模型名称而不是实际模型名称")
    print("   - 在元数据中保留实际调用信息")
    print("   - 建立模型映射表进行显示转换")

    print("\n4. 📊 监控改进:")
    print("   - 显示配置模型名称")
    print("   - 添加实际后端模型信息")
    print("   - 记录路由映射关系")


if __name__ == "__main__":
    try:
        routing_results = test_litellm_routing()
        check_litellm_config()
        suggest_solutions()

        print("\n🎯 诊断完成!")

        # 判断是否有路由问题
        successful_results = {k: v for k, v in routing_results.items() if v["success"]}
        unique_backends = {r["actual_model"] for r in successful_results.values()}

        if len(unique_backends) == 1 and len(successful_results) > 1:
            print(f"⚠️  确认存在路由问题: 所有模型都路由到 {list(unique_backends)[0]}")
            sys.exit(1)
        else:
            print("✅ 路由功能正常")

    except Exception as e:
        print(f"❌ 诊断过程中出错: {e}")
        sys.exit(1)
