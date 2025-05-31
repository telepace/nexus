#!/usr/bin/env python3
"""
直接测试R2存储的脚本
"""


import boto3
from botocore.exceptions import ClientError

from app.core.config import settings


def test_r2_direct():
    """直接测试R2操作"""
    print("🧪 直接测试R2存储...")

    # 创建R2客户端
    endpoint_url = f"https://{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com"

    client = boto3.client(
        "s3",
        aws_access_key_id=settings.R2_ACCESS_KEY_ID,
        aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
        region_name="auto",
        endpoint_url=endpoint_url,
    )

    print("✅ R2客户端创建成功")
    print(f"📦 存储桶: {settings.R2_BUCKET}")
    print(f"🔗 端点: {endpoint_url}")

    # 测试上传文件
    test_content = "# 直接R2测试\n\n这是直接测试R2的文件。"
    test_key = "debug/test-direct.md"

    try:
        # 上传文件
        print(f"🔄 上传文件: {test_key}")
        client.put_object(
            Bucket=settings.R2_BUCKET,
            Key=test_key,
            Body=test_content.encode('utf-8'),
            ContentType="text/markdown"
        )
        print("✅ 文件上传成功")

        # 立即检查文件是否存在
        print("🔍 立即检查文件是否存在...")
        try:
            response = client.head_object(Bucket=settings.R2_BUCKET, Key=test_key)
            print(f"✅ 文件存在! 大小: {response.get('ContentLength', 'unknown')}")
            print(f"📊 响应: {response}")
        except ClientError as e:
            print(f"❌ 文件不存在: {e}")
            print(f"错误代码: {e.response['Error']['Code']}")
            print(f"错误消息: {e.response['Error']['Message']}")

        # 列出存储桶中的对象
        print("📋 列出存储桶中的对象...")
        try:
            response = client.list_objects_v2(Bucket=settings.R2_BUCKET, Prefix="debug/")
            if 'Contents' in response:
                print(f"✅ 找到 {len(response['Contents'])} 个对象:")
                for obj in response['Contents']:
                    print(f"   - {obj['Key']} (大小: {obj['Size']})")
            else:
                print("❌ 没有找到对象")
        except ClientError as e:
            print(f"❌ 列出对象失败: {e}")

        # 尝试下载文件
        print("📥 尝试下载文件...")
        try:
            response = client.get_object(Bucket=settings.R2_BUCKET, Key=test_key)
            content = response['Body'].read().decode('utf-8')
            print("✅ 文件下载成功!")
            print(f"📄 内容: {content[:100]}...")
        except ClientError as e:
            print(f"❌ 文件下载失败: {e}")

    except Exception as e:
        print(f"❌ R2操作失败: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_r2_direct()
