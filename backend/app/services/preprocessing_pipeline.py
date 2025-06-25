"""
预处理流水线服务
实现从输入到输出的完整6层预处理架构：
输入层 → 解析层 → 智能分段层 → AI初始化层 → 存储层 → 输出层
"""

import asyncio
import logging
import re
import uuid
from dataclasses import asdict, dataclass
from datetime import datetime
from enum import Enum
from typing import Any

from sqlmodel import Session

from app.models.content import AIResult, ContentItem, Segment
from app.services.ai.chat_service import ChatService

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
    """预处理管道：多层次内容处理架构"""

    def __init__(self, chat_service: ChatService):
        self.chat_service = chat_service

    async def process_content(
        self,
        content: str,
        metadata: DocumentMetadata,
        user_preferences: dict[str, Any] | None = None,
        content_item_id: uuid.UUID | None = None,
    ) -> PreprocessingResult:
        """
        主要处理流程：
        1. 输入层：内容清理和验证
        2. 解析层：格式转换和结构化
        3. 分段层：智能分段处理
        4. AI初始化层：生成摘要、要点、标签
        5. 存储层：持久化到数据库
        6. 输出层：格式化结果
        """
        start_time = datetime.now()
        errors: list[str] = []
        processing_stats = {}

        try:
            content_id = (
                str(content_item_id) if content_item_id else self._generate_content_id()
            )
            logger.info(f"开始处理内容: {content_id}")

            # 1. 输入层
            clean_content, input_stats = await self._input_layer(content, metadata)
            processing_stats["input_layer"] = input_stats

            # 2. 解析层
            markdown_content, parsing_stats = await self._parsing_layer(
                clean_content, metadata
            )
            processing_stats["parsing_layer"] = parsing_stats

            # 3. 分段层
            segments, segmentation_stats = await self._segmentation_layer(
                markdown_content, metadata
            )
            processing_stats["segmentation_layer"] = segmentation_stats

            # 4. AI初始化层
            ai_results, ai_stats = await self._ai_initialization_layer(
                markdown_content, metadata, user_preferences
            )
            processing_stats["ai_layer"] = ai_stats

            # 5. 存储层
            storage_stats = await self._storage_layer(
                content_id, markdown_content, segments, ai_results, metadata
            )
            processing_stats["storage_layer"] = storage_stats

            # 6. 输出层
            return await self._output_layer(
                content_id,
                markdown_content,
                segments,
                ai_results,
                metadata,
                start_time,
                errors,
                processing_stats,
            )

        except Exception as e:
            logger.error(f"处理失败: {str(e)}")
            errors.append(str(e))

            # 返回部分结果
            return PreprocessingResult(
                content_id=self._generate_content_id(),
                status=ProcessingStatus.FAILED,
                processed_at=datetime.now(),
                markdown_content=content,
                segments=[],
                summary={},
                key_points={},
                labels=[],
                reading_time_minutes=0,
                difficulty_level="unknown",
                content_quality_score=0.0,
                metadata=metadata,
                processing_stats=processing_stats,
                errors=errors,
            )

    async def _input_layer(
        self, content: str, metadata: DocumentMetadata
    ) -> tuple[str, dict[str, Any]]:
        """输入层：内容清理和验证"""
        logger.debug("执行输入层处理")

        start_time = datetime.now()

        # 内容清理
        clean_content = self._normalize_content(content)

        # 基础验证
        if not clean_content.strip():
            raise ValueError("内容为空")

        # 更新元数据
        metadata.estimated_words = self._estimate_word_count(clean_content)

        processing_time = (datetime.now() - start_time).total_seconds()

        return clean_content, {
            "content_length": len(clean_content),
            "estimated_words": metadata.estimated_words,
            "processing_time": processing_time,
        }

    async def _parsing_layer(
        self, content: str, metadata: DocumentMetadata
    ) -> tuple[str, dict[str, Any]]:
        """解析层：格式转换和结构化"""
        logger.debug("执行解析层处理")

        start_time = datetime.now()

        # 这里可以根据内容类型进行不同的解析
        # 目前简化处理，直接返回清理后的内容
        markdown_content = content

        # 未来可以添加：
        # - HTML to Markdown 转换
        # - PDF 文本提取优化
        # - 结构化数据提取

        processing_time = (datetime.now() - start_time).total_seconds()

        return markdown_content, {
            "format_detected": "markdown",
            "structure_elements": [],
            "processing_time": processing_time,
        }

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
            # 简单分段逻辑（按段落分割）
            paragraphs = content.split("\n\n")
            segments = []
            for i, para in enumerate(paragraphs):
                if para.strip():
                    segments.append(
                        {
                            "id": f"segment_{i + 1}",
                            "content": para.strip(),
                            "order": i + 1,
                            "type": "paragraph",
                            "word_count": self._estimate_word_count(para),
                        }
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

        summary, key_points, labels_result, content_analysis = await asyncio.gather(
            *tasks
        )

        # labels_result 现在包含: {optimized_title, brief_description, tags, score, reading_time_minutes}
        optimized_title = labels_result.get("optimized_title")
        brief_description = labels_result.get("brief_description")
        tag_score = labels_result.get("score")
        reading_time_minutes = labels_result.get("reading_time_minutes")

        # 合并标签得分和阅读时间到内容分析
        if tag_score is not None:
            content_analysis["tagging_score"] = tag_score
        if reading_time_minutes is not None:
            content_analysis["reading_time_minutes"] = reading_time_minutes

        processing_time = (datetime.now() - start_time).total_seconds()

        ai_results = {
            "optimized_title": optimized_title,
            "brief_description": brief_description,
            "summary": summary,
            "key_points": key_points,
            "labels": labels_result.get("tags", []),
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
        storage_stats = {"segments_saved": 0, "ai_result_saved": False}

        try:
            # 获取数据库会话
            from app.core.db_factory import engine

            with Session(engine) as session:
                # 1. 检查ContentItem是否存在
                content_item = session.get(ContentItem, content_id)
                if not content_item:
                    logger.warning(f"ContentItem {content_id} 不存在，跳过存储")
                    return storage_stats

                # 2. 保存segments
                for i, segment_data in enumerate(segments):
                    segment = Segment(
                        content_item_id=uuid.UUID(content_id),
                        segment_index=i,
                        content=segment_data["content"],
                        segment_type=segment_data.get("type", "paragraph"),
                        word_count=segment_data.get("word_count", 0),
                        char_count=len(segment_data["content"]),
                        meta_info=segment_data.get("metadata"),
                    )
                    session.add(segment)
                    storage_stats["segments_saved"] += 1

                # 3. 保存AI结果
                try:
                    ai_result = AIResult(
                        content_item_id=uuid.UUID(content_id),
                        summary=ai_results.get("summary"),
                        key_points=ai_results.get("key_points"),
                        labels=ai_results.get("labels"),
                        content_analysis=ai_results.get("content_analysis"),
                        reading_time_minutes=ai_results.get("reading_time_minutes"),
                        difficulty_level=ai_results.get("difficulty_level"),
                        content_quality_score=ai_results.get("content_quality_score"),
                    )
                    session.add(ai_result)
                    storage_stats["ai_result_saved"] = True
                except Exception as e:
                    logger.error(f"保存AI结果失败: {str(e)}")

                # 4. 更新ContentItem状态
                content_item.processing_status = "completed"
                content_item.error_message = None
                content_item.last_processed_at = datetime.utcnow()
                session.add(content_item)

                session.commit()

        except Exception as e:
            logger.error(f"存储层处理失败: {str(e)}")
            # 更新ContentItem为失败状态
            try:
                with Session(engine) as session:
                    content_item = session.get(ContentItem, content_id)
                    if content_item:
                        content_item.processing_status = "failed"
                        content_item.error_message = str(e)
                        content_item.last_processed_at = datetime.utcnow()
                        session.add(content_item)
                        session.commit()
            except Exception as job_error:
                logger.error(f"更新ContentItem失败状态时出错: {str(job_error)}")

        processing_time = (datetime.now() - start_time).total_seconds()
        storage_stats["processing_time"] = int(processing_time)

        return storage_stats

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

        # 估算阅读时间 - 优先使用 LLM 生成的时间，否则回退到算法估算
        ai_reading_time = ai_results.get("reading_time_minutes")
        if (
            ai_reading_time is not None
            and isinstance(ai_reading_time, int)
            and ai_reading_time > 0
        ):
            reading_time = ai_reading_time
        else:
            # 回退到算法估算（每分钟200词）
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

    async def _generate_labels(self, context: dict[str, Any]) -> dict[str, Any]:
        """使用 labels.j2 模板生成标签、评分、阅读时间、优化标题和简短描述"""
        try:
            response = await self.chat_service.generate_with_template(
                template_name="labels.j2", context=context
            )

            # 新的labels.j2模板输出完整结构：
            # {'optimized_title': str, 'brief_description': str, 'tags': [...], 'score': float, 'reading_time_minutes': int}
            optimized_title = response.get("optimized_title", None)
            brief_description = response.get("brief_description", None)
            tags = response.get("tags", [])
            score = response.get("score", None)
            reading_time_minutes = response.get("reading_time_minutes", None)

            # 对输出进行基础校验
            if not isinstance(tags, list):
                tags = []
            if score is not None and not isinstance(score, int | float):
                score = None
            if reading_time_minutes is not None and not isinstance(
                reading_time_minutes, int
            ):
                reading_time_minutes = None

            return {
                "optimized_title": optimized_title,
                "brief_description": brief_description,
                "tags": tags[:20],
                "score": score,
                "reading_time_minutes": reading_time_minutes,
            }
        except Exception as e:
            logger.error(f"生成标签失败: {str(e)}")
            return {
                "optimized_title": None,
                "brief_description": None,
                "tags": [],
                "score": None,
                "reading_time_minutes": None,
            }

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
        return f"content_{uuid.uuid4().hex[:12]}"
