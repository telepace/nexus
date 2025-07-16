#!/usr/bin/env python3
"""
AI配置检查脚本 - 无外部依赖
"""

import os
import subprocess
import sys
from pathlib import Path


def load_env_file():
    """加载.env文件"""
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
        return True
    else:
        print("❌ 未找到.env文件")
        return False


def check_ai_config():
    """检查AI相关配置"""
    print("🔍 检查AI配置...")

    config_items = [
        ("LITELLM_PROXY_URL", "LiteLLM代理地址"),
        ("LITELLM_MASTER_KEY", "LiteLLM主密钥"),
        ("DEFAULT_LLM_MODEL", "默认LLM模型"),
    ]

    all_good = True
    for key, desc in config_items:
        value = os.getenv(key)
        if value:
            if "KEY" in key or "PASSWORD" in key:
                display_value = f"{value[:10]}..." if len(value) > 10 else value
            else:
                display_value = value
            print(f"   ✅ {desc}: {display_value}")
        else:
            print(f"   ❌ {desc}: 未设置")
            all_good = False

    print()
    return all_good


def check_litellm_service():
    """检查LiteLLM服务是否运行"""
    print("🔍 检查LiteLLM服务状态...")

    proxy_url = os.getenv("LITELLM_PROXY_URL", "")

    if "localhost:4000" in proxy_url:
        # 检查本地端口4000是否在监听
        try:
            result = subprocess.run(
                ["lsof", "-i", ":4000"], capture_output=True, text=True, timeout=5
            )
            if result.returncode == 0 and result.stdout.strip():
                print("   ✅ 本地端口4000有服务在监听")
                print(f"   📍 服务详情: {result.stdout.strip().split()[0:2]}")
                return True
            else:
                print("   ❌ 本地端口4000没有服务在监听")
                return False
        except Exception as e:
            print(f"   ⚠️  无法检查端口状态: {e}")
            return False

    elif "litellm:4000" in proxy_url:
        # Docker容器地址，检查Docker容器是否运行
        try:
            result = subprocess.run(
                [
                    "docker",
                    "ps",
                    "--filter",
                    "name=litellm",
                    "--format",
                    "table {{.Names}}\\t{{.Status}}",
                ],
                capture_output=True,
                text=True,
                timeout=10,
            )
            if result.returncode == 0:
                lines = result.stdout.strip().split("\n")
                if len(lines) > 1:  # 除了表头
                    print("   ✅ LiteLLM Docker容器正在运行")
                    for line in lines[1:]:
                        print(f"   📍 容器状态: {line}")
                    return True
                else:
                    print("   ❌ 没有找到运行中的LiteLLM容器")
                    return False
            else:
                print(f"   ❌ Docker命令执行失败: {result.stderr}")
                return False
        except FileNotFoundError:
            print("   ⚠️  Docker命令不存在，无法检查容器状态")
            return False
        except Exception as e:
            print(f"   ⚠️  检查Docker容器时出错: {e}")
            return False

    else:
        print(f"   ⚠️  未知的代理地址格式: {proxy_url}")
        return False


def check_backend_service():
    """检查后端服务是否运行"""
    print("🔍 检查后端服务状态...")

    # 检查端口8000是否在监听
    try:
        result = subprocess.run(
            ["lsof", "-i", ":8000"], capture_output=True, text=True, timeout=5
        )
        if result.returncode == 0 and result.stdout.strip():
            print("   ✅ 后端服务端口8000正在监听")
            return True
        else:
            print("   ❌ 后端服务端口8000没有在监听")
            print("   💡 请启动后端服务")
            return False
    except Exception as e:
        print(f"   ⚠️  无法检查后端服务状态: {e}")
        return False


def main():
    """主检查函数"""
    print("🔍 AI分析问题诊断")
    print("=" * 40)

    # 加载环境文件
    env_loaded = load_env_file()
    if not env_loaded:
        return False

    # 检查AI配置
    config_ok = check_ai_config()

    # 检查服务状态
    litellm_ok = check_litellm_service()
    backend_ok = check_backend_service()

    print("=" * 40)
    print("📋 诊断结果:")
    print(f"   - 环境配置: {'✅ 正常' if config_ok else '❌ 有问题'}")
    print(f"   - LiteLLM服务: {'✅ 运行中' if litellm_ok else '❌ 未运行'}")
    print(f"   - 后端服务: {'✅ 运行中' if backend_ok else '❌ 未运行'}")

    if config_ok and litellm_ok and backend_ok:
        print("\n🎉 基础环境检查通过！")
        print("💡 如果AI分析仍然不出现，建议：")
        print("   1. 重启后端服务以加载新的环境变量")
        print("   2. 尝试手动触发AI重新生成")
        print("   3. 查看后端日志了解详细错误")
    else:
        print("\n❌ 发现环境问题，请按以下顺序修复：")
        if not config_ok:
            print("   1. 检查并修复环境变量配置")
        if not litellm_ok:
            print("   2. 启动LiteLLM服务")
        if not backend_ok:
            print("   3. 启动后端服务")

    print()
    return config_ok and litellm_ok and backend_ok


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
