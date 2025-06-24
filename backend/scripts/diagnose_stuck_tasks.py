#!/usr/bin/env python3
"""
诊断和修复卡住的内容处理任务

这个脚本用于：
1. 识别长时间处于"处理中"状态的任务
2. 显示任务详情和可能的问题
3. 提供修复选项来重置任务状态

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


def display_task_info(task: ContentItem):
    """显示任务详细信息"""
    print(f"\n📋 任务ID: {task.id}")
    print(f"   标题: {task.title or '无标题'}")
    print(f"   类型: {task.type}")
    print(f"   来源: {task.source_uri or '无来源'}")
    print(f"   状态: {task.processing_status}")
    print(f"   创建时间: {task.created_at}")
    print(f"   更新时间: {task.updated_at}")
    print(f"   错误信息: {task.error_message or '无'}")
    print(f"   最后处理时间: {task.last_processed_at or '从未处理'}")

    # 计算卡住时间 - 修复时区问题
    current_time = now_utc()
    if task.updated_at.tzinfo is None:
        # 如果数据库中的时间是naive datetime，假设它是UTC时间
        task_updated_at = task.updated_at.replace(tzinfo=timezone.utc)
    else:
        task_updated_at = task.updated_at

    stuck_duration = current_time - task_updated_at
    hours = stuck_duration.total_seconds() / 3600
    print(f"   卡住时长: {hours:.1f} 小时")


def diagnose_tasks():
    """诊断卡住的任务"""
    print("🔍 开始诊断卡住的处理任务...")

    with Session(engine) as session:
        # 获取卡住的任务
        stuck_tasks = get_stuck_tasks(session, hours_threshold=2)

        if not stuck_tasks:
            print("✅ 没有发现卡住的任务！")
            return []

        print(f"⚠️  发现 {len(stuck_tasks)} 个卡住的任务:")

        for i, task in enumerate(stuck_tasks, 1):
            print(f"\n{i}. ", end="")
            display_task_info(task)

        return stuck_tasks


def reset_task_status(session: Session, task: ContentItem, new_status: str):
    """重置任务状态"""
    old_status = task.processing_status
    task.processing_status = new_status
    task.updated_at = now_utc()

    # 清除错误信息如果状态改为pending
    if new_status == "pending":
        task.error_message = None
        task.last_processed_at = None
    elif new_status == "failed" and not task.error_message:
        task.error_message = "Task was stuck and manually reset"
        task.last_processed_at = now_utc()

    session.add(task)
    session.commit()
    print(f"✅ 任务 {task.id} 状态已从 {old_status} 重置为 {new_status}")


def fix_stuck_tasks(stuck_tasks: list[ContentItem]):
    """修复卡住的任务"""
    if not stuck_tasks:
        return

    print("\n🔧 修复选项:")
    print("1. 将所有卡住的任务标记为失败 (failed)")
    print("2. 将所有卡住的任务重置为待处理 (pending)")
    print("3. 逐个处理任务")
    print("4. 跳过修复")

    choice = input("\n请选择操作 (1-4): ").strip()

    with Session(engine) as session:
        if choice == "1":
            # 标记为失败
            for task in stuck_tasks:
                reset_task_status(session, task, "failed")
            print(f"✅ 已将 {len(stuck_tasks)} 个任务标记为失败")

        elif choice == "2":
            # 重置为待处理
            for task in stuck_tasks:
                reset_task_status(session, task, "pending")
            print(f"✅ 已将 {len(stuck_tasks)} 个任务重置为待处理")

        elif choice == "3":
            # 逐个处理
            for i, task in enumerate(stuck_tasks, 1):
                print(f"\n处理任务 {i}/{len(stuck_tasks)}:")
                display_task_info(task)

                print("\n选项:")
                print("1. 标记为失败 (failed)")
                print("2. 重置为待处理 (pending)")
                print("3. 跳过此任务")

                task_choice = input("请选择 (1-3): ").strip()

                if task_choice == "1":
                    reset_task_status(session, task, "failed")
                elif task_choice == "2":
                    reset_task_status(session, task, "pending")
                else:
                    print("跳过此任务")

        else:
            print("跳过修复")


def show_statistics():
    """显示处理状态统计"""
    print("\n📊 处理状态统计:")

    with Session(engine) as session:
        # 统计各种状态的任务数量
        statuses = ["pending", "processing", "completed", "failed"]

        for status in statuses:
            stmt = select(ContentItem).where(ContentItem.processing_status == status)
            count = len(session.exec(stmt).all())
            print(f"   {status}: {count}")

        # 统计有错误信息的任务
        stmt = select(ContentItem).where(
            ContentItem.error_message.isnot(None), ContentItem.error_message != ""
        )
        error_count = len(session.exec(stmt).all())
        print(f"   有错误信息的任务: {error_count}")


def show_recommendations():
    """显示修复建议"""
    print("\n💡 修复建议:")
    print("1. 定期运行此脚本检查卡住的任务")
    print("2. 对于长时间卡住的任务，建议重置为待处理状态")
    print("3. 如果任务反复失败，检查错误信息并修复根本原因")
    print("4. 考虑调整处理超时设置以避免任务卡死")
    print("5. 监控服务器资源使用情况，确保有足够的内存和CPU")


def main():
    """主函数"""
    print("=" * 60)
    print("🔧 内容处理任务诊断工具")
    print("=" * 60)

    try:
        # 显示统计信息
        show_statistics()

        # 诊断卡住的任务
        stuck_tasks = diagnose_tasks()

        # 如果有卡住的任务，提供修复选项
        if stuck_tasks:
            fix_stuck_tasks(stuck_tasks)

        # 显示建议
        show_recommendations()

    except KeyboardInterrupt:
        print("\n\n👋 用户取消操作")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ 发生错误: {e}")
        sys.exit(1)

    print("\n✅ 诊断完成")


if __name__ == "__main__":
    main()
