#!/usr/bin/env python3
"""
测试URL处理和R2存储功能的脚本
"""

import time
import uuid
from io import BytesIO

from sqlmodel import Session, create_engine

from app.core.config import settings
from app.models.content import ContentItem
from app.utils.content_processors import ContentProcessorFactory
from app.utils.storage import get_storage_service


def test_url_processing():
    """测试URL处理功能"""
    print("🧪 开始测试URL处理功能...")

    # 创建数据库连接
    engine = create_engine(str(settings.SQLALCHEMY_DATABASE_URI))

    with Session(engine) as session:
        # 创建测试内容项
        test_url = "https://example.com"
        content_item = ContentItem(
            id=uuid.uuid4(),
            user_id=uuid.uuid4(),
            type="url",
            source_uri=test_url,
            title="测试URL内容",
            processing_status="pending"
        )

        session.add(content_item)
        session.commit()
        session.refresh(content_item)

        print(f"✅ 创建了测试内容项: {content_item.id}")

        # 获取处理器并处理内容
        processor = ContentProcessorFactory.get_processor("url")
        print(f"✅ 获取到处理器: {type(processor).__name__}")

        # 处理内容
        try:
            result = processor.process_content(content_item, session)

            if result.success:
                print("✅ URL处理成功!")
                print(f"📝 生成的Markdown内容长度: {len(result.markdown_content) if result.markdown_content else 0}")
                print(f"📊 元数据: {result.metadata}")
                print(f"📁 创建的资产: {result.assets_created}")

                # 检查R2存储 - 添加延迟和重试
                if result.assets_created:
                    storage_service = get_storage_service()
                    for asset_path in result.assets_created:
                        print(f"🔍 检查文件存在性: {asset_path}")

                        # 立即检查
                        exists = storage_service.file_exists(asset_path)
                        print(f"📦 立即检查结果: {'✅ 存在' if exists else '❌ 不存在'}")

                        # 等待一段时间后再检查（R2可能有延迟）
                        print("⏳ 等待3秒后再次检查...")
                        time.sleep(3)
                        exists_after_delay = storage_service.file_exists(asset_path)
                        print(f"📦 延迟检查结果: {'✅ 存在' if exists_after_delay else '❌ 不存在'}")

                        # 尝试获取文件URL
                        file_url = storage_service.get_file_url(asset_path)
                        print(f"🔗 文件URL: {file_url}")

                        # 尝试直接访问URL（如果可能）
                        try:
                            import requests
                            response = requests.head(file_url, timeout=10)
                            print(f"🌐 HTTP检查状态码: {response.status_code}")
                        except Exception as e:
                            print(f"🌐 HTTP检查失败: {str(e)}")

                # 检查数据库中的内容项状态
                session.refresh(content_item)
                print(f"📋 处理状态: {content_item.processing_status}")
                print(f"📄 内容文本长度: {len(content_item.content_text) if content_item.content_text else 0}")

                # 检查ContentAsset记录
                from sqlmodel import select

                from app.models.content import ContentAsset
                assets = session.exec(select(ContentAsset).where(ContentAsset.content_item_id == content_item.id)).all()
                print(f"📁 数据库中的ContentAsset记录数: {len(assets)}")
                for asset in assets:
                    print(f"   - 类型: {asset.type}, 路径: {asset.file_path}, 大小: {asset.size_bytes}")

            else:
                print(f"❌ URL处理失败: {result.error_message}")

        except Exception as e:
            print(f"❌ 处理过程中出现异常: {str(e)}")
            import traceback
            traceback.print_exc()


def test_storage_service():
    """测试存储服务"""
    print("\n🧪 开始测试存储服务...")

    try:
        storage_service = get_storage_service()
        print(f"✅ 获取到存储服务: {type(storage_service).__name__}")
        print(f"📦 存储桶: {storage_service.bucket}")
        print(f"🔗 公共URL: {storage_service.public_url}")

        # 测试上传文件
        test_content = "# 测试Markdown内容\n\n这是一个测试文件。"
        test_path = "test/markdown/test.md"

        # 创建BytesIO对象并保持引用
        test_file_data = BytesIO(test_content.encode('utf-8'))
        storage_service.upload_file(
            file_data=test_file_data,
            file_path=test_path
        )
        print(f"✅ 成功上传测试文件到: {test_path}")

        # 检查文件是否存在
        exists = storage_service.file_exists(test_path)
        print(f"📦 文件存在检查: {'✅ 存在' if exists else '❌ 不存在'}")

        # 获取文件URL
        file_url = storage_service.get_file_url(test_path)
        print(f"🔗 文件URL: {file_url}")

        # 测试HTTP访问
        try:
            import requests
            response = requests.get(file_url, timeout=10)
            print(f"🌐 HTTP访问状态码: {response.status_code}")
            if response.status_code == 200:
                print(f"📄 文件内容: {response.text[:100]}...")
        except Exception as e:
            print(f"🌐 HTTP访问失败: {str(e)}")

    except Exception as e:
        print(f"❌ 存储服务测试失败: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    print("🚀 开始内容处理和存储测试...")

    # 测试存储服务
    test_storage_service()

    # 测试URL处理
    test_url_processing()

    print("\n🎉 测试完成!")
