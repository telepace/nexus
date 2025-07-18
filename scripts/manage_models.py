#!/usr/bin/env python3
"""
模型管理脚本 - 用于演示 LiteLLM 热更新功能
支持动态添加、删除、更新模型配置而无需重启服务
"""

import argparse
import asyncio
import json
import os
import sys
from typing import Dict, Any

import httpx
import pandas as pd


class ModelManager:
    """LiteLLM 模型管理器"""
    
    def __init__(self, litellm_url: str = "http://localhost:4000", master_key: str = None):
        self.litellm_url = litellm_url.rstrip("/")
        self.master_key = master_key
        self.headers = {"Content-Type": "application/json"}
        if master_key:
            self.headers["Authorization"] = f"Bearer {master_key}"
    
    async def _call_api(self, method: str, endpoint: str, data: Dict[str, Any] = None) -> Dict[str, Any]:
        """调用 LiteLLM API"""
        url = f"{self.litellm_url}/{endpoint.lstrip('/')}"
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            if method.upper() == "GET":
                response = await client.get(url, headers=self.headers)
            elif method.upper() == "POST":
                response = await client.post(url, json=data, headers=self.headers)
            elif method.upper() == "DELETE":
                response = await client.delete(url, headers=self.headers)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            response.raise_for_status()
            return response.json()
    
    async def list_models(self) -> Dict[str, Any]:
        """列出所有模型"""
        try:
            result = await self._call_api("GET", "/model/info")
            return result
        except Exception as e:
            print(f"❌ 获取模型列表失败: {e}")
            return {"data": []}
    
    async def add_model(self, model_name: str, model_params: Dict[str, Any]) -> bool:
        """添加模型"""
        try:
            config = {
                "model_name": model_name,
                "litellm_params": model_params
            }
            await self._call_api("POST", "/model/new", config)
            print(f"✅ 成功添加模型: {model_name}")
            return True
        except Exception as e:
            print(f"❌ 添加模型失败 {model_name}: {e}")
            return False
    
    async def delete_model(self, model_name: str) -> bool:
        """删除模型"""
        try:
            await self._call_api("POST", "/model/delete", {"id": model_name})
            print(f"✅ 成功删除模型: {model_name}")
            return True
        except Exception as e:
            print(f"❌ 删除模型失败 {model_name}: {e}")
            return False
    
    async def check_health(self) -> Dict[str, Any]:
        """检查服务健康状态"""
        try:
            result = await self._call_api("GET", "/health")
            return result
        except Exception as e:
            print(f"❌ 健康检查失败: {e}")
            return {}


async def cmd_list_models(manager: ModelManager):
    """列出所有模型命令"""
    print("🔍 获取当前模型列表...")
    result = await manager.list_models()
    
    if result.get("data"):
        print("\n📋 当前配置的模型:")
        models_df = pd.DataFrame(result["data"])
        if "model_name" in models_df.columns:
            for idx, model in enumerate(models_df.to_dict('records'), 1):
                print(f"{idx}. {model.get('model_name', 'Unknown')}")
                if 'litellm_params' in model:
                    params = model['litellm_params']
                    print(f"   Provider: {params.get('model', 'Unknown')}")
                    print(f"   API Key: {params.get('api_key', 'Unknown')}")
                print()
    else:
        print("📭 当前没有配置任何模型")


async def cmd_add_gemini_models(manager: ModelManager):
    """添加 Gemini 模型命令"""
    print("🚀 添加 Gemini 模型配置...")
    
    gemini_models = [
        {
            "name": "gemini-2.5-flash-05-20",
            "params": {
                "model": "gemini/gemini-2.5-flash-05-20",
                "api_key": "os.environ/GEMINI_API_KEY"
            }
        },
        {
            "name": "gemini-2.5-pro",
            "params": {
                "model": "gemini/gemini-2.5-pro",
                "api_key": "os.environ/GEMINI_API_KEY"
            }
        },
        {
            "name": "gemini-2.0-flash",
            "params": {
                "model": "gemini/gemini-2.0-flash",
                "api_key": "os.environ/GEMINI_API_KEY"
            }
        }
    ]
    
    added_count = 0
    for model in gemini_models:
        if await manager.add_model(model["name"], model["params"]):
            added_count += 1
    
    print(f"\n🎉 成功添加 {added_count}/{len(gemini_models)} 个 Gemini 模型")


async def cmd_delete_model(manager: ModelManager, model_name: str):
    """删除指定模型命令"""
    print(f"🗑️  删除模型: {model_name}")
    await manager.delete_model(model_name)


async def cmd_health_check(manager: ModelManager):
    """健康检查命令"""
    print("🏥 检查 LiteLLM 服务健康状态...")
    result = await manager.check_health()
    
    if result:
        print("✅ LiteLLM 服务运行正常")
        print(f"状态: {result}")
    else:
        print("❌ LiteLLM 服务可能未正常运行")


async def main():
    parser = argparse.ArgumentParser(description="LiteLLM 模型管理工具")
    parser.add_argument("--url", default="http://localhost:4000", help="LiteLLM 服务 URL")
    parser.add_argument("--master-key", help="LiteLLM Master Key")
    
    subparsers = parser.add_subparsers(dest="command", help="可用命令")
    
    # 列出模型
    subparsers.add_parser("list", help="列出所有配置的模型")
    
    # 添加 Gemini 模型
    subparsers.add_parser("add-gemini", help="添加最新的 Gemini 模型配置")
    
    # 删除模型
    delete_parser = subparsers.add_parser("delete", help="删除指定模型")
    delete_parser.add_argument("model_name", help="要删除的模型名称")
    
    # 健康检查
    subparsers.add_parser("health", help="检查 LiteLLM 服务健康状态")
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    # 从环境变量获取 master key（如果未提供）
    master_key = args.master_key or os.getenv("LITELLM_MASTER_KEY")
    
    manager = ModelManager(args.url, master_key)
    
    try:
        if args.command == "list":
            await cmd_list_models(manager)
        elif args.command == "add-gemini":
            await cmd_add_gemini_models(manager)
        elif args.command == "delete":
            await cmd_delete_model(manager, args.model_name)
        elif args.command == "health":
            await cmd_health_check(manager)
    except KeyboardInterrupt:
        print("\n👋 用户中断操作")
    except Exception as e:
        print(f"❌ 执行命令时出错: {e}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main()) 