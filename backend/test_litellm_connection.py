#!/usr/bin/env python3

import httpx
import asyncio
import json
from app.core.config import settings

async def test_litellm_connection():
    """测试与LiteLLM的连接"""
    print(f"Testing connection to LiteLLM at: {settings.LITELLM_PROXY_URL}")
    print(f"Using master key: {settings.LITELLM_MASTER_KEY}")
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # 测试健康检查
            print("\n1. Testing health endpoint...")
            health_url = f"{settings.LITELLM_PROXY_URL}/health"
            response = await client.get(health_url)
            print(f"Health check - Status: {response.status_code}")
            print(f"Health check - Response: {response.text[:200]}")
            
            # 测试非流式请求
            print("\n2. Testing non-streaming completion...")
            completion_url = f"{settings.LITELLM_PROXY_URL}/v1/chat/completions"
            headers = {"Content-Type": "application/json"}
            if settings.LITELLM_MASTER_KEY:
                headers["Authorization"] = f"Bearer {settings.LITELLM_MASTER_KEY}"
            
            payload = {
                "model": "gpt-3.5-turbo",
                "messages": [{"role": "user", "content": "Hello"}],
                "stream": False
            }
            
            response = await client.post(completion_url, json=payload, headers=headers)
            print(f"Non-streaming - Status: {response.status_code}")
            if response.status_code == 200:
                print("Non-streaming - Success!")
            else:
                print(f"Non-streaming - Error: {response.text}")
            
            # 测试流式请求
            print("\n3. Testing streaming completion...")
            payload["stream"] = True
            
            req = client.build_request("POST", completion_url, json=payload, headers=headers)
            response_stream = await client.send(req, stream=True)
            print(f"Streaming - Status: {response_stream.status_code}")
            
            if response_stream.status_code == 200:
                print("Streaming - Success! First few chunks:")
                chunk_count = 0
                async for chunk in response_stream.aiter_bytes():
                    if chunk and chunk_count < 3:
                        print(f"Chunk {chunk_count + 1}: {chunk.decode('utf-8', errors='ignore')[:100]}")
                        chunk_count += 1
                    if chunk_count >= 3:
                        break
            else:
                error_text = await response_stream.aread()
                print(f"Streaming - Error: {error_text.decode('utf-8', errors='ignore')}")
                
    except Exception as e:
        print(f"Connection error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_litellm_connection()) 