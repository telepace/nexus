#!/usr/bin/env python3
"""
修复重复的Segment记录

注意：此脚本已更新以适应移除ProcessingJob表后的新架构
"""

import logging
import uuid

from sqlmodel import Session, create_engine, func, select

from app.core.config import settings
from app.models.content import Segment

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def find_duplicate_segments(session: Session) -> list[tuple[uuid.UUID, int]]:
    """查找有重复segment_index的内容项"""
    # 查找同一个content_item_id下有重复segment_index的记录
    stmt = (
        select(Segment.content_item_id, Segment.segment_index, func.count())
        .group_by(Segment.content_item_id, Segment.segment_index)
        .having(func.count() > 1)
    )

    results = session.exec(stmt).all()
    duplicates = [(content_id, index) for content_id, index, count in results]

    logger.info(f"发现 {len(duplicates)} 组重复的segment")
    return duplicates


def fix_duplicate_segments_for_content(session: Session, content_id: uuid.UUID) -> bool:
    """修复指定内容项的重复segment"""
    # 获取所有segment，按创建时间排序
    stmt = (
        select(Segment)
        .where(Segment.content_item_id == content_id)
        .order_by(Segment.segment_index, Segment.created_at)
    )

    segments = session.exec(stmt).all()

    if not segments:
        logger.warning(f"内容 {content_id} 没有segment")
        return False

    # 按segment_index分组
    segments_by_index = {}
    for segment in segments:
        index = segment.segment_index
        if index not in segments_by_index:
            segments_by_index[index] = []
        segments_by_index[index].append(segment)

    # 找出重复的segment_index
    duplicates_found = False
    for index, segment_list in segments_by_index.items():
        if len(segment_list) > 1:
            duplicates_found = True
            logger.info(
                f"内容 {content_id} 的 segment_index {index} 有 {len(segment_list)} 个重复"
            )

            # 保留第一个（最早创建的），删除其他的
            to_keep = segment_list[0]
            to_delete = segment_list[1:]

            logger.info(f"保留 segment {to_keep.id}，删除 {len(to_delete)} 个重复")

            for segment in to_delete:
                session.delete(segment)

    if duplicates_found:
        session.commit()
        logger.info(f"修复了内容 {content_id} 的重复segment")
        return True
    else:
        logger.info(f"内容 {content_id} 没有重复segment")
        return False


def reindex_segments(session: Session, content_id: uuid.UUID) -> bool:
    """重新索引segment，确保索引连续"""
    # 获取所有segment，按当前索引排序
    stmt = (
        select(Segment)
        .where(Segment.content_item_id == content_id)
        .order_by(Segment.segment_index, Segment.created_at)
    )

    segments = session.exec(stmt).all()

    if not segments:
        return False

    # 重新分配连续的索引
    reindexed = False
    for i, segment in enumerate(segments):
        if segment.segment_index != i:
            logger.info(
                f"重新索引 segment {segment.id}: {segment.segment_index} -> {i}"
            )
            segment.segment_index = i
            session.add(segment)
            reindexed = True

    if reindexed:
        session.commit()
        logger.info(f"重新索引了内容 {content_id} 的segment")
        return True
    else:
        logger.info(f"内容 {content_id} 的segment索引已是连续的")
        return False


def main():
    """主函数"""
    engine = create_engine(str(settings.SQLALCHEMY_DATABASE_URI))

    with Session(engine) as session:
        logger.info("开始查找重复的segment...")

        # 查找所有有重复segment的内容项
        duplicates = find_duplicate_segments(session)

        if not duplicates:
            logger.info("没有发现重复的segment")
            return

        # 获取唯一的内容项ID
        unique_content_ids = list({content_id for content_id, _ in duplicates})
        logger.info(f"需要修复的内容项: {len(unique_content_ids)}")

        # 逐个修复
        for content_id in unique_content_ids:
            logger.info(f"\n处理内容项: {content_id}")

            # 修复重复segment
            fixed = fix_duplicate_segments_for_content(session, content_id)

            # 重新索引
            reindexed = reindex_segments(session, content_id)

            if fixed or reindexed:
                logger.info(f"内容项 {content_id} 修复完成")
            else:
                logger.info(f"内容项 {content_id} 无需修复")

        logger.info("\n所有重复segment修复完成")


if __name__ == "__main__":
    main()
