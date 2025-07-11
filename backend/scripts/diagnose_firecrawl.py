#!/usr/bin/env python3
"""
Firecrawl 连接诊断脚本
用于测试 Firecrawl API 连接、代理配置和网络问题
"""

import os
import sys
from pathlib import Path

# 添加项目根目录到Python路径
sys.path.insert(0, str(Path(__file__).parent.parent))

import requests

from app.core.config import settings


def check_environment():
    """检查环境配置"""
    print("🔍 检查环境配置...")
    print("=" * 50)

    # 检查 Firecrawl API Key
    api_key = getattr(settings, "FIRECRAWL_API_KEY", None)
    print(f"📝 FIRECRAWL_API_KEY: {'已配置' if api_key else '❌ 未配置'}")

    # 检查代理配置
    proxy_vars = [
        "http_proxy", "https_proxy", "HTTP_PROXY", "HTTPS_PROXY",
        "all_proxy", "ALL_PROXY"
    ]

    print("\n🌐 代理环境变量:")
    proxy_found = False
    for var in proxy_vars:
        value = os.getenv(var)
        if value:
            print(f"   ✅ {var}: {value}")
            proxy_found = True
        else:
            print(f"   ❌ {var}: 未设置")

    if not proxy_found:
        print("   ⚠️  没有检测到代理配置")

    return bool(api_key)


def test_basic_connectivity():
    """测试基础网络连接"""
    print("\n🌐 测试基础网络连接...")
    print("=" * 50)

    test_urls = [
        "https://api.firecrawl.dev",
        "https://httpbin.org/get",  # 备用测试URL
        "https://www.google.com"
    ]

    for url in test_urls:
        try:
            print(f"📡 测试连接: {url}")
            response = requests.get(url, timeout=10)
            print(f"   ✅ 状态码: {response.status_code}")
            if response.status_code == 200:
                print("   ✅ 连接成功")
                return True
        except requests.exceptions.ConnectionError as e:
            print(f"   ❌ 连接错误: {e}")
        except requests.exceptions.Timeout as e:
            print(f"   ❌ 超时: {e}")
        except Exception as e:
            print(f"   ❌ 其他错误: {e}")

    print("❌ 所有网络连接测试都失败了")
    return False


def test_firecrawl_with_proxies():
    """使用不同代理配置测试 Firecrawl"""
    print("\n🔥 测试 Firecrawl API 连接...")
    print("=" * 50)

    api_key = getattr(settings, "FIRECRAWL_API_KEY", None)
    if not api_key:
        print("❌ FIRECRAWL_API_KEY 未配置，跳过测试")
        return False

    # 测试URL
    test_url = "https://example.com"

    # 不同的代理配置测试
    proxy_configs = [
        {"name": "无代理", "proxies": {}},
        {"name": "系统代理", "proxies": None},  # 使用环境变量
    ]

    # 如果有代理环境变量，添加特定代理测试
    http_proxy = os.getenv("http_proxy") or os.getenv("HTTP_PROXY")
    https_proxy = os.getenv("https_proxy") or os.getenv("HTTPS_PROXY")
    all_proxy = os.getenv("all_proxy") or os.getenv("ALL_PROXY")

    if http_proxy or https_proxy:
        proxy_configs.append({
            "name": "环境变量代理",
            "proxies": {
                "http": http_proxy,
                "https": https_proxy
            }
        })

    if all_proxy and "socks" not in all_proxy.lower():
        proxy_configs.append({
            "name": "全局代理",
            "proxies": {
                "http": all_proxy,
                "https": all_proxy
            }
        })

    for config in proxy_configs:
        print(f"\n🧪 测试配置: {config['name']}")
        try:
            # 使用 firecrawl-py 库测试
            from firecrawl import FirecrawlApp

            # 临时设置代理环境变量
            original_env = {}
            if config['proxies'] and config['proxies'] != {}:
                for key, value in config['proxies'].items():
                    if value:
                        var_name = f"{key}_proxy"
                        original_env[var_name] = os.environ.get(var_name)
                        os.environ[var_name] = value

            app = FirecrawlApp(api_key=api_key)

            # 配置参数
            params = {
                "formats": ["markdown"],
                "onlyMainContent": True,
                "waitFor": 0,
            }

            print(f"   📡 尝试抓取: {test_url}")
            response = app.scrape_url(url=test_url, params=params)

            if response and isinstance(response, dict):
                print("   ✅ Firecrawl API 调用成功!")

                # 检查返回内容
                if "markdown" in response:
                    content_length = len(response["markdown"])
                    print(f"   📄 返回内容长度: {content_length} 字符")
                else:
                    print("   ⚠️  响应中没有 markdown 内容")

                return True
            else:
                print("   ❌ Firecrawl API 返回无效响应")

        except ImportError:
            print("   ❌ firecrawl-py 库未安装，请运行: pip install firecrawl-py")
        except Exception as e:
            error_str = str(e)
            print(f"   ❌ 错误: {error_str}")

            # 分析错误类型
            if "connection reset" in error_str.lower():
                print("   💡 这是连接重置错误，通常由以下原因引起:")
                print("      - 网络代理配置问题")
                print("      - 防火墙阻拦")
                print("      - DNS 解析问题")
                print("      - Firecrawl 服务暂时不可用")
            elif "timeout" in error_str.lower():
                print("   💡 这是超时错误，可能的原因:")
                print("      - 网络连接慢")
                print("      - 代理服务器响应慢")
                print("      - Firecrawl 服务负载过高")
            elif "proxy" in error_str.lower():
                print("   💡 这是代理相关错误:")
                print("      - 代理服务器配置错误")
                print("      - 代理认证失败")
                print("      - 代理服务器不可用")
        finally:
            # 恢复原始环境变量
            for var_name, original_value in original_env.items():
                if original_value is not None:
                    os.environ[var_name] = original_value
                elif var_name in os.environ:
                    del os.environ[var_name]

    return False


def provide_solutions():
    """提供解决方案建议"""
    print("\n💡 解决方案建议:")
    print("=" * 50)

    solutions = [
        "1. 检查网络代理配置:",
        "   export http_proxy=http://127.0.0.1:7890",
        "   export https_proxy=http://127.0.0.1:7890",
        "",
        "2. 临时禁用代理测试:",
        "   unset http_proxy https_proxy all_proxy",
        "",
        "3. 验证 Firecrawl API Key:",
        "   curl -X POST https://api.firecrawl.dev/v0/scrape \\",
        "     -H 'Content-Type: application/json' \\",
        "     -H 'Authorization: Bearer YOUR_API_KEY' \\",
        "     -d '{\"url\": \"https://example.com\"}'",
        "",
        "4. 切换到备用处理器:",
        "   在 .env 文件中设置: CONTENT_PROCESSOR=readability",
        "",
        "5. 启用处理器回退机制:",
        "   CONTENT_PROCESSOR_FALLBACK_ON_ERROR=true",
        "",
        "6. 重启服务:",
        "   docker compose restart backend"
    ]

    for solution in solutions:
        print(solution)


def main():
    """主函数"""
    print("🚀 Firecrawl 连接诊断工具")
    print("=" * 50)

    # 1. 检查环境配置
    config_ok = check_environment()

    # 2. 测试基础网络连接
    network_ok = test_basic_connectivity()

    # 3. 测试 Firecrawl API
    if config_ok:
        firecrawl_ok = test_firecrawl_with_proxies()
    else:
        firecrawl_ok = False
        print("\n⚠️  跳过 Firecrawl 测试，因为 API Key 未配置")

    # 4. 提供解决方案
    if not network_ok or not firecrawl_ok:
        provide_solutions()

    # 5. 总结
    print("\n📊 诊断结果总结:")
    print("=" * 50)
    print(f"✅ 环境配置: {'正常' if config_ok else '❌ 需要配置'}")
    print(f"🌐 网络连接: {'正常' if network_ok else '❌ 有问题'}")
    print(f"🔥 Firecrawl API: {'正常' if firecrawl_ok else '❌ 有问题'}")

    if config_ok and network_ok and firecrawl_ok:
        print("\n🎉 所有检查都通过! Firecrawl 应该可以正常工作了。")
    else:
        print("\n⚠️  发现问题，请根据上面的建议进行修复。")

    return 0 if (config_ok and network_ok and firecrawl_ok) else 1


if __name__ == "__main__":
    sys.exit(main())
