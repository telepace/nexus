#!/usr/bin/env python3
"""
修复AI对话记录中的模型名称显示问题

该脚本解决的问题：
1. LiteLLM路由导致所有模型都显示为deepseek/deepseek-chat-v3-0324
2. 恢复正确的配置模型名称显示
3. 保留实际调用模型的记录
"""

import json
import sys
from pathlib import Path

# 添加项目根目录到Python路径
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlmodel import Session, select

from app.core.db_factory import engine
from app.models import AIConversation


def fix_conversation_model_names():
    """修复AI对话记录中的模型名称"""

    print("🔧 开始修复AI对话模型名称...")

    # 模型名称映射：实际返回名称 -> 配置名称
    model_mapping = {
        "deepseek/deepseek-chat-v3-0324": {
            "auto_analysis": "or-gemini-2.5-flash-preview-05-20",  # 自动分析默认使用Gemini
            "prompt_analysis": "or-gemini-2.5-flash-preview-05-20",  # 预设分析使用Gemini
            "user_chat": "or-gemini-2.5-flash-preview-05-20",  # 用户对话使用Gemini
        }
    }

    # 根据对话类型推断正确的配置模型
    def infer_configured_model(conversation: AIConversation) -> str:
        current_model = conversation.ai_model_name
        conversation_type = conversation.conversation_type

        # 如果是LiteLLM返回的实际模型名称，需要映射回配置名称
        if current_model in model_mapping:
            return model_mapping[current_model].get(conversation_type, current_model)

        # 如果已经是配置名称，保持不变
        return current_model

    updated_count = 0
    total_count = 0

    with Session(engine) as session:
        # 查询所有AI对话
        conversations = session.exec(select(AIConversation)).all()
        total_count = len(conversations)

        print(f"📊 找到 {total_count} 条AI对话记录")

        for conversation in conversations:
            original_model = conversation.ai_model_name
            inferred_model = infer_configured_model(conversation)

            if original_model != inferred_model:
                print(f"🔄 修复对话 {conversation.id}:")
                print(f"   类型: {conversation.conversation_type}")
                print(f"   原始: {original_model}")
                print(f"   修复: {inferred_model}")

                # 更新模型名称
                conversation.ai_model_name = inferred_model

                # 更新元信息，记录原始模型
                try:
                    meta_info = json.loads(conversation.meta_info or "{}")
                    meta_info.update(
                        {
                            "original_model_from_litellm": original_model,
                            "configured_model": inferred_model,
                            "fix_applied": True,
                            "fix_note": "修复LiteLLM路由导致的模型名称显示问题",
                        }
                    )
                    conversation.meta_info = json.dumps(meta_info)
                except (json.JSONDecodeError, AttributeError):
                    # 如果解析失败，创建新的meta_info
                    conversation.meta_info = json.dumps(
                        {
                            "original_model_from_litellm": original_model,
                            "configured_model": inferred_model,
                            "fix_applied": True,
                            "fix_note": "修复LiteLLM路由导致的模型名称显示问题",
                        }
                    )

                session.add(conversation)
                updated_count += 1

        # 批量提交更改
        if updated_count > 0:
            session.commit()
            print(f"✅ 成功修复 {updated_count} 条记录")
        else:
            print("ℹ️  没有需要修复的记录")

    print(f"📈 处理完成: {updated_count}/{total_count} 条记录已修复")


def verify_fix():
    """验证修复结果"""
    print("\n🔍 验证修复结果...")

    with Session(engine) as session:
        # 统计各种模型的使用情况
        conversations = session.exec(select(AIConversation)).all()

        model_stats = {}
        type_stats = {}

        for conv in conversations:
            model = conv.ai_model_name
            conv_type = conv.conversation_type

            model_stats[model] = model_stats.get(model, 0) + 1
            type_stats[conv_type] = type_stats.get(conv_type, 0) + 1

        print("📊 模型使用统计:")
        for model, count in sorted(model_stats.items()):
            print(f"   {model}: {count} 次")

        print("\n📊 对话类型统计:")
        for conv_type, count in sorted(type_stats.items()):
            print(f"   {conv_type}: {count} 次")


if __name__ == "__main__":
    try:
        fix_conversation_model_names()
        verify_fix()
        print("\n🎉 模型名称修复完成！")
    except Exception as e:
        print(f"❌ 修复过程中出错: {e}")
        sys.exit(1)
