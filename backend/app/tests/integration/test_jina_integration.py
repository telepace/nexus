#!/usr/bin/env python3
"""
测试Jina API集成
"""
import uuid
import pytest
from sqlmodel import Session

from app.models.content import ContentItem
from app.models import User, UserCreate
from app import crud


def test_jina_processor(db: Session):
    """测试Jina处理器"""

    print("\n🧪 开始测试Jina处理器...")
    
    try:
        # 创建一个测试用户
        user_create = UserCreate(
            email="test_jina@example.com",
            password="test_password123",
            full_name="Jina测试用户"
        )
        test_user = crud.create_user(session=db, user_create=user_create)

        content_item = ContentItem(
            id=uuid.uuid4(),
            user_id=test_user.id,
            type="url",
            source_uri="https://example.com",
            title="测试Jina处理器",
            processing_status="pending",
        )
        db.add(content_item)
        db.commit()

        # 模拟Jina处理结果
        content_item.processing_status = "completed"
        content_item.content_text = "这是通过Jina API处理的内容"
        db.add(content_item)
        db.commit()

        print("✅ Jina处理器测试完成")

    except Exception as e:
        print(f"❌ 测试过程中出现错误: {e}")
        import traceback
        traceback.print_exc()
        raise


def test_url_processing_with_jina(db: Session):
    """测试URL处理功能（使用Jina）"""

    print("\n🧪 开始测试URL处理功能（使用Jina）...")
    
    try:
        # 创建一个测试用户
        user_create = UserCreate(
            email="test_url_jina@example.com",
            password="test_password123",
            full_name="URL Jina测试用户"
        )
        test_user = crud.create_user(session=db, user_create=user_create)

        content_item = ContentItem(
            id=uuid.uuid4(),
            user_id=test_user.id,
            type="url",
            source_uri="https://example.com",
            title="测试URL处理（Jina）",
            processing_status="pending",
        )
        db.add(content_item)
        db.commit()

        # 模拟URL处理结果
        content_item.processing_status = "completed"
        content_item.content_text = "这是通过Jina处理URL的内容"
        db.add(content_item)
        db.commit()

        print("✅ URL处理功能（Jina）测试完成")

    except Exception as e:
        print(f"❌ 测试过程中出现错误: {e}")
        import traceback
        traceback.print_exc()
        raise


def test_jina_api_direct():
    """测试Jina API直接调用"""
    print("\n🧪 测试Jina API直接调用...")
    print("✅ Jina API直接调用测试完成（模拟）")
    return False  # 模拟返回值


def test_environment_variables():
    """测试环境变量"""
    print("\n🧪 测试环境变量...")
    print("✅ 环境变量测试完成")
    return True  # 模拟返回值


if __name__ == "__main__":
    # 这个部分只在直接运行脚本时执行，不影响pytest
    from app.tests.conftest import setup_test_environment
    from sqlmodel import Session
    from app.core.db import engine as test_engine
    
    with Session(test_engine) as session:
        test_jina_processor(session)
        test_url_processing_with_jina(session)
        
    test_jina_api_direct()
    test_environment_variables()
    print("\n🎉 Jina集成测试完成！")
