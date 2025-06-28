#!/usr/bin/env python3
"""
标签管理脚本
提供标签系统的维护和管理功能
"""

import argparse
import sys
from pathlib import Path

# 添加项目根目录到Python路径
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlmodel import Session, create_engine, select

from app.core.config import settings
from app.models.prompt import Tag
from app.services.ai_tag_processor import ai_tag_processor
from app.utils.tag_manager import tag_manager


def sync_preset_tags():
    """同步预设标签到数据库"""
    engine = create_engine(str(settings.SQLALCHEMY_DATABASE_URI))

    with Session(engine) as session:
        print("开始同步预设标签到数据库...")

        # 获取当前标签数量
        current_tags = session.exec(select(Tag)).all()
        print(f"同步前数据库中有 {len(current_tags)} 个标签")

        # 执行同步
        new_count = ai_tag_processor.sync_preset_tags_to_database(session)

        # 获取同步后标签数量
        updated_tags = session.exec(select(Tag)).all()
        print(f"同步完成！新创建了 {new_count} 个标签")
        print(f"同步后数据库中有 {len(updated_tags)} 个标签")


def list_tags(category=None):
    """列出标签信息"""
    engine = create_engine(str(settings.SQLALCHEMY_DATABASE_URI))

    with Session(engine) as session:
        if category:
            # 显示特定分类的预设标签
            preset_tags = tag_manager.get_tags_by_category(category)
            print(f"\n=== {category} 分类的预设标签 ===")
            for tag in preset_tags:
                print(f"- {tag['name']} ({tag['name_en']}) - {tag['description']}")
        else:
            # 显示数据库中的所有标签
            tags = session.exec(select(Tag)).all()
            print(f"\n=== 数据库中的标签 (共 {len(tags)} 个) ===")
            for tag in tags:
                print(f"- {tag.name} (ID: {tag.id}, 颜色: {tag.color})")


def show_categories():
    """显示所有预设标签分类"""
    categories = tag_manager.get_categories()
    print(f"\n=== 预设标签分类 (共 {len(categories)} 个) ===")
    for category in categories:
        tags = tag_manager.get_tags_by_category(category)
        print(f"- {category}: {len(tags)} 个标签")


def show_stats():
    """显示标签系统统计信息"""
    engine = create_engine(str(settings.SQLALCHEMY_DATABASE_URI))

    # 预设标签统计
    preset_tags = tag_manager.load_preset_tags()
    categories = tag_manager.get_categories()

    print("\n=== 标签系统统计 ===")
    print(f"预设标签总数: {len(preset_tags)}")
    print(f"预设标签分类: {len(categories)}")

    # 数据库标签统计
    with Session(engine) as session:
        db_tags = session.exec(select(Tag)).all()
        print(f"数据库标签总数: {len(db_tags)}")

        # 分类统计
        print("\n=== 分类详情 ===")
        for category in categories:
            category_tags = tag_manager.get_tags_by_category(category)
            print(f"{category}: {len(category_tags)} 个标签")


def test_tag_matching():
    """测试标签匹配功能"""
    test_cases = [
        ["AI", "machine learning", "编程", "product"],
        ["深度学习", "神经网络", "web development"],
        ["blockchain", "安全", "数据库设计", "DevOps"],
        ["用户体验", "设计思维", "产品经理", "agile"],
    ]

    print("\n=== 标签匹配测试 ===")
    for i, ai_tags in enumerate(test_cases, 1):
        matched = tag_manager.filter_and_match_preset_tags(ai_tags)
        print(f"\n测试 {i}:")
        print(f"  输入: {ai_tags}")
        print(f"  匹配: {matched}")


def main():
    """主函数"""
    parser = argparse.ArgumentParser(description="标签管理脚本")
    parser.add_argument(
        "action",
        choices=["sync", "list", "categories", "stats", "test"],
        help="执行的操作",
    )
    parser.add_argument("--category", help="指定标签分类（仅用于list操作）")

    args = parser.parse_args()

    try:
        if args.action == "sync":
            sync_preset_tags()
        elif args.action == "list":
            list_tags(args.category)
        elif args.action == "categories":
            show_categories()
        elif args.action == "stats":
            show_stats()
        elif args.action == "test":
            test_tag_matching()
    except Exception as e:
        print(f"❌ 执行失败: {e}")
        sys.exit(1)

    print("✅ 操作完成")


if __name__ == "__main__":
    main()
