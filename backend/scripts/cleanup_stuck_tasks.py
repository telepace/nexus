#!/usr/bin/env python3
"""
定期清理卡住的处理任务

这个脚本可以通过cron定时运行，自动清理卡住的任务，防止任务积压。
建议设置为每小时运行一次。

使用方法：
1. 手动运行: python scripts/cleanup_stuck_tasks.py
2. 添加到crontab: 0 * * * * /path/to/python /path/to/cleanup_stuck_tasks.py
"""

import logging
import sys
from datetime import timedelta, timezone

from sqlmodel import Session, select

from app.core.db import engine
from app.models.content import ContentItem, ProcessingJob
from app.utils.timezone import now_utc

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("logs/cleanup_stuck_tasks.log", mode="a"),
    ],
)
logger = logging.getLogger(__name__)


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


def get_processing_jobs_for_content(
    session: Session, content_id
) -> list[ProcessingJob]:
    """获取内容项相关的处理任务"""
    stmt = (
        select(ProcessingJob)
        .where(ProcessingJob.content_item_id == content_id)
        .order_by(ProcessingJob.created_at.desc())
    )

    return session.exec(stmt).all()


def calculate_stuck_duration(task: ContentItem) -> float:
    """计算任务卡住的时长（小时）"""
    current_time = now_utc()
    if task.updated_at.tzinfo is None:
        # 如果数据库中的时间是naive datetime，假设它是UTC时间
        task_updated_at = task.updated_at.replace(tzinfo=timezone.utc)
    else:
        task_updated_at = task.updated_at

    stuck_duration = current_time - task_updated_at
    return stuck_duration.total_seconds() / 3600


def cleanup_stuck_task(session: Session, task: ContentItem) -> bool:
    """清理单个卡住的任务"""
    try:
        old_status = task.processing_status
        stuck_hours = calculate_stuck_duration(task)

        # 更新任务状态
        task.processing_status = "failed"
        task.error_message = (
            f"Task was stuck for {stuck_hours:.1f} hours and automatically cleaned up"
        )
        task.updated_at = now_utc()
        session.add(task)

        # 清理相关的处理任务
        jobs = get_processing_jobs_for_content(session, task.id)
        for job in jobs:
            if job.status == "in_progress":
                job.status = "failed"
                job.error_message = f"Task was stuck for {stuck_hours:.1f} hours and automatically cleaned up"
                job.completed_at = now_utc()
                session.add(job)

        session.commit()

        logger.info(
            f"Cleaned up stuck task {task.id} (stuck for {stuck_hours:.1f} hours)"
        )
        logger.info(f"  Title: {task.title or 'No title'}")
        logger.info(f"  Source: {task.source_uri or 'No source'}")
        logger.info(f"  Status changed from {old_status} to failed")

        return True

    except Exception as e:
        logger.error(f"Failed to cleanup task {task.id}: {str(e)}")
        session.rollback()
        return False


def cleanup_stuck_tasks(hours_threshold: int = 2, dry_run: bool = False) -> dict:
    """清理卡住的任务"""
    logger.info(
        f"Starting cleanup of stuck tasks (threshold: {hours_threshold} hours, dry_run: {dry_run})"
    )

    stats = {
        "total_found": 0,
        "successfully_cleaned": 0,
        "failed_to_clean": 0,
        "tasks_cleaned": [],
    }

    try:
        with Session(engine) as session:
            # 获取卡住的任务
            stuck_tasks = get_stuck_tasks(session, hours_threshold)
            stats["total_found"] = len(stuck_tasks)

            if not stuck_tasks:
                logger.info("No stuck tasks found")
                return stats

            logger.info(f"Found {len(stuck_tasks)} stuck tasks")

            for task in stuck_tasks:
                stuck_hours = calculate_stuck_duration(task)

                if dry_run:
                    logger.info(
                        f"[DRY RUN] Would clean up task {task.id} (stuck for {stuck_hours:.1f} hours)"
                    )
                    logger.info(f"  Title: {task.title or 'No title'}")
                    logger.info(f"  Source: {task.source_uri or 'No source'}")
                    stats["successfully_cleaned"] += 1
                else:
                    if cleanup_stuck_task(session, task):
                        stats["successfully_cleaned"] += 1
                        stats["tasks_cleaned"].append(
                            {
                                "id": str(task.id),
                                "title": task.title,
                                "source_uri": task.source_uri,
                                "stuck_hours": stuck_hours,
                            }
                        )
                    else:
                        stats["failed_to_clean"] += 1

            if not dry_run:
                logger.info(
                    f"Cleanup completed: {stats['successfully_cleaned']} cleaned, {stats['failed_to_clean']} failed"
                )
            else:
                logger.info(
                    f"Dry run completed: {stats['successfully_cleaned']} tasks would be cleaned"
                )

    except Exception as e:
        logger.error(f"Error during cleanup: {str(e)}")
        raise

    return stats


def get_system_status() -> dict:
    """获取系统状态统计"""
    with Session(engine) as session:
        # 统计各种状态的任务数量
        statuses = ["pending", "processing", "completed", "failed"]
        content_stats = {}

        for status in statuses:
            stmt = select(ContentItem).where(ContentItem.processing_status == status)
            count = len(session.exec(stmt).all())
            content_stats[status] = count

        # 统计处理任务状态
        job_statuses = ["pending", "in_progress", "completed", "failed", "skipped"]
        job_stats = {}

        for status in job_statuses:
            stmt = select(ProcessingJob).where(ProcessingJob.status == status)
            count = len(session.exec(stmt).all())
            job_stats[status] = count

        return {"content_items": content_stats, "processing_jobs": job_stats}


def main():
    """主函数"""
    import argparse

    parser = argparse.ArgumentParser(description="Cleanup stuck processing tasks")
    parser.add_argument(
        "--hours",
        type=int,
        default=2,
        help="Hours threshold for considering a task as stuck (default: 2)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be cleaned without actually doing it",
    )
    parser.add_argument("--quiet", action="store_true", help="Reduce log output")
    parser.add_argument(
        "--status", action="store_true", help="Show system status and exit"
    )

    args = parser.parse_args()

    if args.quiet:
        logging.getLogger().setLevel(logging.WARNING)

    try:
        if args.status:
            # 只显示状态
            status = get_system_status()
            logger.info("System Status:")
            logger.info(f"Content Items: {status['content_items']}")
            logger.info(f"Processing Jobs: {status['processing_jobs']}")
            return

        # 执行清理
        stats = cleanup_stuck_tasks(hours_threshold=args.hours, dry_run=args.dry_run)

        # 显示最终统计
        logger.info("=" * 50)
        logger.info("CLEANUP SUMMARY:")
        logger.info(f"  Found stuck tasks: {stats['total_found']}")
        logger.info(f"  Successfully cleaned: {stats['successfully_cleaned']}")
        logger.info(f"  Failed to clean: {stats['failed_to_clean']}")

        if stats["tasks_cleaned"]:
            logger.info("  Cleaned tasks:")
            for task in stats["tasks_cleaned"]:
                logger.info(
                    f"    - {task['id']} ({task['stuck_hours']:.1f}h): {task['title']}"
                )

        # 显示清理后的状态
        if not args.dry_run and stats["successfully_cleaned"] > 0:
            status = get_system_status()
            logger.info("System Status After Cleanup:")
            logger.info(f"  Content Items: {status['content_items']}")
            logger.info(f"  Processing Jobs: {status['processing_jobs']}")

    except Exception as e:
        logger.error(f"Cleanup failed: {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    main()
