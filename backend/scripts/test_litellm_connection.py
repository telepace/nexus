#!/usr/bin/env python3
"""
LiteLLM 连接测试脚本
用于诊断和测试 LiteLLM 代理连接问题
"""

import asyncio
import sys
from pathlib import Path

# 添加项目根目录到Python路径
sys.path.insert(0, str(Path(__file__).parent.parent))

import httpx
from app.core.config import settings


async def test_litellm_connection():
    """测试 LiteLLM 代理连接"""
    print("🔍 测试 LiteLLM 代理连接...")
    print(f"📍 代理地址: {settings.LITELLM_PROXY_URL}")
    print(f"🤖 默认模型: {settings.DEFAULT_LLM_MODEL}")
    print(f"🔑 认证Key: {'已配置' if settings.LITELLM_MASTER_KEY else '未配置'}")
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # 构建测试请求
            request_data = {
                "model": settings.DEFAULT_LLM_MODEL,
                "messages": [
                    {"role": "system", "content": "你是一个AI助手。"},
                    {"role": "user", "content": "请回复'连接测试成功'"},
                ],
                "temperature": 0.3,
                "max_tokens": 100,
            }
            
            # 准备请求头
            headers = {"Content-Type": "application/json"}
            if settings.LITELLM_MASTER_KEY:
                headers["Authorization"] = f"Bearer {settings.LITELLM_MASTER_KEY}"
            
            # 发送请求
            base_url = str(settings.LITELLM_PROXY_URL).rstrip("/")
            url = f"{base_url}/v1/chat/completions"
            
            print(f"📡 发送请求到: {url}")
            
            response = await client.post(
                url,
                json=request_data,
                headers=headers,
                timeout=30.0,
            )
            
            if response.status_code == 200:
                response_data = response.json()
                if "choices" in response_data and response_data["choices"]:
                    content = response_data["choices"][0]["message"]["content"]
                    print(f"✅ 连接成功！AI回复: {content}")
                    return True
                else:
                    print(f"❌ 响应格式异常: {response_data}")
                    return False
            else:
                print(f"❌ HTTP错误 {response.status_code}: {response.text}")
                return False
                
    except httpx.ConnectError as e:
        print(f"❌ 连接错误: {e}")
        print("💡 可能的原因:")
        print("   - LiteLLM 代理服务未启动")
        print("   - 网络连接问题")
        print("   - 代理地址配置错误")
        return False
    except httpx.TimeoutException as e:
        print(f"❌ 请求超时: {e}")
        return False
    except Exception as e:
        print(f"❌ 其他错误: {e}")
        return False


async def test_basic_connectivity():
    """测试基础网络连接"""
    print("\n🌐 测试基础网络连接...")
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # 测试连接到代理URL（不包含具体端点）
            base_url = str(settings.LITELLM_PROXY_URL).rstrip("/")
            
            # 尝试GET根路径或健康检查端点
            test_endpoints = ["/health", "/", "/v1/models"]
            
            for endpoint in test_endpoints:
                try:
                    url = f"{base_url}{endpoint}"
                    print(f"📍 测试端点: {url}")
                    
                    response = await client.get(url, timeout=10.0)
                    print(f"   ✅ 状态码: {response.status_code}")
                    
                    if response.status_code < 500:
                        print(f"   📝 响应: {response.text[:200]}...")
                        return True
                        
                except Exception as e:
                    print(f"   ❌ 错误: {e}")
                    continue
            
            print("❌ 所有测试端点都无法访问")
            return False
            
    except Exception as e:
        print(f"❌ 网络测试失败: {e}")
        return False


def check_environment():
    """检查环境配置"""
    print("\n⚙️ 检查环境配置...")
    
    required_settings = [
        ("LITELLM_PROXY_URL", settings.LITELLM_PROXY_URL),
        ("DEFAULT_LLM_MODEL", settings.DEFAULT_LLM_MODEL),
        ("LITELLM_MASTER_KEY", "已配置" if settings.LITELLM_MASTER_KEY else "未配置"),
    ]
    
    all_configured = True
    for name, value in required_settings:
        status = "✅" if value else "❌"
        print(f"   {status} {name}: {value}")
        if not value:
            all_configured = False
    
    if not all_configured:
        print("\n💡 配置建议:")
        if not settings.LITELLM_PROXY_URL:
            print("   - 设置 LITELLM_PROXY_URL 环境变量")
        if not settings.DEFAULT_LLM_MODEL:
            print("   - 设置 DEFAULT_LLM_MODEL 环境变量")
        if not settings.LITELLM_MASTER_KEY:
            print("   - 设置 LITELLM_MASTER_KEY 环境变量（如果代理需要认证）")
    
    return all_configured


async def main():
    """主函数"""
    print("🚀 LiteLLM 连接诊断工具")
    print("=" * 50)
    
    # 1. 检查环境配置
    config_ok = check_environment()
    
    if not config_ok:
        print("\n❌ 环境配置不完整，请修复后重试")
        return
    
    # 2. 测试基础网络连接
    network_ok = await test_basic_connectivity()
    
    if not network_ok:
        print("\n❌ 基础网络连接失败")
        return
    
    # 3. 测试完整的 LiteLLM 连接
    llm_ok = await test_litellm_connection()
    
    if llm_ok:
        print("\n🎉 所有测试通过！LiteLLM 连接正常")
    else:
        print("\n❌ LiteLLM 连接测试失败")
        print("\n🔧 故障排除建议:")
        print("   1. 确认 LiteLLM 代理服务正在运行")
        print("   2. 检查防火墙和网络设置")
        print("   3. 验证模型名称和认证密钥")
        print("   4. 查看 LiteLLM 代理日志")


if __name__ == "__main__":
    asyncio.run(main()) 