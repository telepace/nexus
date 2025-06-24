#!/usr/bin/env python3
"""
测试SSE进度追踪功能的脚本
"""

import asyncio
import json
import uuid
from datetime import datetime

from sqlmodel import Session, create_engine

from app.core.db import engine
from app.models.content import ContentItem
from app.utils.background_tasks import background_task_manager
from app.utils.events import content_event_manager
from app.utils.timezone import now_utc


async def test_content_processing_progress():
    """测试内容处理进度追踪"""
    print("🧪 开始测试内容处理进度追踪...")
    
    # 模拟用户ID（在实际环境中应该使用真实的用户ID）
    test_user_id = "123e4567-e89b-12d3-a456-426614174000"
    
    # 创建测试内容项
    with Session(engine) as session:
        test_content = ContentItem(
            id=uuid.uuid4(),
            user_id=uuid.UUID(test_user_id),
            type="url",
            source_uri="https://example.com/test",
            title="测试内容",
            content_text="这是一个测试内容",
            processing_status="pending",
            created_at=now_utc(),
            updated_at=now_utc()
        )
        session.add(test_content)
        session.commit()
        session.refresh(test_content)
        
        print(f"✅ 创建测试内容: {test_content.id}")
        
        # 启动后台处理任务
        print("📤 启动后台处理任务...")
        future = background_task_manager.start_content_processing(
            content_id=str(test_content.id),
            user_id=test_user_id
        )
        
        # 监听SSE事件
        print("👂 开始监听SSE事件...")
        queue = await content_event_manager.add_connection(test_user_id)
        
        progress_updates = []
        start_time = datetime.now()
        
        try:
            # 收集进度更新，最多等待120秒
            while True:
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=10.0)
                    elapsed = (datetime.now() - start_time).total_seconds()
                    
                    if event.get("content_id") == str(test_content.id):
                        progress_updates.append({
                            "time": elapsed,
                            "type": event.get("type"),
                            "status": event.get("status"),
                            "progress": event.get("progress"),
                            "title": event.get("title"),
                            "message": event.get("message", "")
                        })
                        
                        print(f"📊 进度更新 [{elapsed:.1f}s]: {event.get('progress', 0)}% - {event.get('status')} - {event.get('title', 'N/A')}")
                        
                        # 如果收到完成或失败状态，停止监听
                        if event.get("status") in ["completed", "failed"]:
                            break
                    
                    # 超时保护
                    if elapsed > 120:
                        print("⏰ 测试超时，停止监听")
                        break
                        
                except asyncio.TimeoutError:
                    print("⏱️ 等待事件超时，继续监听...")
                    continue
                    
        finally:
            await content_event_manager.remove_connection(test_user_id, queue)
        
        # 输出测试结果
        print("\n📈 进度追踪测试结果:")
        print(f"总共收到 {len(progress_updates)} 个进度更新")
        
        if progress_updates:
            print("\n详细进度记录:")
            for i, update in enumerate(progress_updates):
                print(f"{i+1:2}. [{update['time']:6.1f}s] {update['progress']:3}% - {update['status']} - {update['title']}")
            
            # 分析进度间隔
            progresses = [u["progress"] for u in progress_updates if u["progress"] is not None]
            if len(progresses) > 1:
                intervals = [progresses[i] - progresses[i-1] for i in range(1, len(progresses))]
                print(f"\n进度间隔: {intervals}")
                print(f"平均间隔: {sum(intervals) / len(intervals):.1f}%")
            
            # 检查是否有合理的进度分布
            if progresses:
                print(f"进度范围: {min(progresses)}% - {max(progresses)}%")
                unique_progresses = len(set(progresses))
                print(f"不同进度值数量: {unique_progresses}")
                
                if unique_progresses >= 5:
                    print("✅ 进度追踪粒度良好")
                else:
                    print("⚠️ 进度追踪粒度可能太粗")
        else:
            print("❌ 没有收到任何进度更新")
        
        # 检查最终状态
        session.refresh(test_content)
        print(f"\n最终处理状态: {test_content.processing_status}")
        if test_content.error_message:
            print(f"错误信息: {test_content.error_message}")
        
        # 清理测试数据
        session.delete(test_content)
        session.commit()
        print(f"🧹 清理测试内容: {test_content.id}")


async def main():
    """主函数"""
    try:
        await test_content_processing_progress()
        print("\n🎉 测试完成!")
    except Exception as e:
        print(f"\n❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main()) 