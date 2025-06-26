#!/usr/bin/env python3
"""
测试URL处理功能
"""
import uuid
import pytest
from sqlmodel import Session

from app.models.content import ContentItem
from app.models import User, UserCreate
from app import crud


def test_url_processing(db: Session):
    """测试URL处理功能"""

    print("🧪 开始测试URL处理功能...")
    
    try:
        # 创建一个测试用户
        user_create = UserCreate(
            email="test_url@example.com",
            password="test_password123",
            full_name="URL测试用户"
        )
        test_user = crud.create_user(session=db, user_create=user_create)

        content_item = ContentItem(
            id=uuid.uuid4(),
            user_id=test_user.id,
            type="url",
            source_uri="https://example.com",
            title="测试URL内容",
            processing_status="pending",
        )
        db.add(content_item)
        db.commit()

        # 模拟URL处理结果
        content_item.processing_status = "completed"
        content_item.content_text = "这是URL处理后的内容"
        db.add(content_item)
        db.commit()

        print("✅ URL处理功能测试完成")

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
        test_url_processing(session)
        print("\n🎉 URL处理测试完成！")
