#!/usr/bin/env python3
"""
AI处理实时监控脚本
监控 summary 和 key_points 的处理状态
"""

import asyncio
import logging
import sys
from datetime import datetime, timedelta
from pathlib import Path

# 添加项目根目录到路径
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlmodel import Session, desc, select

from app.core.db import engine
from app.models.content import AIResult, ContentItem

# 设置日志
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


class AIProcessingMonitor:
    """AI处理监控器"""

    def __init__(self):
        self.last_check_time = datetime.utcnow() - timedelta(hours=1)
        self.stats = {
            "total_processed": 0,
            "successful_summary": 0,
            "successful_key_points": 0,
            "failed_summary": 0,
            "failed_key_points": 0,
            "successful_metadata": 0,
            "failed_metadata": 0,
        }

    async def monitor_continuous(self, interval_seconds: int = 30):
        """持续监控模式"""
        print("🔍 启动AI处理持续监控...")
        print(f"📊 监控间隔: {interval_seconds}秒")
        print("=" * 60)

        try:
            while True:
                await self.check_recent_processing()
                await asyncio.sleep(interval_seconds)
        except KeyboardInterrupt:
            print("\n⏹️  监控已停止")
            self.print_final_stats()

    async def check_recent_processing(self):
        """检查最近的处理情况"""
        current_time = datetime.utcnow()

        with Session(engine) as session:
            # 获取最近处理的内容
            recent_items = session.exec(
                select(ContentItem)
                .where(ContentItem.last_processed_at > self.last_check_time)
                .order_by(desc(ContentItem.last_processed_at))
                .limit(50)
            ).all()

            if recent_items:
                print(
                    f"\n🕒 {current_time.strftime('%H:%M:%S')} - 发现 {len(recent_items)} 个新处理的内容"
                )

                for item in recent_items:
                    await self.analyze_content_item(item, session)

                self.print_current_stats()
            else:
                print(f"🕒 {current_time.strftime('%H:%M:%S')} - 无新处理内容")

        self.last_check_time = current_time

    async def analyze_content_item(self, content_item: ContentItem, session: Session):
        """分析单个内容项的处理情况"""
        self.stats["total_processed"] += 1

        # 查找对应的AI结果
        ai_result = session.exec(
            select(AIResult).where(AIResult.content_item_id == content_item.id)
        ).first()

        status_summary = self._analyze_summary_status(ai_result)
        status_key_points = self._analyze_key_points_status(ai_result)
        status_metadata = self._analyze_metadata_status(ai_result)

        # 更新统计
        if status_summary == "success":
            self.stats["successful_summary"] += 1
        elif status_summary == "failed":
            self.stats["failed_summary"] += 1

        if status_key_points == "success":
            self.stats["successful_key_points"] += 1
        elif status_key_points == "failed":
            self.stats["failed_key_points"] += 1

        if status_metadata == "success":
            self.stats["successful_metadata"] += 1
        elif status_metadata == "failed":
            self.stats["failed_metadata"] += 1

        # 打印详细信息
        print(f"   📄 {content_item.title[:30]}...")
        print(f"      ID: {content_item.id}")
        print(f"      状态: {content_item.processing_status}")
        print(
            f"      Summary: {self._get_status_emoji(status_summary)} {status_summary}"
        )
        print(
            f"      Key Points: {self._get_status_emoji(status_key_points)} {status_key_points}"
        )
        print(
            f"      Metadata: {self._get_status_emoji(status_metadata)} {status_metadata}"
        )

        # 如果有失败，显示详细信息
        if status_summary == "failed" or status_key_points == "failed":
            if content_item.error_message:
                print(f"      错误: {content_item.error_message}")
            if ai_result and not ai_result.summary:
                print("      Summary问题: 数据库中无summary数据")
            if ai_result and not ai_result.key_points:
                print("      Key Points问题: 数据库中无key_points数据")

    def _analyze_summary_status(self, ai_result: AIResult = None) -> str:
        """分析摘要处理状态"""
        if not ai_result:
            return "no_ai_result"

        if ai_result.summary:
            # 检查summary的内容质量
            if isinstance(ai_result.summary, dict):
                if ai_result.summary.get("text") or ai_result.summary.get(
                    "main_thesis"
                ):
                    return "success"
                else:
                    return "empty_content"
            elif isinstance(ai_result.summary, str) and ai_result.summary.strip():
                return "success"
            else:
                return "empty_content"
        else:
            return "failed"

    def _analyze_key_points_status(self, ai_result: AIResult = None) -> str:
        """分析关键要点处理状态"""
        if not ai_result:
            return "no_ai_result"

        if ai_result.key_points:
            # 检查key_points的内容质量
            if isinstance(ai_result.key_points, dict):
                if (
                    ai_result.key_points.get("text")
                    or ai_result.key_points.get("core_concepts")
                    or ai_result.key_points.get("points")
                ):
                    return "success"
                else:
                    return "empty_content"
            elif isinstance(ai_result.key_points, str) and ai_result.key_points.strip():
                return "success"
            else:
                return "empty_content"
        else:
            return "failed"

    def _analyze_metadata_status(self, ai_result: AIResult = None) -> str:
        """分析元数据处理状态"""
        if not ai_result:
            return "no_ai_result"

        # 检查是否有基本的元数据
        if (
            ai_result.labels
            or ai_result.reading_time_minutes
            or ai_result.difficulty_level
            or ai_result.content_quality_score
        ):
            return "success"
        else:
            return "failed"

    def _get_status_emoji(self, status: str) -> str:
        """获取状态对应的emoji"""
        emoji_map = {
            "success": "✅",
            "failed": "❌",
            "empty_content": "⚠️",
            "no_ai_result": "🚫",
        }
        return emoji_map.get(status, "❓")

    def print_current_stats(self):
        """打印当前统计信息"""
        total = self.stats["total_processed"]
        if total == 0:
            return

        summary_success_rate = (self.stats["successful_summary"] / total) * 100
        key_points_success_rate = (self.stats["successful_key_points"] / total) * 100
        metadata_success_rate = (self.stats["successful_metadata"] / total) * 100

        print(f"\n📊 当前统计 (总计: {total})")
        print(
            f"   Summary成功率: {summary_success_rate:.1f}% ({self.stats['successful_summary']}/{total})"
        )
        print(
            f"   Key Points成功率: {key_points_success_rate:.1f}% ({self.stats['successful_key_points']}/{total})"
        )
        print(
            f"   Metadata成功率: {metadata_success_rate:.1f}% ({self.stats['successful_metadata']}/{total})"
        )

    def print_final_stats(self):
        """打印最终统计信息"""
        print("\n" + "=" * 60)
        print("📈 最终统计报告")
        print("=" * 60)
        self.print_current_stats()

        # 识别问题
        issues = []
        if self.stats["failed_summary"] > self.stats["successful_summary"]:
            issues.append("Summary处理失败率过高")
        if self.stats["failed_key_points"] > self.stats["successful_key_points"]:
            issues.append("Key Points处理失败率过高")
        if self.stats["failed_metadata"] > self.stats["successful_metadata"]:
            issues.append("Metadata处理失败率过高")

        if issues:
            print("\n⚠️  发现的问题:")
            for issue in issues:
                print(f"   - {issue}")
        else:
            print("\n✅ 所有AI处理功能运行正常")

    async def check_specific_timeframe(self, hours_back: int = 24):
        """检查特定时间范围内的处理情况"""
        start_time = datetime.utcnow() - timedelta(hours=hours_back)

        print(f"🔍 检查过去 {hours_back} 小时的AI处理情况...")
        print(
            f"📅 时间范围: {start_time.strftime('%Y-%m-%d %H:%M')} - {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}"
        )
        print("=" * 60)

        with Session(engine) as session:
            # 获取指定时间范围内的内容
            items = session.exec(
                select(ContentItem)
                .where(ContentItem.last_processed_at > start_time)
                .order_by(desc(ContentItem.last_processed_at))
            ).all()

            if not items:
                print("📭 在指定时间范围内没有找到处理的内容")
                return

            print(f"📄 找到 {len(items)} 个处理的内容")
            print()

            for item in items:
                await self.analyze_content_item(item, session)

            self.print_final_stats()

    async def diagnose_failures(self, hours_back: int = 24):
        """诊断失败的处理"""
        start_time = datetime.utcnow() - timedelta(hours=hours_back)

        print(f"🔧 诊断过去 {hours_back} 小时内的处理失败...")
        print("=" * 60)

        with Session(engine) as session:
            # 查找失败的内容项
            failed_items = session.exec(
                select(ContentItem)
                .where(ContentItem.last_processed_at > start_time)
                .where(ContentItem.processing_status == "failed")
                .order_by(desc(ContentItem.last_processed_at))
            ).all()

            # 查找有AI结果但summary或key_points为空的项
            incomplete_items = session.exec(
                select(ContentItem)
                .join(AIResult)
                .where(ContentItem.last_processed_at > start_time)
                .where(ContentItem.processing_status == "completed")
                .order_by(desc(ContentItem.last_processed_at))
            ).all()

            print(f"❌ 处理状态为失败的内容: {len(failed_items)}")
            for item in failed_items:
                print(f"   - {item.title[:50]}... (ID: {item.id})")
                if item.error_message:
                    print(f"     错误: {item.error_message}")

            print(f"\n⚠️  处理完成但可能有问题的内容: {len(incomplete_items)}")
            for item in incomplete_items:
                ai_result = session.exec(
                    select(AIResult).where(AIResult.content_item_id == item.id)
                ).first()

                issues = []
                if not ai_result:
                    issues.append("无AI结果")
                else:
                    if not ai_result.summary:
                        issues.append("无Summary")
                    if not ai_result.key_points:
                        issues.append("无Key Points")

                if issues:
                    print(f"   - {item.title[:50]}... (ID: {item.id})")
                    print(f"     问题: {', '.join(issues)}")


async def main():
    """主函数"""
    import argparse

    parser = argparse.ArgumentParser(description="AI处理监控工具")
    parser.add_argument("--monitor", action="store_true", help="启动持续监控")
    parser.add_argument("--interval", type=int, default=30, help="监控间隔(秒)")
    parser.add_argument("--check-hours", type=int, help="检查过去N小时的处理情况")
    parser.add_argument("--diagnose", action="store_true", help="诊断失败的处理")

    args = parser.parse_args()

    monitor = AIProcessingMonitor()

    if args.monitor:
        await monitor.monitor_continuous(args.interval)
    elif args.check_hours:
        await monitor.check_specific_timeframe(args.check_hours)
    elif args.diagnose:
        await monitor.diagnose_failures(args.check_hours or 24)
    else:
        # 默认检查过去1小时
        await monitor.check_specific_timeframe(1)


if __name__ == "__main__":
    asyncio.run(main())
