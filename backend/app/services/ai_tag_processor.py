"""
AI标签处理服务
处理AI分析结果中的标签创建和关联，确保标签唯一性
"""

import logging
from typing import List, Dict, Any

from sqlmodel import Session

from app.models.prompt import Tag
from app.models.project import ContentItemTag
from app.utils.tag_manager import tag_manager

logger = logging.getLogger(__name__)


class AITagProcessor:
    """AI标签处理服务"""

    def __init__(self):
        self.tag_manager = tag_manager

    def process_and_create_tags_from_ai_result(
        self, 
        session: Session, 
        ai_result: Dict[str, Any], 
        content_item_id: str = None
    ) -> List[Tag]:
        """
        从AI分析结果中处理标签，创建数据库标签记录
        
        Args:
            session: 数据库会话
            ai_result: AI分析结果字典
            content_item_id: 内容项ID（可选，用于关联ContentItemTag）
        
        Returns:
            List[Tag]: 创建或获取到的标签列表
        """
        logger.info(f"🏷️ 开始处理AI标签结果，内容ID: {content_item_id}")
        
        # 提取标签列表
        tag_names = self._extract_tags_from_ai_result(ai_result)
        
        if not tag_names:
            logger.warning(f"⚠️ AI结果中未发现标签信息，内容ID: {content_item_id}")
            return []

        logger.info(f"🔍 从AI结果中提取到 {len(tag_names)} 个原始标签: {tag_names}")

        # 过滤和匹配预设标签
        matched_tag_names = self.tag_manager.filter_and_match_preset_tags(tag_names)
        logger.info(f"✅ 匹配预设标签后得到 {len(matched_tag_names)} 个标签: {matched_tag_names}")
        
        # 批量获取或创建标签
        tags = self.tag_manager.get_or_create_tags_batch(session, matched_tag_names)
        logger.info(f"📦 批量处理标签完成，实际创建/获取了 {len(tags)} 个标签对象")
        
        # 如果提供了content_item_id，创建关联关系
        if content_item_id and tags:
            associations_created = self._create_content_item_tag_associations(
                session, content_item_id, tags, ai_result
            )
            logger.info(f"🔗 创建了 {associations_created} 个内容-标签关联")
        
        logger.info(f"✅ 标签处理完成: 成功处理 {len(tags)} 个标签 [{', '.join([tag.name for tag in tags])}]")
        return tags

    def _extract_tags_from_ai_result(self, ai_result: Dict[str, Any]) -> List[str]:
        """
        从AI分析结果中提取标签列表
        
        Args:
            ai_result: AI分析结果字典
            
        Returns:
            List[str]: 标签名称列表
        """
        tag_names = []
        
        # 尝试从不同可能的字段中提取标签
        possible_tag_fields = ["tags", "labels", "tag_list"]
        
        for field in possible_tag_fields:
            if field in ai_result:
                tags_data = ai_result[field]
                
                if isinstance(tags_data, list):
                    # 直接是标签列表
                    tag_names.extend([str(tag).strip() for tag in tags_data if tag])
                elif isinstance(tags_data, dict):
                    # 可能是复杂的标签对象
                    if "tags" in tags_data:
                        if isinstance(tags_data["tags"], list):
                            tag_names.extend([str(tag).strip() for tag in tags_data["tags"] if tag])
                elif isinstance(tags_data, str):
                    # 可能是逗号分隔的字符串
                    tag_names.extend([tag.strip() for tag in tags_data.split(",") if tag.strip()])
                
                # 找到标签后就跳出循环
                if tag_names:
                    break
        
        # 去重并过滤空标签
        unique_tags = list(set([tag for tag in tag_names if tag.strip()]))
        
        logger.debug(f"从AI结果中提取到标签: {unique_tags}")
        return unique_tags

    def _create_content_item_tag_associations(
        self, 
        session: Session, 
        content_item_id: str, 
        tags: List[Tag], 
        ai_result: Dict[str, Any] = None
    ) -> int:
        """
        创建内容项与标签的关联关系
        
        Args:
            session: 数据库会话
            content_item_id: 内容项ID
            tags: 标签列表
            ai_result: AI分析结果（可选，用于提取置信度等信息）
        
        Returns:
            int: 创建的关联数量
        """
        import uuid
        from app.models.project import ContentItemTag
        
        associations_created = 0
        
        for tag in tags:
            try:
                # 检查是否已存在关联
                existing = session.query(ContentItemTag).filter_by(
                    content_item_id=uuid.UUID(content_item_id),
                    tag_id=tag.id
                ).first()
                
                if not existing:
                    # 创建新的关联
                    association = ContentItemTag(
                        content_item_id=uuid.UUID(content_item_id),
                        tag_id=tag.id,
                        # 可以从ai_result中提取置信度等信息
                        confidence_score=ai_result.get("score") if ai_result else None
                    )
                    session.add(association)
                    associations_created += 1
                    logger.debug(f"🔗 创建内容-标签关联: {content_item_id} <-> {tag.name}")
                else:
                    logger.debug(f"⚠️ 内容-标签关联已存在: {content_item_id} <-> {tag.name}")
                    
            except Exception as e:
                logger.error(f"❌ 创建内容-标签关联失败: {content_item_id} <-> {tag.name}, 错误: {str(e)}")
        
        # 提交更改
        try:
            session.commit()
            if associations_created > 0:
                logger.info(f"✅ 成功创建 {associations_created} 个内容-标签关联")
        except Exception as e:
            logger.error(f"❌ 提交内容-标签关联失败: {str(e)}")
            session.rollback()
            associations_created = 0
            
        return associations_created

    def _extract_relevance_score(self, ai_result: Dict[str, Any]) -> float:
        """
        从AI结果中提取相关性分数
        
        Args:
            ai_result: AI分析结果
            
        Returns:
            float: 相关性分数 (0.0-1.0)
        """
        # 尝试从质量分数转换
        if "score" in ai_result:
            score = ai_result["score"]
            if isinstance(score, (int, float)):
                # 假设score是0-5的范围，转换为0-1
                return min(1.0, max(0.0, float(score) / 5.0))
        
        # 如果有明确的相关性分数字段
        if "relevance_score" in ai_result:
            relevance = ai_result["relevance_score"]
            if isinstance(relevance, (int, float)):
                return min(1.0, max(0.0, float(relevance)))
        
        # 默认返回中等相关性
        return 0.8

    def sync_preset_tags_to_database(self, session: Session) -> int:
        """
        将预设标签同步到数据库
        
        Args:
            session: 数据库会话
            
        Returns:
            int: 新创建的标签数量
        """
        return self.tag_manager.sync_preset_tags_to_database(session)

    def get_preset_tag_categories(self) -> List[str]:
        """获取预设标签的所有分类"""
        return self.tag_manager.get_categories()

    def get_preset_tags_by_category(self, category: str) -> List[Dict[str, Any]]:
        """根据分类获取预设标签"""
        return self.tag_manager.get_tags_by_category(category)


# 全局AI标签处理器实例
ai_tag_processor = AITagProcessor() 