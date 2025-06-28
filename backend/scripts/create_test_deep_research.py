#!/usr/bin/env python3
"""
创建测试深度研究任务的脚本

用于测试修复后的深度研究分段功能
"""

import asyncio
import uuid
from pathlib import Path
import sys

# 添加项目根目录到路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from sqlmodel import Session
from app.core.db import engine
from app.models.content import DeepResearchJob
from app.services.deep_research_service import deep_research_service
from app.utils.timezone import now_utc


async def create_test_research():
    """创建一个测试深度研究任务"""
    
    print("🔬 创建测试深度研究任务...")
    
    # 创建一个简单的研究任务
    test_query = "什么是人工智能的发展历史"
    
    with Session(engine) as session:
        # 创建深度研究任务记录 (需要一个真实的用户ID)
        from app.base import User
        from sqlmodel import select
        
        # 获取第一个用户
        statement = select(User).limit(1)
        user = session.exec(statement).first()
        
        if not user:
            print("❌ 没有找到用户，无法创建测试任务")
            return None
            
        job = DeepResearchJob(
            user_id=user.id,
            query=test_query,
            depth=2,  # 较小的深度以便快速测试
            breadth=1,
            status="pending",
            created_at=now_utc(),
            updated_at=now_utc(),
        )

        session.add(job)
        session.commit()
        session.refresh(job)
        
        print(f"📋 创建了测试任务: {job.id}")
        print(f"   查询: {job.query}")
        print(f"   用户: {user.email}")
        
        return job.id


async def run_test_research(job_id: uuid.UUID):
    """运行测试研究任务"""
    
    print(f"\n🚀 开始处理深度研究任务: {job_id}")
    
    try:
        success = await deep_research_service.process_deep_research(job_id)
        
        if success:
            print("✅ 深度研究任务完成")
            return True
        else:
            print("❌ 深度研究任务失败")
            return False
            
    except Exception as e:
        print(f"❌ 深度研究任务异常: {e}")
        return False


async def verify_results(job_id: uuid.UUID):
    """验证研究结果"""
    
    print(f"\n🔍 验证研究结果...")
    
    with Session(engine) as session:
        from app.models.content import ContentItem, Segment
        from sqlmodel import select
        
        # 查找对应的 ContentItem
        statement = (
            select(ContentItem)
            .where(ContentItem.source_uri == f"deep_research:{job_id}")
        )
        content_item = session.exec(statement).first()
        
        if not content_item:
            print("❌ 没有找到对应的 ContentItem")
            return False
            
        print(f"📄 找到 ContentItem: {content_item.id}")
        print(f"   标题: {content_item.title}")
        print(f"   处理状态: {content_item.processing_status}")
        
        # 检查分段数据
        statement = (
            select(Segment)
            .where(Segment.content_item_id == content_item.id)
            .order_by(Segment.segment_index)
        )
        segments = session.exec(statement).all()
        
        print(f"📊 分段验证:")
        print(f"   分段数量: {len(segments)}")
        
        if len(segments) == 0:
            print("❌ 没有创建分段数据")
            return False
        else:
            print("✅ 成功创建分段数据!")
            
            # 显示分段详情
            for i, segment in enumerate(segments[:3]):  # 只显示前3个
                content_preview = segment.content[:80] + "..." if len(segment.content) > 80 else segment.content
                print(f"   分段 {segment.segment_index + 1}: {segment.char_count} 字符")
                print(f"     预览: {content_preview}")
                
            if len(segments) > 3:
                print(f"   ... 还有 {len(segments) - 3} 个分段")
                
            return True


async def test_api_access(job_id: uuid.UUID):
    """测试API访问"""
    
    print(f"\n🌐 测试API访问...")
    
    with Session(engine) as session:
        from app.models.content import ContentItem
        from app.crud.crud_content import get_content_chunks
        from sqlmodel import select
        
        # 查找对应的 ContentItem
        statement = (
            select(ContentItem)
            .where(ContentItem.source_uri == f"deep_research:{job_id}")
        )
        content_item = session.exec(statement).first()
        
        if not content_item:
            print("❌ 没有找到 ContentItem")
            return False
            
        try:
            chunks, total_count = get_content_chunks(
                session=session, 
                content_item_id=content_item.id, 
                page=1, 
                size=10
            )
            
            print(f"📊 API 测试结果:")
            print(f"   返回分块数量: {len(chunks)}")
            print(f"   总分块数量: {total_count}")
            
            if len(chunks) > 0:
                print("✅ API 能够正确返回分段数据")
                print(f"   第一个分块预览: {chunks[0].content[:100]}...")
                return True
            else:
                print("❌ API 没有返回分段数据")
                return False
                
        except Exception as e:
            print(f"❌ API 测试失败: {e}")
            return False


async def main():
    """主函数"""
    
    print("=" * 70)
    print("深度研究分段修复测试 - 创建新任务")
    print("=" * 70)
    
    # 创建测试任务
    job_id = await create_test_research()
    if not job_id:
        return
    
    # 运行研究任务
    success = await run_test_research(job_id)
    if not success:
        print("❌ 研究任务失败，无法继续测试")
        return
    
    # 验证结果
    segmentation_ok = await verify_results(job_id)
    
    # 测试API
    api_ok = await test_api_access(job_id)
    
    print("\n" + "=" * 70)
    print("测试总结:")
    print(f"任务ID: {job_id}")
    print(f"分段功能: {'✅ 正常' if segmentation_ok else '❌ 异常'}")
    print(f"API端点: {'✅ 正常' if api_ok else '❌ 异常'}")
    
    if segmentation_ok and api_ok:
        print("\n🎉 深度研究分段修复验证成功！")
        print("新的深度研究任务现在会正确创建分段数据。")
        print("前端应该能够正常显示分段内容了。")
    else:
        print("\n⚠️  修复可能存在问题，需要进一步调试。")
    
    print("=" * 70)


if __name__ == "__main__":
    asyncio.run(main()) 