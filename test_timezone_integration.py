#!/usr/bin/env python3
"""
时区集成测试脚本
验证 prompts API 的时区处理功能
"""

import requests
import json
from datetime import datetime

# 配置
API_BASE = "http://localhost:8000/api/v1"
TEST_TIMEZONE = "Asia/Shanghai"

def test_timezone_headers():
    """测试时区头处理"""
    print("🔍 测试时区头处理...")
    
    headers = {
        "X-User-Timezone": TEST_TIMEZONE,
        "Content-Type": "application/json"
    }
    
    try:
        # 尝试访问 prompts 接口
        response = requests.get(f"{API_BASE}/prompts/", headers=headers, timeout=10)
        print(f"📊 响应状态码: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ 成功获取数据，共 {len(data)} 个提示词")
            
            # 检查第一个提示词的时间格式
            if data and len(data) > 0:
                first_prompt = data[0]
                print(f"📅 第一个提示词的时间字段:")
                
                if 'created_at' in first_prompt:
                    created_at = first_prompt['created_at']
                    print(f"   created_at: {created_at}")
                    print(f"   类型: {type(created_at)}")
                    
                    # 检查是否是时区感知的格式
                    if isinstance(created_at, dict):
                        print("✅ 时间字段已转换为时区感知格式")
                        print(f"   UTC: {created_at.get('utc')}")
                        print(f"   本地时间: {created_at.get('local')}")
                        print(f"   时区: {created_at.get('timezone')}")
                    else:
                        print("❌ 时间字段仍为原始格式")
                
        else:
            print(f"❌ 请求失败: {response.text}")
            
    except requests.exceptions.RequestException as e:
        print(f"❌ 网络请求错误: {e}")
    except Exception as e:
        print(f"❌ 其他错误: {e}")

def test_without_timezone_header():
    """测试没有时区头的情况"""
    print("\n🔍 测试没有时区头的情况...")
    
    headers = {
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.get(f"{API_BASE}/prompts/", headers=headers, timeout=10)
        print(f"📊 响应状态码: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ 成功获取数据，共 {len(data)} 个提示词")
            
            # 检查时间格式
            if data and len(data) > 0:
                first_prompt = data[0]
                if 'created_at' in first_prompt:
                    created_at = first_prompt['created_at']
                    print(f"📅 created_at: {created_at}")
                    print(f"   类型: {type(created_at)}")
        else:
            print(f"❌ 请求失败: {response.text}")
            
    except Exception as e:
        print(f"❌ 错误: {e}")

if __name__ == "__main__":
    print("🚀 开始时区集成测试...")
    print(f"🎯 目标API: {API_BASE}")
    print(f"🌍 测试时区: {TEST_TIMEZONE}")
    print("-" * 50)
    
    # 测试有时区头的情况
    test_timezone_headers()
    
    # 测试没有时区头的情况
    test_without_timezone_header()
    
    print("-" * 50)
    print("🏁 测试完成！") 