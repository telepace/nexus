#!/usr/bin/env python3
"""
清理卡住的内容处理任务

这个脚本用于：
1. 识别长时间处于"处理中"状态的任务
2. 自动清理这些任务
3. 重置任务状态以便重新处理

注意：此脚本已更新以适应移除ProcessingJob表后的新架构
"""

import sys
from datetime import timedelta, timezone

from sqlmodel import Session, select

from app.core.db import engine
from app.models.content import ContentItem
from app.utils.timezone import now_utc


def get_stuck_tasks(session: Session, hours_threshold: int = 2) -> list[ContentItem]:
    """获取卡住的任务（超过指定小时数还在处理中的任务）"""
    cutoff_time = now_utc() - timedelta(hours=hours_threshold)

    stmt = (
        select(ContentItem)
        .where(
            ContentItem.processing_status == "processing",
            ContentItem.updated_at < cutoff_time,
        )
        .order_by(ContentItem.updated_at.asc())
    )

    return session.exec(stmt).all()


def cleanup_stuck_tasks(
    session: Session, stuck_tasks: list[ContentItem], action: str = "reset"
):
    """清理卡住的任务

    Args:
        session: 数据库会话
        stuck_tasks: 卡住的任务列表
        action: 清理动作 ('reset' 重置为pending, 'fail' 标记为失败)
    """
    if not stuck_tasks:
        return 0

    count = 0
    for task in stuck_tasks:
        if action == "reset":
            task.processing_status = "pending"
            task.error_message = None
            task.last_processed_at = None
        elif action == "fail":
            task.processing_status = "failed"
            if not task.error_message:
                task.error_message = "Task was stuck and automatically cleaned up"
            task.last_processed_at = now_utc()

        task.updated_at = now_utc()
        session.add(task)
        count += 1

    session.commit()
    return count


def show_task_summary(task: ContentItem):
    """显示任务摘要信息"""
    current_time = now_utc()
    if task.updated_at.tzinfo is None:
        # 如果数据库中的时间是naive datetime，假设它是UTC时间
        task_updated_at = task.updated_at.replace(tzinfo=timezone.utc)
    else:
        task_updated_at = task.updated_at

    stuck_duration = current_time - task_updated_at
    hours = stuck_duration.total_seconds() / 3600

    print(f"  • {task.id} ({task.title or 'Untitled'}) - 卡住 {hours:.1f} 小时")


def main():
    """主函数"""
    print("🧹 内容处理任务清理工具")
    print("=" * 50)

    # 检查命令行参数
    hours_threshold = 2
    action = "reset"  # 默认动作：重置为pending

    if len(sys.argv) > 1:
        try:
            hours_threshold = int(sys.argv[1])
        except ValueError:
            print("❌ 无效的小时数参数")
            sys.exit(1)

    if len(sys.argv) > 2:
        action = sys.argv[2].lower()
        if action not in ["reset", "fail"]:
            print("❌ 无效的动作参数，使用 'reset' 或 'fail'")
            sys.exit(1)

    print(f"📋 参数: 超时阈值={hours_threshold}小时, 动作={action}")

    try:
        with Session(engine) as session:
            # 查找卡住的任务
            stuck_tasks = get_stuck_tasks(session, hours_threshold=hours_threshold)

            if not stuck_tasks:
                print("✅ 没有发现卡住的任务！")
                return

            print(f"\n⚠️  发现 {len(stuck_tasks)} 个卡住的任务:")
            for task in stuck_tasks:
                show_task_summary(task)

            # 执行清理
            print(f"\n🔧 执行清理动作: {action}")
            cleaned_count = cleanup_stuck_tasks(session, stuck_tasks, action)

            if action == "reset":
                print(f"✅ 成功重置 {cleaned_count} 个任务为待处理状态")
            elif action == "fail":
                print(f"✅ 成功标记 {cleaned_count} 个任务为失败状态")

            # 显示统计信息
            print("\n📊 当前任务状态统计:")
            statuses = ["pending", "processing", "completed", "failed"]
            for status in statuses:
                stmt = select(ContentItem).where(
                    ContentItem.processing_status == status
                )
                count = len(session.exec(stmt).all())
                print(f"  {status}: {count}")

    except Exception as e:
        print(f"\n❌ 发生错误: {e}")
        sys.exit(1)

    print("\n✅ 清理完成")


if __name__ == "__main__":
    main()
