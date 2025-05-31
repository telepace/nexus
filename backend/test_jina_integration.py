#!/usr/bin/env python3
"""
测试Jina API集成功能的脚本
"""

import uuid

from sqlmodel import Session, create_engine

from app.core.config import settings
from app.models.content import ContentItem
from app.utils.content_processors import (
    ContentProcessorFactory,
    JinaProcessor,
    ProcessingContext,
    ProcessingResult,
)
from app.utils.storage import get_storage_service


def test_jina_api_direct():
    """直接测试Jina API调用"""
    print("🧪 开始测试Jina API直接调用...")

    if not settings.JINA_API_KEY:
        print("❌ JINA_API_KEY 未配置，跳过测试")
        return False

    import requests

    try:
        # 测试URL
        test_url = "https://example.com"

        headers = {
            "Authorization": f"Bearer {settings.JINA_API_KEY}",
            "Content-Type": "application/json"
        }

        payload = {
            "url": test_url
        }

        print(f"📡 正在调用Jina API处理URL: {test_url}")
        response = requests.post(
            "https://r.jina.ai/",
            headers=headers,
            json=payload,
            timeout=60
        )

        if response.status_code == 200:
            markdown_content = response.text
            print("✅ Jina API调用成功!")
            print(f"📝 返回的Markdown内容长度: {len(markdown_content)}")
            print(f"📄 内容预览: {markdown_content[:200]}...")
            return True
        else:
            print(f"❌ Jina API调用失败: {response.status_code}")
            print(f"📄 错误信息: {response.text}")
            return False

    except Exception as e:
        print(f"❌ Jina API调用异常: {str(e)}")
        return False


def test_jina_processor():
    """测试Jina处理器"""
    print("\n🧪 开始测试Jina处理器...")

    if not settings.JINA_API_KEY:
        print("❌ JINA_API_KEY 未配置，跳过测试")
        return False

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
            title="测试Jina处理器",
            processing_status="pending"
        )

        session.add(content_item)
        session.commit()
        session.refresh(content_item)

        print(f"✅ 创建了测试内容项: {content_item.id}")

        # 创建Jina处理器
        jina_processor = JinaProcessor()

        # 检查是否可以处理URL
        can_handle = jina_processor.can_handle("url")
        print(f"🔍 Jina处理器可以处理URL: {can_handle}")

        if not can_handle:
            print("❌ Jina处理器无法处理URL类型")
            return False

        # 创建处理上下文
        storage_service = get_storage_service()
        context = ProcessingContext(
            content_item=content_item,
            session=session,
            user_id=content_item.user_id,
            storage_service=storage_service
        )

        # 初始化结果
        result = ProcessingResult(success=False)

        # 处理内容
        try:
            print("🔄 正在使用Jina处理器处理URL...")
            result = jina_processor.process(context, result)

            if result.success:
                print("✅ Jina处理器处理成功!")
                print(f"📝 生成的Markdown内容长度: {len(result.markdown_content) if result.markdown_content else 0}")
                print(f"📊 元数据: {result.metadata}")
                print(f"📁 创建的资产: {result.assets_created}")

                # 检查内容项状态
                session.refresh(content_item)
                print(f"📋 内容项标题: {content_item.title}")
                print(f"📄 内容文本长度: {len(content_item.content_text) if content_item.content_text else 0}")

                return True
            else:
                print(f"❌ Jina处理器处理失败: {result.error_message}")
                return False

        except Exception as e:
            print(f"❌ Jina处理器处理异常: {str(e)}")
            import traceback
            traceback.print_exc()
            return False


def test_url_processing_with_jina():
    """测试URL处理功能（使用Jina）"""
    print("\n🧪 开始测试URL处理功能（使用Jina）...")

    if not settings.JINA_API_KEY:
        print("❌ JINA_API_KEY 未配置，跳过测试")
        return False

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
            title="测试URL处理（Jina）",
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

                # 检查处理器类型
                if result.metadata and result.metadata.get("processor") == "jina":
                    print("✅ 确认使用了Jina处理器!")
                else:
                    print("⚠️  使用了其他处理器")

                # 检查R2存储
                if result.assets_created:
                    storage_service = get_storage_service()
                    for asset_path in result.assets_created:
                        print(f"🔍 检查文件存在性: {asset_path}")
                        exists = storage_service.file_exists(asset_path)
                        print(f"📦 文件存在: {'✅ 是' if exists else '❌ 否'}")

                # 检查数据库中的内容项状态
                session.refresh(content_item)
                print(f"📋 处理状态: {content_item.processing_status}")
                print(f"📄 内容文本长度: {len(content_item.content_text) if content_item.content_text else 0}")

                return True
            else:
                print(f"❌ URL处理失败: {result.error_message}")
                return False

        except Exception as e:
            print(f"❌ 处理过程中出现异常: {str(e)}")
            import traceback
            traceback.print_exc()
            return False


def test_environment_variables():
    """测试环境变量配置"""
    print("🧪 开始测试环境变量配置...")

    print(f"🔑 JINA_API_KEY 配置状态: {'✅ 已配置' if settings.JINA_API_KEY else '❌ 未配置'}")
    if settings.JINA_API_KEY:
        # 只显示前几个字符，保护隐私
        masked_key = settings.JINA_API_KEY[:10] + "..." if len(settings.JINA_API_KEY) > 10 else settings.JINA_API_KEY
        print(f"🔑 API Key (masked): {masked_key}")

    print(f"🗄️  数据库类型: {settings.DATABASE_TYPE}")
    print(f"📦 存储后端: {settings.STORAGE_BACKEND}")

    return bool(settings.JINA_API_KEY)


if __name__ == "__main__":
    print("🚀 开始Jina API集成测试...")

    # 测试环境变量
    env_ok = test_environment_variables()

    if not env_ok:
        print("\n❌ 环境变量配置不完整，请检查 .env 文件中的 JINA_API_KEY 配置")
        print("💡 提示: 请确保在 .env 文件中设置了有效的 JINA_API_KEY")
        exit(1)

    # 测试Jina API直接调用
    api_ok = test_jina_api_direct()

    if api_ok:
        # 测试Jina处理器
        processor_ok = test_jina_processor()

        if processor_ok:
            # 测试完整的URL处理流程
            pipeline_ok = test_url_processing_with_jina()

            if pipeline_ok:
                print("\n🎉 所有测试通过! Jina API集成成功!")
            else:
                print("\n❌ URL处理流程测试失败")
        else:
            print("\n❌ Jina处理器测试失败")
    else:
        print("\n❌ Jina API直接调用测试失败")

    print("\n📋 测试完成!")
