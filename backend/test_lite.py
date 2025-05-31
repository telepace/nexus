#!/usr/bin/env python3

import asyncio
import socket

import httpx


async def detailed_diagnosis():
    print("=== 详细的网络和httpx诊断 ===\n")

    # 1. 检查端口连通性
    print("1. 检查端口连通性...")
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(5)
        result = sock.connect_ex(('127.0.0.1', 4000))
        sock.close()

        if result == 0:
            print("✓ 端口4000可以连接")
        else:
            print("✗ 端口4000无法连接")
            return
    except Exception as e:
        print(f"✗ 端口检查异常: {e}")
        return

    # 2. 尝试不同的地址格式
    addresses = [
        'http://127.0.0.1:4000/health',
        'http://localhost:4000/health',
        'http://0.0.0.0:4000/health',
    ]

    print("\n2. 测试不同地址格式...")
    for addr in addresses:
        print(f"\n测试地址: {addr}")
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(addr)
                print(f"✓ 状态码: {response.status_code}")
                print(f"✓ 响应长度: {len(response.content)} bytes")
                if response.status_code == 200:
                    print(f"✓ 响应内容: {response.text[:200]}")
        except httpx.ConnectError as e:
            print(f"✗ 连接错误: {e}")
        except httpx.TimeoutException as e:
            print(f"✗ 超时错误: {e}")
        except httpx.HTTPStatusError as e:
            print(f"✗ HTTP状态错误: {e.response.status_code}")
        except Exception as e:
            print(f"✗ 其他错误: {type(e).__name__}: {e}")

    # 3. 测试原始HTTP请求
    print("\n3. 测试原始HTTP请求...")
    try:
        raw_request = """GET /health HTTP/1.1\r
Host: 127.0.0.1:4000\r
Connection: close\r
\r
"""

        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(10)
        sock.connect(('127.0.0.1', 4000))
        sock.send(raw_request.encode())

        response = sock.recv(4096).decode()
        sock.close()

        print("✓ 原始HTTP响应:")
        print(response[:500])

    except Exception as e:
        print(f"✗ 原始HTTP请求失败: {e}")

    # 4. 检查是否有代理设置
    print("\n4. 检查环境变量...")
    proxy_vars = ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy', 'ALL_PROXY']
    for var in proxy_vars:
        import os
        value = os.environ.get(var)
        if value:
            print(f"⚠️  发现代理设置: {var}={value}")
        else:
            print(f"✓ {var}: 未设置")

    # 5. 测试带详细日志的httpx请求
    print("\n5. 带详细日志的httpx请求...")
    try:
        import logging

        # 启用httpx详细日志
        logging.basicConfig(level=logging.DEBUG)
        httpx_logger = logging.getLogger("httpx")
        httpx_logger.setLevel(logging.DEBUG)

        async with httpx.AsyncClient(
            timeout=httpx.Timeout(10.0, connect=5.0),
            follow_redirects=True,
            verify=False
        ) as client:
            print("发送请求到 http://127.0.0.1:4000/health")
            response = await client.get('http://127.0.0.1:4000/health')
            print(f"✓ 最终响应: {response.status_code}")
            print(f"✓ 响应头: {dict(response.headers)}")
            print(f"✓ 响应体: {response.text}")

    except Exception as e:
        print(f"✗ 详细日志请求失败: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(detailed_diagnosis())
