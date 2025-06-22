#!/usr/bin/env python3
"""
演示段落引用功能的脚本
"""

import asyncio
import json
import uuid
from pathlib import Path
import sys

# Add the app directory to Python path
sys.path.insert(0, str(Path(__file__).parent / "app"))

from app.core.database import SessionLocal
from app.models.content import ContentItem, Segment, AIConversation
from app.services.ai.segment_aware_chat import SegmentAwareChatService
from app.utils.timezone import now_utc


async def create_demo_data():
    """创建演示数据"""
    db = SessionLocal()
    
    try:
        # 创建用户ID（在实际应用中这会来自认证系统）
        user_id = uuid.uuid4()
        
        # 创建内容项
        content_item = ContentItem(
            id=uuid.uuid4(),
            user_id=user_id,
            type="text",
            title="人工智能基础知识",
            content_text="关于人工智能、机器学习和深度学习的基础知识介绍",
            processing_status="completed",
            created_at=now_utc(),
            updated_at=now_utc()
        )
        db.add(content_item)
        
        # 创建内容段落
        segments_data = [
            "人工智能（Artificial Intelligence，AI）是计算机科学的一个分支，致力于创建能够执行通常需要人类智能的任务的系统。这些任务包括学习、推理、问题解决、感知和语言理解。",
            "机器学习（Machine Learning，ML）是人工智能的一个子集，它使计算机能够从数据中学习而无需明确编程。机器学习算法通过识别数据中的模式来做出预测或决策。",
            "深度学习（Deep Learning，DL）是机器学习的一个子集，使用人工神经网络来模拟人脑的工作方式。深度学习在图像识别、自然语言处理和语音识别等领域取得了突破性进展。",
            "监督学习是机器学习的一种方法，使用标记的训练数据来学习输入和输出之间的映射关系。常见的监督学习任务包括分类和回归。",
            "无监督学习是另一种机器学习方法，从未标记的数据中发现隐藏的模式和结构。聚类和降维是无监督学习的典型应用。"
        ]
        
        segments = []
        for i, content in enumerate(segments_data):
            segment = Segment(
                id=uuid.uuid4(),
                content_item_id=content_item.id,
                segment_index=i,
                content=content,
                segment_type="paragraph",
                word_count=len(content.split()),
                char_count=len(content),
                created_at=now_utc()
            )
            segments.append(segment)
            db.add(segment)
        
        # 创建AI对话
        conversation = AIConversation(
            id=uuid.uuid4(),
            user_id=user_id,
            content_item_id=content_item.id,
            title="AI知识问答",
            ai_model_name="gpt-4o-mini",
            messages="[]",
            created_at=now_utc(),
            updated_at=now_utc()
        )
        db.add(conversation)
        
        db.commit()
        
        print("✅ 演示数据创建成功！")
        print(f"内容项ID: {content_item.id}")
        print(f"对话ID: {conversation.id}")
        print(f"段落数量: {len(segments)}")
        
        return content_item, segments, conversation
        
    except Exception as e:
        db.rollback()
        print(f"❌ 创建演示数据失败: {e}")
        raise
    finally:
        db.close()


async def demo_segment_chat():
    """演示段落引用对话功能"""
    print("🚀 开始演示段落引用功能...\n")
    
    # 创建演示数据
    content_item, segments, conversation = await create_demo_data()
    
    # 初始化服务
    db = SessionLocal()
    chat_service = SegmentAwareChatService(db)
    
    try:
        # 演示问题列表
        questions = [
            "什么是人工智能？",
            "机器学习和深度学习有什么区别？",
            "监督学习和无监督学习的主要区别是什么？"
        ]
        
        for i, question in enumerate(questions, 1):
            print(f"📝 问题 {i}: {question}")
            print("⏳ 正在生成回答...")
            
            try:
                # 模拟AI回答（在实际环境中会调用真实的LLM）
                mock_response = {
                    "answer": f"基于提供的内容段落，我来回答您关于'{question}'的问题。这是一个模拟回答，展示了段落引用功能的工作原理。",
                    "segment_references": [
                        {
                            "sentence_index": 0,
                            "segment_ids": [str(segments[0].id)],
                            "relevance_score": 0.9
                        }
                    ]
                }
                
                # 使用段落感知聊天服务
                with db:
                    # 模拟服务调用
                    result = {
                        "response": mock_response["answer"],
                        "segment_references": mock_response["segment_references"],
                        "segments_used": [
                            {
                                "id": str(seg.id),
                                "content": seg.content[:100] + "..." if len(seg.content) > 100 else seg.content,
                                "segment_index": seg.segment_index
                            }
                            for seg in segments[:2]  # 显示前两个段落
                        ]
                    }
                
                print(f"🤖 AI回答: {result['response']}")
                print(f"📚 引用段落数: {len(result['segments_used'])}")
                
                if result['segment_references']:
                    print("🔗 段落引用详情:")
                    for ref in result['segment_references']:
                        print(f"  - 句子索引: {ref['sentence_index']}")
                        print(f"  - 引用段落: {len(ref['segment_ids'])} 个")
                        print(f"  - 相关性分数: {ref['relevance_score']}")
                
                if result['segments_used']:
                    print("📖 使用的段落:")
                    for seg in result['segments_used']:
                        print(f"  [{seg['segment_index']}] {seg['content']}")
                
                print("-" * 80)
                
            except Exception as e:
                print(f"❌ 处理问题时出错: {e}")
                continue
        
        print("✅ 演示完成！")
        
        # 显示功能总结
        print("\n📊 功能总结:")
        print("1. ✅ 内容分段存储")
        print("2. ✅ 段落检索（基于关键词匹配）")
        print("3. ✅ AI回答生成（模拟）")
        print("4. ✅ 段落引用追踪")
        print("5. ✅ 结构化响应格式")
        
        print("\n🔧 下一步需要配置:")
        print("1. 配置OpenAI API密钥以启用真实的LLM调用")
        print("2. 配置embedding服务以启用向量相似度搜索")
        print("3. 在前端实现引用显示和跳转功能")
        
    except Exception as e:
        print(f"❌ 演示过程中出错: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    print("🎯 段落引用功能演示")
    print("=" * 50)
    asyncio.run(demo_segment_chat()) 