#!/usr/bin/env python3
"""
测试头像上传功能的脚本
"""

import asyncio
import io

import httpx
from PIL import Image


async def test_avatar_upload():
    """测试头像上传功能"""

    # 创建一个测试图片
    test_image = Image.new("RGB", (100, 100), color="red")
    image_buffer = io.BytesIO()
    test_image.save(image_buffer, format="JPEG")
    image_buffer.seek(0)

    # 使用现有的JWT token（从get-admin-jwt.py获取）
    access_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NTA4NjQzNDIsInN1YiI6ImU4Y2NiZWVkLWY1ODgtNGI5YS05NWNhLTAwMDAwMDAwMDAwMCJ9.uAr-U-cljxqptwZm7p3AjTbq-urfCL5JJ6RJELUIh1I"

    async with httpx.AsyncClient() as client:
        # 上传头像
        print("正在上传头像...")
        files = {"avatar": ("test_avatar.jpg", image_buffer, "image/jpeg")}
        headers = {"Authorization": f"Bearer {access_token}"}

        upload_response = await client.post(
            "http://127.0.0.1:8000/api/v1/users/me/avatar", files=files, headers=headers
        )

        print(f"上传响应状态码: {upload_response.status_code}")

        if upload_response.status_code == 200:
            user_data = upload_response.json()
            print("头像上传成功！")
            print(f"用户头像URL: {user_data.get('avatar_url', 'N/A')}")
            print(f"用户ID: {user_data.get('id', 'N/A')}")
            print(f"用户邮箱: {user_data.get('email', 'N/A')}")
        else:
            print("头像上传失败:")
            print(f"响应内容: {upload_response.text}")


if __name__ == "__main__":
    asyncio.run(test_avatar_upload())
