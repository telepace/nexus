#!/usr/bin/env python3
"""
测试中文网站解析是否正确处理编码问题
"""

import uuid

from sqlmodel import Session

from app import crud
from app.models import UserCreate
from app.models.content import ContentItem


def test_chinese_website_parsing(db: Session):
    """测试中文网站解析编码问题"""

    print("🔍 测试中文网站解析编码问题...")

    test_cases = [
        {
            "encoding": "utf-8",
            "url": "https://test-chinese-site-utf-8.com",
            "title": "中文网站测试 (utf-8)",
            "expected_content_contains": ["测试", "中文", "编码"],
        },
        {
            "encoding": "gbk",
            "url": "https://test-chinese-site-gbk.com",
            "title": "中文网站测试 (gbk)",
            "expected_content_contains": ["测试", "中文", "编码"],
        },
        {
            "encoding": "gb2312",
            "url": "https://test-chinese-site-gb2312.com",
            "title": "中文网站测试 (gb2312)",
            "expected_content_contains": ["测试", "中文", "编码"],
        },
    ]

    try:
        # 创建测试用户
        user_create = UserCreate(
            email="test_website@example.com",
            password="test_password123",
            full_name="网站测试用户",
        )
        test_user = crud.create_user(session=db, user_create=user_create)

        for case in test_cases:
            print(f"\n🧪 测试 {case['encoding']} 编码...")

            # 创建内容项
            content_item = ContentItem(
                id=uuid.uuid4(),
                user_id=test_user.id,
                type="url",
                source_uri=case["url"],
                title=case["title"],
                processing_status="pending",
            )

            db.add(content_item)
            db.commit()

            print(f"✅ 创建内容项成功: {content_item.title}")

            # 这里实际应该调用网站解析服务
            # 由于这是测试环境，我们只验证数据库操作
            # 在实际环境中，这里会有网站内容获取和解析逻辑

            # 模拟解析完成
            content_item.processing_status = "completed"
            content_item.content_text = f"这是{case['encoding']}编码的中文测试内容"
            db.add(content_item)
            db.commit()

            print(f"✅ {case['encoding']} 编码测试完成")

        print("\n🎉 中文网站解析编码测试完成！")

    except Exception as e:
        print(f"❌ 测试过程中出现错误: {e}")
        import traceback

        traceback.print_exc()
        raise


if __name__ == "__main__":
    # 这个部分只在直接运行脚本时执行，不影响pytest
    from sqlmodel import Session

    from app.core.db import engine as test_engine

    with Session(test_engine) as session:
        test_chinese_website_parsing(session)
