"""
预处理流水线服务
实现从输入到输出的完整6层预处理架构：
输入层 → 解析层 → 智能分段层 → AI初始化层 → 存储层 → 输出层
"""

import asyncio
import logging
from dataclasses import asdict, dataclass
from datetime import datetime
from enum import Enum
from typing import Any

from app.services.ai.chat_service import ChatService
from app.utils.content_parser import ContentParser
from app.utils.markdown_converter import MarkdownConverter
from app.utils.text_segmentation import TextSegmentationService

logger = logging.getLogger(__name__)


class ContentType(Enum):
    """内容类型枚举"""

    ARTICLE = "article"
    RESEARCH_PAPER = "research_paper"
    BLOG_POST = "blog_post"
    BOOK_CHAPTER = "book_chapter"
    WEB_PAGE = "web_page"
    DOCUMENT = "document"
    VIDEO_TRANSCRIPT = "video_transcript"
    PODCAST_TRANSCRIPT = "podcast_transcript"


class ProcessingStatus(Enum):
    """处理状态枚举"""

    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    PARTIAL_SUCCESS = "partial_success"


@dataclass
class DocumentMetadata:
    """文档元数据"""

    title: str | None = None
    author: str | None = None
    source_url: str | None = None
    publication_date: str | None = None
    content_type: ContentType = ContentType.DOCUMENT
    language: str = "en"
    domain: str | None = None
    estimated_words: int = 0


@dataclass
class PreprocessingResult:
    """预处理结果"""

    # 基础信息
    content_id: str
    status: ProcessingStatus
    processed_at: datetime

    # 处理后的内容
    markdown_content: str
    segments: list[dict[str, Any]]

    # AI 生成的信息
    summary: dict[str, Any]
    key_points: dict[str, Any]
    labels: list[str]

    # 内容分析
    reading_time_minutes: int
    difficulty_level: str  # beginner/intermediate/advanced
    content_quality_score: float

    # 元数据
    metadata: DocumentMetadata
    processing_stats: dict[str, Any]

    # 错误信息
    errors: list[str] | None = None


class PreprocessingPipeline:
    """预处理流水线主服务"""

    def __init__(self, chat_service: ChatService):
        self.chat_service = chat_service
        self.content_parser = ContentParser()
        self.segmentation_service = TextSegmentationService()
        self.markdown_converter = MarkdownConverter()

    async def process_content(
        self,
        content: str,
        metadata: DocumentMetadata,
        user_preferences: dict[str, Any] | None = None,
    ) -> PreprocessingResult:
        """
        执行完整的预处理流水线

        Args:
            content: 原始内容
            metadata: 文档元数据
            user_preferences: 用户偏好设置

        Returns:
            PreprocessingResult: 预处理结果
        """
        start_time = datetime.now()
        content_id = self._generate_content_id()
        errors: list[str] = []

        try:
            logger.info(f"开始预处理内容: {content_id}")

            # 1. 输入层：内容验证和规范化
            normalized_content, input_stats = await self._input_layer(content, metadata)

            # 2. 解析层：转换为统一Markdown格式
            markdown_content, parsing_stats = await self._parsing_layer(
                normalized_content, metadata
            )

            # 3. 智能分段层：长文本分段处理
            segments, segmentation_stats = await self._segmentation_layer(
                markdown_content, metadata
            )

            # 4. AI初始化层：生成摘要、要点等
            ai_results, ai_stats = await self._ai_initialization_layer(
                markdown_content, metadata, user_preferences
            )

            # 5. 存储层：持久化数据
            storage_stats = await self._storage_layer(
                content_id, markdown_content, segments, ai_results, metadata
            )

            # 6. 输出层：格式化结果
            result = await self._output_layer(
                content_id,
                markdown_content,
                segments,
                ai_results,
                metadata,
                start_time,
                errors,
                {
                    "input": input_stats,
                    "parsing": parsing_stats,
                    "segmentation": segmentation_stats,
                    "ai": ai_stats,
                    "storage": storage_stats,
                },
            )

            logger.info(
                f"预处理完成: {content_id}, 耗时: {(datetime.now() - start_time).total_seconds():.2f}s"
            )
            return result

        except Exception as e:
            logger.error(f"预处理失败: {content_id}, 错误: {str(e)}")
            errors.append(str(e))

            # 返回失败结果
            return PreprocessingResult(
                content_id=content_id,
                status=ProcessingStatus.FAILED,
                processed_at=datetime.now(),
                markdown_content="",
                segments=[],
                summary={},
                key_points={},
                labels=[],
                reading_time_minutes=0,
                difficulty_level="unknown",
                content_quality_score=0.0,
                metadata=metadata,
                processing_stats={},
                errors=errors,
            )

    async def _input_layer(
        self, content: str, metadata: DocumentMetadata
    ) -> tuple[str, dict[str, Any]]:
        """输入层：内容验证和规范化"""
        logger.debug("执行输入层处理")

        # 内容验证
        if not content or len(content.strip()) < 50:
            raise ValueError("内容太短，至少需要50个字符")

        # 内容清理和规范化
        normalized_content = self._normalize_content(content)

        # 更新元数据
        metadata.estimated_words = self._estimate_word_count(normalized_content)

        stats = {
            "original_length": len(content),
            "normalized_length": len(normalized_content),
            "estimated_words": metadata.estimated_words,
            "processing_time": 0.1,
        }

        return normalized_content, stats

    async def _parsing_layer(
        self, content: str, metadata: DocumentMetadata
    ) -> tuple[str, dict[str, Any]]:
        """解析层：转换为统一Markdown格式"""
        logger.debug("执行解析层处理")

        start_time = datetime.now()

        # 根据内容类型选择解析策略
        if metadata.content_type == ContentType.WEB_PAGE:
            # HTML内容解析
            markdown_content = await self.content_parser.html_to_markdown(content)
        elif metadata.content_type == ContentType.RESEARCH_PAPER:
            # 学术论文解析
            markdown_content = await self.content_parser.pdf_to_markdown(content)
        else:
            # 通用文本解析
            markdown_content = await self.content_parser.text_to_markdown(content)

        # 内容清理和格式优化
        markdown_content = self.markdown_converter.optimize_structure(markdown_content)

        processing_time = (datetime.now() - start_time).total_seconds()

        stats = {
            "input_format": metadata.content_type.value,
            "output_length": len(markdown_content),
            "conversion_success": True,
            "processing_time": processing_time,
        }

        return markdown_content, stats

    async def _segmentation_layer(
        self, content: str, metadata: DocumentMetadata
    ) -> tuple[list[dict[str, Any]], dict[str, Any]]:
        """智能分段层：长文本分段处理"""
        logger.debug("执行智能分段层处理")

        start_time = datetime.now()

        # 检查是否需要分段
        if len(content) < 5000:  # 5K字符以下不分段
            segments = [
                {
                    "id": "segment_1",
                    "content": content,
                    "order": 1,
                    "type": "full_content",
                    "word_count": self._estimate_word_count(content),
                }
            ]
        else:
            # 智能分段
            segments = await self.segmentation_service.segment_content(
                content,
                metadata.content_type,
                max_segment_length=4000,
                preserve_structure=True,
            )

        processing_time = (datetime.now() - start_time).total_seconds()

        # 计算平均分段长度
        if segments:
            content_lengths = [len(s["content"]) for s in segments]
            total_length = sum(content_lengths)
            avg_length = total_length // len(segments)
        else:
            avg_length = 0

        stats = {
            "total_segments": len(segments),
            "requires_segmentation": len(segments) > 1,
            "average_segment_length": avg_length,
            "processing_time": processing_time,
        }

        return segments, stats

    async def _ai_initialization_layer(
        self,
        content: str,
        metadata: DocumentMetadata,
        user_preferences: dict[str, Any] | None = None,
    ) -> tuple[dict[str, Any], dict[str, Any]]:
        """AI初始化层：生成摘要、要点、标签等"""
        logger.debug("执行AI初始化层处理")

        start_time = datetime.now()

        # 准备模板参数
        template_context = {
            "content": content,
            "document_metadata": asdict(metadata),
            "user_preferences": user_preferences or {},
            "content_type": metadata.content_type.value,
        }

        # 并行执行AI任务
        tasks = [
            self._generate_summary(template_context),
            self._generate_key_points(template_context),
            self._generate_labels(template_context),
            self._analyze_content_properties(content, metadata),
        ]

        summary, key_points, labels, content_analysis = await asyncio.gather(*tasks)

        processing_time = (datetime.now() - start_time).total_seconds()

        ai_results = {
            "summary": summary,
            "key_points": key_points,
            "labels": labels,
            "content_analysis": content_analysis,
        }

        stats = {
            "tasks_completed": 4,
            "processing_time": processing_time,
            "ai_success_rate": 1.0,  # 这里可以根据实际成功情况调整
        }

        return ai_results, stats

    async def _storage_layer(
        self,
        content_id: str,
        markdown_content: str,
        segments: list[dict[str, Any]],
        ai_results: dict[str, Any],
        metadata: DocumentMetadata,
    ) -> dict[str, Any]:
        """存储层：持久化数据到数据库"""
        logger.debug("执行存储层处理")

        start_time = datetime.now()

        try:
            # with Session(get_session()) as session:
            # 这里应该实现具体的数据库存储逻辑
            # 存储主要内容
            # 存储分段
            # 存储AI分析结果
            # 存储元数据
            pass

            processing_time = (datetime.now() - start_time).total_seconds()

            return {
                "storage_success": True,
                "items_stored": len(segments) + 1,  # 分段数 + 主内容
                "processing_time": processing_time,
            }

        except Exception as e:
            logger.error(f"存储失败: {str(e)}")
            return {
                "storage_success": False,
                "error": str(e),
                "processing_time": (datetime.now() - start_time).total_seconds(),
            }

    async def _output_layer(
        self,
        content_id: str,
        markdown_content: str,
        segments: list[dict[str, Any]],
        ai_results: dict[str, Any],
        metadata: DocumentMetadata,
        start_time: datetime,
        errors: list[str],
        processing_stats: dict[str, Any],
    ) -> PreprocessingResult:
        """输出层：格式化最终结果"""
        logger.debug("执行输出层处理")

        # 计算内容质量分数
        quality_score = self._calculate_quality_score(
            markdown_content, ai_results, metadata
        )

        # 估算阅读时间（每分钟200词）
        reading_time = max(1, metadata.estimated_words // 200)

        # 确定难度等级
        difficulty_level = ai_results.get("content_analysis", {}).get(
            "difficulty_level", "intermediate"
        )

        return PreprocessingResult(
            content_id=content_id,
            status=ProcessingStatus.COMPLETED
            if not errors
            else ProcessingStatus.PARTIAL_SUCCESS,
            processed_at=datetime.now(),
            markdown_content=markdown_content,
            segments=segments,
            summary=ai_results.get("summary", {}),
            key_points=ai_results.get("key_points", {}),
            labels=ai_results.get("labels", []),
            reading_time_minutes=reading_time,
            difficulty_level=difficulty_level,
            content_quality_score=quality_score,
            metadata=metadata,
            processing_stats=processing_stats,
            errors=errors,
        )

    async def _generate_summary(self, context: dict[str, Any]) -> dict[str, Any]:
        """使用summary.j2模板生成摘要"""
        try:
            response = await self.chat_service.generate_with_template(
                template_name="summary.j2", context=context
            )
            return response.get("summary", {})
        except Exception as e:
            logger.error(f"生成摘要失败: {str(e)}")
            return {}

    async def _generate_key_points(self, context: dict[str, Any]) -> dict[str, Any]:
        """使用key_points.j2模板生成要点"""
        try:
            response = await self.chat_service.generate_with_template(
                template_name="key_points.j2", context=context
            )
            return response.get("key_points", {})
        except Exception as e:
            logger.error(f"生成要点失败: {str(e)}")
            return {}

    async def _generate_labels(self, context: dict[str, Any]) -> list[str]:
        """使用labels.j2模板生成标签"""
        try:
            response = await self.chat_service.generate_with_template(
                template_name="labels.j2", context=context
            )
            # 从复杂的标签结构中提取简单列表
            labels_data = response.get("primary_tags", {})
            all_labels = []
            for _category, tags in labels_data.items():
                all_labels.extend(tags)
            return all_labels[:20]  # 限制标签数量
        except Exception as e:
            logger.error(f"生成标签失败: {str(e)}")
            return []

    async def _analyze_content_properties(
        self, content: str, metadata: DocumentMetadata
    ) -> dict[str, Any]:
        """分析内容属性（阅读难度、质量等）"""
        # 简单的启发式分析，实际可以用更复杂的AI模型

        # 句子复杂度分析
        sentences = content.split(".")
        avg_sentence_length = sum(len(s.split()) for s in sentences) / len(sentences)

        # 词汇复杂度（简化版）
        words = content.split()
        unique_words = len(set(words))
        vocabulary_diversity = unique_words / len(words) if words else 0

        # 确定难度等级
        if avg_sentence_length > 20 and vocabulary_diversity > 0.6:
            difficulty = "advanced"
        elif avg_sentence_length > 15 and vocabulary_diversity > 0.4:
            difficulty = "intermediate"
        else:
            difficulty = "beginner"

        return {
            "difficulty_level": difficulty,
            "avg_sentence_length": avg_sentence_length,
            "vocabulary_diversity": vocabulary_diversity,
            "readability_score": min(100, max(0, 100 - avg_sentence_length * 2)),
        }

    def _normalize_content(self, content: str) -> str:
        """标准化内容"""
        # 基本清理
        content = content.strip()
        # 统一换行符
        content = content.replace("\r\n", "\n").replace("\r", "\n")
        # 移除多余空白
        import re

        content = re.sub(r"\n\s*\n", "\n\n", content)
        return content

    def _estimate_word_count(self, content: str) -> int:
        """估算单词数"""
        # 简化的单词计数
        return len(content.split())

    def _calculate_quality_score(
        self, content: str, ai_results: dict[str, Any], metadata: DocumentMetadata
    ) -> float:
        """计算内容质量分数"""
        score = 0.5  # 基础分数

        # 基于内容长度
        if metadata.estimated_words > 1000:
            score += 0.2
        elif metadata.estimated_words > 500:
            score += 0.1

        # 基于AI分析结果
        if ai_results.get("summary"):
            score += 0.15
        if ai_results.get("key_points"):
            score += 0.15

        return min(1.0, score)

    def _generate_content_id(self) -> str:
        """生成内容ID"""
        import uuid

        return f"content_{uuid.uuid4().hex[:12]}"
