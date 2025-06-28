"""
标签管理工具类
用于处理预设标签加载、标签创建和去重等功能
"""

import json
import logging
from pathlib import Path
from typing import Any

from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from app.models.prompt import Tag, TagCreate

logger = logging.getLogger(__name__)


class TagManager:
    """标签管理类"""

    def __init__(self):
        self._preset_tags: list[dict[str, Any]] | None = None

    def get_preset_tags_file_path(self) -> Path:
        """获取预设标签文件路径"""
        current_dir = Path(__file__).parent.parent
        return current_dir / "prompt_templates" / "preset_tags.json"

    def load_preset_tags(self) -> list[dict[str, Any]]:
        """加载预设标签列表"""
        if self._preset_tags is not None:
            return self._preset_tags

        preset_file = self.get_preset_tags_file_path()

        if not preset_file.exists():
            logger.warning(f"预设标签文件不存在: {preset_file}")
            self._preset_tags = []
            return self._preset_tags

        try:
            with open(preset_file, encoding="utf-8") as f:
                self._preset_tags = json.load(f)
            logger.info(f"成功加载 {len(self._preset_tags)} 个预设标签")
            return self._preset_tags
        except Exception as e:
            logger.error(f"加载预设标签文件失败: {e}")
            self._preset_tags = []
            return self._preset_tags

    def get_preset_tag_names(self) -> list[str]:
        """获取所有预设标签的名称列表"""
        preset_tags = self.load_preset_tags()
        return [tag["name"] for tag in preset_tags]

    def get_preset_tag_by_name(self, name: str) -> dict[str, Any] | None:
        """根据名称获取预设标签配置"""
        preset_tags = self.load_preset_tags()
        for tag in preset_tags:
            if tag["name"] == name or tag.get("name_en") == name:
                return tag
        return None

    def get_or_create_tag(self, session: Session, tag_name: str) -> Tag:
        """
        获取或创建标签，确保数据库中标签名称唯一，支持并发安全

        Args:
            session: 数据库会话
            tag_name: 标签名称

        Returns:
            Tag: 数据库中的标签对象
        """
        # 先查找是否已存在
        existing_tag = session.exec(select(Tag).where(Tag.name == tag_name)).first()

        if existing_tag:
            logger.debug(f"使用已存在的标签: {tag_name}")
            return existing_tag

        # 检查是否是预设标签
        preset_tag_config = self.get_preset_tag_by_name(tag_name)

        if preset_tag_config:
            # 使用预设配置创建标签
            tag_create = TagCreate(
                name=preset_tag_config["name"],
                description=preset_tag_config.get("description"),
                color=preset_tag_config.get("color", "#3B82F6"),
            )
            logger.info(f"根据预设配置创建标签: {tag_name}")
        else:
            # 创建基本标签
            tag_create = TagCreate(
                name=tag_name,
                description=f"自动生成的标签: {tag_name}",
                color="#6B7280",  # 默认灰色
            )
            logger.info(f"创建新标签: {tag_name}")

        # 创建标签，处理并发情况下的唯一性约束冲突
        try:
            new_tag = Tag(**tag_create.model_dump())
            session.add(new_tag)
            session.flush()  # 获取ID但不提交
            logger.debug(f"成功创建标签: {tag_name} (ID: {new_tag.id})")
            return new_tag
        except IntegrityError as e:
            # 并发情况下，可能在查询和创建之间另一个线程已经创建了相同名称的标签
            logger.info(f"标签创建时发生唯一性约束冲突，重新查询: {tag_name}")
            session.rollback()

            # 重新查询一次，确保获取到已存在的标签
            existing_tag = session.exec(select(Tag).where(Tag.name == tag_name)).first()

            if existing_tag:
                logger.debug(f"并发冲突后找到已存在标签: {tag_name}")
                return existing_tag
            else:
                # 如果仍然找不到，说明是其他类型的数据库错误
                logger.error(
                    f"标签创建失败，且无法找到已存在标签: {tag_name}, 错误: {e}"
                )
                raise e

    def get_or_create_tags_batch(
        self, session: Session, tag_names: list[str]
    ) -> list[Tag]:
        """
        批量获取或创建标签

        Args:
            session: 数据库会话
            tag_names: 标签名称列表

        Returns:
            List[Tag]: 标签对象列表
        """
        tags = []
        for tag_name in tag_names:
            if tag_name.strip():  # 跳过空标签
                try:
                    tag = self.get_or_create_tag(session, tag_name.strip())
                    tags.append(tag)
                except Exception as e:
                    logger.error(f"批量处理标签时失败: {tag_name}, 错误: {e}")
                    # 继续处理其他标签，不因为一个标签失败而终止整个批处理
                    continue
        return tags

    def filter_and_match_preset_tags(self, ai_generated_tags: list[str]) -> list[str]:
        """
        过滤和匹配AI生成的标签到预设标签

        Args:
            ai_generated_tags: AI生成的标签列表

        Returns:
            List[str]: 匹配后的标签列表（优先使用预设标签）
        """
        preset_tags = self.load_preset_tags()
        preset_names = {tag["name"] for tag in preset_tags}
        preset_names_en = {
            tag.get("name_en", "") for tag in preset_tags if tag.get("name_en")
        }

        matched_tags = []

        for ai_tag in ai_generated_tags:
            ai_tag = ai_tag.strip()
            if not ai_tag:
                continue

            # 直接匹配中文名称
            if ai_tag in preset_names:
                matched_tags.append(ai_tag)
                continue

            # 匹配英文名称，转换为中文
            if ai_tag in preset_names_en:
                for preset_tag in preset_tags:
                    if preset_tag.get("name_en") == ai_tag:
                        matched_tags.append(preset_tag["name"])
                        break
                continue

            # 模糊匹配（包含关系）
            found_match = False
            for preset_tag in preset_tags:
                preset_name = preset_tag["name"]
                preset_name_en = preset_tag.get("name_en", "")

                # 检查AI标签是否包含在预设标签中
                if (
                    ai_tag in preset_name
                    or preset_name in ai_tag
                    or (
                        preset_name_en
                        and (ai_tag in preset_name_en or preset_name_en in ai_tag)
                    )
                ):
                    matched_tags.append(preset_name)
                    found_match = True
                    break

            # 如果没有找到匹配，保留原标签（但会在创建时标记为非预设）
            if not found_match:
                matched_tags.append(ai_tag)

        # 去重并保持顺序
        seen = set()
        unique_tags = []
        for tag in matched_tags:
            if tag not in seen:
                seen.add(tag)
                unique_tags.append(tag)

        logger.info(f"标签匹配结果: {ai_generated_tags} -> {unique_tags}")
        return unique_tags

    def get_categories(self) -> list[str]:
        """获取所有标签分类"""
        preset_tags = self.load_preset_tags()
        categories = list({tag.get("category", "other") for tag in preset_tags})
        return sorted(categories)

    def get_tags_by_category(self, category: str) -> list[dict[str, Any]]:
        """根据分类获取标签"""
        preset_tags = self.load_preset_tags()
        return [tag for tag in preset_tags if tag.get("category") == category]

    def sync_preset_tags_to_database(self, session: Session) -> int:
        """
        将预设标签同步到数据库，确保并发安全

        Returns:
            int: 新创建的标签数量
        """
        preset_tags = self.load_preset_tags()
        created_count = 0

        for preset_tag in preset_tags:
            try:
                existing = session.exec(
                    select(Tag).where(Tag.name == preset_tag["name"])
                ).first()

                if not existing:
                    tag_create = TagCreate(
                        name=preset_tag["name"],
                        description=preset_tag.get("description"),
                        color=preset_tag.get("color", "#3B82F6"),
                    )

                    try:
                        new_tag = Tag(**tag_create.model_dump())
                        session.add(new_tag)
                        session.flush()  # 检查约束但不提交
                        created_count += 1
                        logger.info(f"同步预设标签到数据库: {preset_tag['name']}")
                    except IntegrityError:
                        # 并发情况下，另一个进程可能已经创建了该标签
                        logger.info(f"预设标签 {preset_tag['name']} 已存在（并发创建）")
                        session.rollback()
                        continue
            except Exception as e:
                logger.error(f"同步预设标签失败: {preset_tag['name']}, 错误: {e}")
                continue

        if created_count > 0:
            try:
                session.commit()
                logger.info(f"成功同步 {created_count} 个预设标签到数据库")
            except Exception as e:
                logger.error(f"提交预设标签同步时失败: {e}")
                session.rollback()
                return 0

        return created_count


# 全局标签管理器实例
tag_manager = TagManager()
