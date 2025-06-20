#!/usr/bin/env python3
"""
验证 OpenRouter Gemini 2.5 Flash Preview 配置
"""

import os
import sys
import yaml
from pathlib import Path

def check_litellm_config():
    """检查 LiteLLM 配置文件"""
    print("🔍 检查 LiteLLM 配置文件...")
    
    config_path = Path("litellm/config.yaml")
    if not config_path.exists():
        print("   ❌ LiteLLM 配置文件不存在")
        return False
    
    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            config = yaml.safe_load(f)
        
        # 检查默认模型
        completion_model = config.get('general_settings', {}).get('completion_model')
        if completion_model == 'or-gemini-2.5-flash-preview-05-20':
            print("   ✅ 默认模型设置正确: or-gemini-2.5-flash-preview-05-20")
        else:
            print(f"   ⚠️  默认模型设置为: {completion_model}")
        
        # 检查 OpenRouter Gemini 模型配置
        model_list = config.get('model_list', [])
        gemini_models = [m for m in model_list if 'or-gemini' in m.get('model_name', '')]
        
        if gemini_models:
            print(f"   ✅ 找到 {len(gemini_models)} 个 OpenRouter Gemini 模型:")
            for model in gemini_models:
                model_name = model.get('model_name')
                litellm_model = model.get('litellm_params', {}).get('model')
                print(f"      - {model_name} → {litellm_model}")
        else:
            print("   ❌ 未找到 OpenRouter Gemini 模型配置")
            return False
        
        # 检查环境变量配置
        env_vars = config.get('general_settings', {}).get('environment_variables', {})
        if 'OR_API_KEY' in env_vars:
            print("   ✅ OR_API_KEY 环境变量已配置")
        else:
            print("   ❌ OR_API_KEY 环境变量未配置")
            return False
        
        return True
        
    except Exception as e:
        print(f"   ❌ 读取配置文件失败: {e}")
        return False

def check_backend_config():
    """检查后端配置"""
    print("\n🔍 检查后端配置...")
    
    config_path = Path("backend/app/core/config.py")
    if not config_path.exists():
        print("   ❌ 后端配置文件不存在")
        return False
    
    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        if 'DEFAULT_LLM_MODEL: str = "or-gemini-2.5-flash-preview-05-20"' in content:
            print("   ✅ 后端默认模型配置正确")
            return True
        else:
            print("   ⚠️  后端默认模型配置可能不正确")
            # 尝试找到 DEFAULT_LLM_MODEL 的设置
            lines = content.split('\n')
            for line in lines:
                if 'DEFAULT_LLM_MODEL' in line and '=' in line:
                    print(f"      当前设置: {line.strip()}")
            return False
            
    except Exception as e:
        print(f"   ❌ 读取后端配置失败: {e}")
        return False

def check_environment_variables():
    """检查环境变量"""
    print("\n🔍 检查环境变量...")
    
    # 检查 .env.example 文件
    env_example_path = Path(".env.example")
    if env_example_path.exists():
        with open(env_example_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        if 'OR_API_KEY=' in content:
            print("   ✅ .env.example 包含 OR_API_KEY 配置")
        else:
            print("   ⚠️  .env.example 缺少 OR_API_KEY 配置")
    
    # 检查实际环境变量
    or_api_key = os.getenv('OR_API_KEY')
    if or_api_key:
        if or_api_key.startswith('sk-or-'):
            print("   ✅ OR_API_KEY 环境变量已设置且格式正确")
        else:
            print("   ⚠️  OR_API_KEY 环境变量格式可能不正确（应以 sk-or- 开头）")
    else:
        print("   ⚠️  OR_API_KEY 环境变量未设置")
        print("      请在 .env 文件中添加: OR_API_KEY=\"sk-or-v1-your-api-key\"")
    
    return True

def check_hot_update_api():
    """检查热更新API端点"""
    print("\n🔍 检查热更新API端点...")
    
    # 检查模型管理路由文件
    routes_path = Path("backend/app/api/routes/model_management.py")
    if routes_path.exists():
        print("   ✅ 模型管理路由文件存在")
        
        # 检查管理脚本
        script_path = Path("scripts/manage_models.py")
        if script_path.exists():
            print("   ✅ 模型管理脚本存在")
        else:
            print("   ❌ 模型管理脚本不存在")
            return False
    else:
        print("   ❌ 模型管理路由文件不存在")
        return False
    
    return True

def main():
    """主函数"""
    print("🚀 开始验证 OpenRouter Gemini 2.5 Flash Preview 配置...\n")
    
    checks = [
        check_litellm_config,
        check_backend_config,
        check_environment_variables,
        check_hot_update_api,
    ]
    
    results = []
    for check in checks:
        try:
            result = check()
            results.append(result)
        except Exception as e:
            print(f"   ❌ 检查过程中出错: {e}")
            results.append(False)
    
    print("\n" + "="*50)
    print("📋 验证结果总结:")
    print("="*50)
    
    if all(results):
        print("🎉 所有配置验证通过！")
        print("\n✨ OpenRouter Gemini 2.5 Flash Preview 已正确配置")
        print("   可以开始使用热更新功能了！")
        
        print("\n🔧 下一步:")
        print("   1. 确保 OR_API_KEY 环境变量已正确设置")
        print("   2. 启动服务: docker compose up -d")
        print("   3. 测试热更新: python scripts/test_hot_update.py")
        
        return True
    else:
        print("❌ 部分配置需要调整")
        print("\n🔧 请检查上述标记为 ❌ 或 ⚠️ 的项目")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 