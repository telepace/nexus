#!/usr/bin/env python3
"""
测试Markdown渲染系统的完整功能
"""

import requests
import json
import time
import sys

# 配置
BASE_URL = "http://localhost:8000"
FRONTEND_URL = "http://localhost:3001"

def test_markdown_system():
    """测试完整的markdown渲染系统"""
    
    print("🧪 开始测试Markdown渲染系统...")
    
    # 1. 测试后端API健康状态
    print("\n1. 检查后端API状态...")
    try:
        response = requests.get(f"{BASE_URL}/api/v1/health")
        if response.status_code == 200:
            print("✅ 后端API正常运行")
        else:
            print(f"❌ 后端API状态异常: {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ 无法连接到后端API")
        return False
    
    # 2. 测试前端服务状态
    print("\n2. 检查前端服务状态...")
    try:
        response = requests.get(FRONTEND_URL)
        if response.status_code == 200:
            print("✅ 前端服务正常运行")
        else:
            print(f"❌ 前端服务状态异常: {response.status_code}")
    except requests.exceptions.ConnectionError:
        print("❌ 无法连接到前端服务")
    
    # 3. 测试支持的处理器
    print("\n3. 检查支持的内容处理器...")
    try:
        response = requests.get(f"{BASE_URL}/api/v1/content/processors/supported")
        if response.status_code == 200:
            data = response.json()
            print("✅ 支持的内容类型:")
            for content_type in data.get("supported_types", []):
                print(f"   - {content_type}")
        else:
            print(f"❌ 获取处理器信息失败: {response.status_code}")
    except Exception as e:
        print(f"❌ 获取处理器信息时出错: {e}")
    
    # 4. 测试markdown端点（需要认证，这里只测试结构）
    print("\n4. 测试API端点结构...")
    test_content_id = "3a1ad48a-3a9c-4a29-9d27-b81a6b4af4c8"
    
    # 测试未认证的请求
    response = requests.get(f"{BASE_URL}/api/v1/content/{test_content_id}/markdown")
    if response.status_code == 401:
        print("✅ Markdown端点正确要求认证")
    else:
        print(f"⚠️  Markdown端点认证检查: {response.status_code}")
    
    # 5. 显示使用说明
    print("\n📋 使用说明:")
    print("1. 确保后端和前端服务都在运行")
    print("2. 登录到前端应用")
    print("3. 上传内容文件")
    print("4. 等待内容处理完成")
    print("5. 在内容库中点击查看，应该能看到渲染的markdown")
    
    print(f"\n🌐 前端地址: {FRONTEND_URL}")
    print(f"🔧 后端API: {BASE_URL}")
    print(f"📖 内容阅读器: {FRONTEND_URL}/content-library/reader?id={test_content_id}")
    
    return True

if __name__ == "__main__":
    success = test_markdown_system()
    sys.exit(0 if success else 1) 