#!/usr/bin/env python3
"""
Backup and reinitialize data script.

This script backs up existing data and reinitializes the database with default data.
Requires user confirmation before proceeding.
"""

import json
import logging
import sys
from datetime import datetime
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

# Local imports after path modification
from sqlmodel import Session, select  # noqa: E402

from app.base import User  # noqa: E402
from app.core.db import engine, init_db  # noqa: E402
from app.models.prompt import Prompt, PromptVersion, Tag  # noqa: E402

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def create_backup_directory() -> Path:
    """创建备份目录"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_dir = Path.home() / "nexus_backups" / f"backup_{timestamp}"
    backup_dir.mkdir(parents=True, exist_ok=True)
    return backup_dir


def backup_data(session: Session, backup_dir: Path) -> bool:
    """备份现有数据"""
    try:
        logger.info("🗄️  开始备份数据...")

        # 备份用户数据
        users = session.exec(select(User)).all()
        users_data = []
        for user in users:
            user_dict = {
                "id": str(user.id),
                "email": user.email,
                "full_name": user.full_name,
                "is_active": user.is_active,
                "is_superuser": user.is_superuser,
                "avatar_url": user.avatar_url,
                "is_setup_complete": user.is_setup_complete,
                "google_id": user.google_id,
                # 不备份密码哈希值，出于安全考虑
            }
            users_data.append(user_dict)

        with open(backup_dir / "users.json", "w", encoding="utf-8") as f:
            json.dump(users_data, f, ensure_ascii=False, indent=2)

        # 备份标签数据
        tags = session.exec(select(Tag)).all()
        tags_data = []
        for tag in tags:
            tag_dict = {
                "id": str(tag.id),
                "name": tag.name,
                "description": tag.description,
                "color": tag.color,
                "created_at": tag.created_at.isoformat() if tag.created_at else None,
            }
            tags_data.append(tag_dict)

        with open(backup_dir / "tags.json", "w", encoding="utf-8") as f:
            json.dump(tags_data, f, ensure_ascii=False, indent=2)

        # 备份提示词数据
        prompts = session.exec(select(Prompt)).all()
        prompts_data = []
        for prompt in prompts:
            prompt_dict = {
                "id": str(prompt.id),
                "name": prompt.name,
                "description": prompt.description,
                "content": prompt.content,
                "type": prompt.type,
                "input_vars": prompt.input_vars,
                "visibility": prompt.visibility,
                "meta_data": prompt.meta_data,
                "version": prompt.version,
                "team_id": str(prompt.team_id) if prompt.team_id else None,
                "created_by": str(prompt.created_by),
                "created_at": prompt.created_at.isoformat()
                if prompt.created_at
                else None,
                "updated_at": prompt.updated_at.isoformat()
                if prompt.updated_at
                else None,
                "tags": [tag.name for tag in prompt.tags] if prompt.tags else [],
            }
            prompts_data.append(prompt_dict)

        with open(backup_dir / "prompts.json", "w", encoding="utf-8") as f:
            json.dump(prompts_data, f, ensure_ascii=False, indent=2)

        # 备份提示词版本数据
        versions = session.exec(select(PromptVersion)).all()
        versions_data = []
        for version in versions:
            version_dict = {
                "id": str(version.id),
                "prompt_id": str(version.prompt_id),
                "version": version.version,
                "content": version.content,
                "input_vars": version.input_vars,
                "created_by": str(version.created_by),
                "created_at": version.created_at.isoformat()
                if version.created_at
                else None,
                "change_notes": version.change_notes,
            }
            versions_data.append(version_dict)

        with open(backup_dir / "prompt_versions.json", "w", encoding="utf-8") as f:
            json.dump(versions_data, f, ensure_ascii=False, indent=2)

        # 创建备份信息文件
        backup_info = {
            "backup_time": datetime.now().isoformat(),
            "total_users": len(users_data),
            "total_tags": len(tags_data),
            "total_prompts": len(prompts_data),
            "total_versions": len(versions_data),
        }

        with open(backup_dir / "backup_info.json", "w", encoding="utf-8") as f:
            json.dump(backup_info, f, ensure_ascii=False, indent=2)

        logger.info(f"✅ 数据备份完成！备份位置: {backup_dir}")
        logger.info(
            f"📊 备份统计: {backup_info['total_users']} 用户, {backup_info['total_tags']} 标签, {backup_info['total_prompts']} 提示词, {backup_info['total_versions']} 版本"
        )

        return True

    except Exception as e:
        logger.error(f"❌ 备份失败: {e}")
        return False


def clear_data(session: Session) -> bool:
    """清空现有数据"""
    try:
        logger.info("🗑️  开始清空现有数据...")

        # 按照外键依赖关系的顺序删除数据
        # 1. 删除提示词版本
        session.exec(select(PromptVersion)).all()
        for version in session.exec(select(PromptVersion)).all():
            session.delete(version)

        # 2. 删除提示词（会自动删除关联的标签关系）
        for prompt in session.exec(select(Prompt)).all():
            session.delete(prompt)

        # 3. 删除标签
        for tag in session.exec(select(Tag)).all():
            session.delete(tag)

        # 4. 删除用户
        for user in session.exec(select(User)).all():
            session.delete(user)

        session.commit()
        logger.info("✅ 现有数据清空完成")
        return True

    except Exception as e:
        logger.error(f"❌ 清空数据失败: {e}")
        session.rollback()
        return False


def confirm_action() -> bool:
    """确认用户操作"""
    print("\n" + "=" * 60)
    print("⚠️  警告：此操作将会：")
    print("1. 备份当前所有数据到用户主目录的 nexus_backups 文件夹")
    print("2. 清空数据库中的所有用户、标签、提示词数据")
    print("3. 重新初始化默认的管理员账户和基础提示词")
    print("=" * 60)

    while True:
        response = (
            input("\n是否继续？请输入 'yes' 确认，或 'no' 取消: ").strip().lower()
        )
        if response in ["yes", "y"]:
            return True
        elif response in ["no", "n"]:
            return False
        else:
            print("请输入 'yes' 或 'no'")


def main() -> None:
    """主函数"""
    logger.info("🔄 数据备份和重新初始化工具")

    # 确认操作
    if not confirm_action():
        logger.info("❌ 操作已取消")
        return

    try:
        with Session(engine) as session:
            # 创建备份目录
            backup_dir = create_backup_directory()

            # 备份数据
            if not backup_data(session, backup_dir):
                logger.error("❌ 备份失败，操作终止")
                return

            # 清空数据
            if not clear_data(session):
                logger.error("❌ 清空数据失败，操作终止")
                return

        # 重新初始化数据
        logger.info("🌱 开始重新初始化数据...")
        with Session(engine) as session:
            init_db(session)

        logger.info("✅ 数据重新初始化完成！")
        logger.info(f"📁 备份文件位置: {backup_dir}")

    except Exception as e:
        logger.error(f"❌ 操作失败: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
