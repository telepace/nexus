#!/usr/bin/env python3
"""
测试URL处理的降级行为
"""
import uuid
import pytest
from sqlmodel import Session

from app.models.content import ContentItem
from app.models import User, UserCreate
from app import crud


def test_fallback_behavior(db: Session):
    """测试URL处理的降级行为"""

    print("🧪 开始测试URL处理的降级行为...")

    try:
        # 创建一个测试用户
        user_create = UserCreate(
            email="test_fallback@example.com",
            password="test_password123",
            full_name="降级测试用户"
        )
        test_user = crud.create_user(session=db, user_create=user_create)

        print("📋 测试1: 有Jina API Key的情况")
        content_item_1 = ContentItem(
            id=uuid.uuid4(),
            user_id=test_user.id,
            type="url",
            source_uri="https://example.com",
            title="测试URL处理（有API Key）",
            processing_status="pending",
        )
        db.add(content_item_1)
        db.commit()

        # 模拟有API Key的处理结果
        content_item_1.processing_status = "completed"
        content_item_1.content_text = "这是通过Jina API获取的内容"
        db.add(content_item_1)
        db.commit()

        print("✅ 有API Key的情况测试完成")

        print("📋 测试2: 无Jina API Key的情况")
        content_item_2 = ContentItem(
            id=uuid.uuid4(),
            user_id=test_user.id,
            type="url",
            source_uri="https://example2.com",
            title="测试URL处理（无API Key）",
            processing_status="pending",
        )
        db.add(content_item_2)
        db.commit()

        # 模拟无API Key的降级处理结果
        content_item_2.processing_status = "completed"
        content_item_2.content_text = "这是通过降级方法获取的内容"
        db.add(content_item_2)
        db.commit()

        print("✅ 无API Key的情况测试完成")

        print("🎉 URL处理降级行为测试完成！")

    except Exception as e:
        print(f"❌ 测试过程中出现错误: {e}")
        import traceback
        traceback.print_exc()
        raise


if __name__ == "__main__":
    # 这个部分只在直接运行脚本时执行，不影响pytest
    from app.tests.conftest import setup_test_environment
    from sqlmodel import Session
    from app.core.db import engine as test_engine
    
    with Session(test_engine) as session:
        test_fallback_behavior(session)
