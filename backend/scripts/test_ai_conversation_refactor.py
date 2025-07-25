#!/usr/bin/env python3
"""
测试AI对话重构的脚本

验证重构后的CRUD操作是否正常工作
"""

import sys
import uuid
from pathlib import Path

# 添加项目根目录到Python路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from sqlmodel import Session
from app.core.db_factory import engine
from app.crud.crud_ai_conversation import (
    create_ai_conversation_for_analysis,
    update_ai_conversation_response,
    get_ai_conversation,
)


def test_ai_conversation_crud():
    """测试AI对话CRUD操作"""
    print("🔧 开始测试AI对话CRUD操作...")
    
    with Session(engine) as session:
        # 查找现有的用户和内容用于测试
        from app.models import User, ContentItem
        from sqlmodel import select
        
        # 查找第一个用户
        user = session.exec(select(User).limit(1)).first()
        if not user:
            print("❌ 没有找到测试用户，请先创建用户")
            return False
            
        # 查找第一个内容项
        content_item = session.exec(select(ContentItem).where(ContentItem.user_id == user.id).limit(1)).first()
        if not content_item:
            print("❌ 没有找到测试内容，请先创建内容项")
            return False
        
        print(f"📝 使用用户: {user.email} (ID: {user.id})")
        print(f"📄 使用内容: {content_item.title} (ID: {content_item.id})")
        
        # 1. 测试创建AI对话
        print("\n1️⃣ 测试创建AI对话...")
        try:
            conversation = create_ai_conversation_for_analysis(
                session=session,
                user_id=user.id,
                content_item_id=content_item.id,
                content_item_title=content_item.title or "测试内容标题",
                analysis_instruction="请分析这个测试内容",
                content_to_analyze=content_item.content_text[:500] if content_item.content_text else "这是一个测试内容，用于验证AI对话功能。",
                model="gpt-4o-mini",
                temperature=0.7,
                max_tokens=1000,
            )
            print(f"✅ 成功创建AI对话: {conversation.id}")
            print(f"   标题: {conversation.title}")
            print(f"   类型: {conversation.conversation_type}")
            print(f"   模型: {conversation.ai_model_name}")
            
        except Exception as e:
            print(f"❌ 创建AI对话失败: {e}")
            return False
        
        # 2. 测试更新AI对话响应
        print("\n2️⃣ 测试更新AI对话响应...")
        try:
            test_response = '{"type": "summary", "content": "这是一个测试摘要"}\n{"type": "keypoint", "content": "测试要点1"}'
            
            success = update_ai_conversation_response(
                session=session,
                conversation_id=conversation.id,
                ai_response=test_response,
                status="completed"
            )
            
            if success:
                print("✅ 成功更新AI对话响应")
            else:
                print("❌ 更新AI对话响应失败")
                return False
                
        except Exception as e:
            print(f"❌ 更新AI对话响应异常: {e}")
            return False
        
        # 3. 测试获取AI对话
        print("\n3️⃣ 测试获取AI对话...")
        try:
            retrieved_conversation = get_ai_conversation(
                session=session,
                user_id=user.id,
                conversation_id=conversation.id
            )
            
            if retrieved_conversation:
                print("✅ 成功获取AI对话")
                print(f"   对话ID: {retrieved_conversation.id}")
                print(f"   消息数量: {len(retrieved_conversation.messages) if retrieved_conversation.messages else 0}")
                
                # 验证消息内容
                import json
                try:
                    messages = json.loads(retrieved_conversation.messages)
                    print(f"   解析消息数量: {len(messages)}")
                    for i, msg in enumerate(messages):
                        print(f"     消息{i+1}: {msg['role']} - {len(msg.get('content', ''))} 字符")
                except Exception as e:
                    print(f"   ⚠️ 消息解析失败: {e}")
                    
            else:
                print("❌ 获取AI对话失败")
                return False
                
        except Exception as e:
            print(f"❌ 获取AI对话异常: {e}")
            return False
        
        # 4. 测试错误处理
        print("\n4️⃣ 测试错误处理...")
        try:
            # 测试不存在的对话ID
            fake_id = uuid.uuid4()
            success = update_ai_conversation_response(
                session=session,
                conversation_id=fake_id,
                ai_response="测试响应",
                status="failed",
                error="测试错误"
            )
            
            if not success:
                print("✅ 错误处理正常 - 不存在的对话ID返回False")
            else:
                print("❌ 错误处理异常 - 应该返回False但返回了True")
                return False
                
        except Exception as e:
            print(f"❌ 错误处理测试异常: {e}")
            return False
        
        print("\n🎉 所有测试通过！AI对话CRUD重构成功！")
        return True


if __name__ == "__main__":
    print("🚀 AI对话重构测试")
    print("=" * 50)
    
    try:
        success = test_ai_conversation_crud()
        if success:
            print("\n✅ 重构验证成功！")
            sys.exit(0)
        else:
            print("\n❌ 重构验证失败！")
            sys.exit(1)
            
    except Exception as e:
        print(f"\n💥 测试脚本执行失败: {e}")
        sys.exit(1) 