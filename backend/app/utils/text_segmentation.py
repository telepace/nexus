"""
文本智能分段服务
根据内容类型和结构智能分段长文本，保持语义完整性
"""

import logging
import re
from enum import Enum
from typing import Any

logger = logging.getLogger(__name__)


class SegmentationType(Enum):
    """分段类型"""

    PARAGRAPH = "paragraph"  # 段落分段
    SECTION = "section"  # 章节分段
    SEMANTIC = "semantic"  # 语义分段
    LENGTH_BASED = "length_based"  # 基于长度分段


class TextSegmentationService:
    """文本智能分段服务"""

    def __init__(self):
        self.min_segment_length = 500  # 恢复原始值以匹配测试期望
        self.max_segment_length = 4000  # 最大分段长度
        self.overlap_length = 200  # 分段重叠长度

    async def segment_content(
        self,
        content: str,
        content_type: str,
        max_segment_length: int = 4000,
        preserve_structure: bool = True,
        segmentation_type: SegmentationType = SegmentationType.SEMANTIC,
    ) -> list[dict[str, Any]]:
        """
        智能分段内容

        Args:
            content: 要分段的内容
            content_type: 内容类型
            max_segment_length: 最大分段长度
            preserve_structure: 是否保持结构
            segmentation_type: 分段类型

        Returns:
            List[Dict[str, Any]]: 分段结果列表
        """
        self.max_segment_length = max_segment_length

        if len(content) <= max_segment_length:
            return self._create_single_segment(content)

        try:
            if segmentation_type == SegmentationType.SECTION:
                segments = await self._segment_by_sections(content)
            elif segmentation_type == SegmentationType.PARAGRAPH:
                segments = await self._segment_by_paragraphs(content)
            elif segmentation_type == SegmentationType.SEMANTIC:
                segments = await self._segment_by_semantics(content)
            else:
                segments = await self._segment_by_length(content)

            # 后处理：确保分段质量
            segments = self._post_process_segments(segments, preserve_structure)

            logger.info(f"文本分段完成: {len(segments)} 个分段")
            return segments

        except Exception as e:
            logger.error(f"文本分段失败: {str(e)}")
            # 回退到基于长度的分段
            return await self._segment_by_length(content)

    def _create_single_segment(self, content: str) -> list[dict[str, Any]]:
        """创建单个分段"""
        return [
            {
                "id": "segment_1",
                "content": content.strip(),
                "order": 1,
                "type": "full_content",
                "word_count": len(content.split()),
                "char_count": len(content),
                "summary": self._extract_first_sentence(content),
                "metadata": {
                    "is_complete": True,
                    "segmentation_method": "no_segmentation",
                },
            }
        ]

    async def _segment_by_sections(self, content: str) -> list[dict[str, Any]]:
        """基于章节结构分段"""
        segments: list[dict[str, Any]] = []

        # 查找所有章节标题的位置
        lines = content.split("\n")
        section_starts = []

        for i, line in enumerate(lines):
            line_stripped = line.strip()
            if not line_stripped:
                continue

            # 检查是否是真正的标题
            is_heading = (
                # Markdown标题 (# 开头)
                re.match(r"^#{1,6}\s+.+", line_stripped)
                # 数字编号标题 (1. 或 1) 开头)
                or re.match(r"^\d+[\.\)]\s+.+", line_stripped)
                # 中文编号标题 (一、二、三 等)
                or re.match(r"^[一二三四五六七八九十]+[、\.]\s*.+", line_stripped)
            )

            if is_heading:
                section_starts.append((i, line_stripped))

        # 如果找到多个标题，根据标题分段
        if len(section_starts) >= 2:
            # 找到了足够的章节标题，按章节分段
            segments = []
            segment_count = 0

            for i, (line_idx, _heading) in enumerate(section_starts):
                # 确定本节的结束位置
                if i < len(section_starts) - 1:
                    next_line_idx = section_starts[i + 1][0]
                    section_content = "\n".join(lines[line_idx:next_line_idx])
                else:
                    section_content = "\n".join(lines[line_idx:])

                section_content = section_content.strip()

                # 每个章节创建一个分段（除非章节内容太长需要进一步分割）
                if len(section_content) <= self.max_segment_length:
                    segment_count += 1
                    segments.append(
                        self._create_segment(section_content, segment_count, "section")
                    )
                else:
                    # 章节内容太长，需要进一步分割
                    sub_segments = await self._segment_by_length(section_content)
                    for sub_segment in sub_segments:
                        segment_count += 1
                        sub_segment["id"] = f"segment_{segment_count}"
                        sub_segment["order"] = segment_count
                        sub_segment["type"] = "section"
                        segments.append(sub_segment)

            return segments
        else:
            # 没有找到足够的章节标题，返回整个内容作为一个分段
            return [self._create_segment(content, 1, "section")]

    async def _segment_by_paragraphs(self, content: str) -> list[dict[str, Any]]:
        """基于段落分段"""
        paragraphs = content.split("\n\n")
        segments = []
        current_segment = ""
        segment_count = 0

        for paragraph in paragraphs:
            paragraph = paragraph.strip()
            if not paragraph:
                continue

            # 检查添加这个段落后是否超长
            potential_segment = (
                current_segment + "\n\n" + paragraph if current_segment else paragraph
            )

            if len(potential_segment) > self.max_segment_length and current_segment:
                # 保存当前分段，开始新分段
                segment_count += 1
                segments.append(
                    self._create_segment(current_segment, segment_count, "paragraph")
                )
                current_segment = paragraph
            else:
                current_segment = potential_segment

        # 处理最后一个分段
        if current_segment.strip():
            segment_count += 1
            segments.append(
                self._create_segment(current_segment, segment_count, "paragraph")
            )

        return segments

    async def _segment_by_semantics(self, content: str) -> list[dict[str, Any]]:
        """基于语义分段（简化版）"""
        # 这是一个简化的语义分段实现
        # 实际项目中可能需要使用更复杂的NLP技术

        # 首先尝试章节分段
        segments = await self._segment_by_sections(content)

        if len(segments) <= 1:
            # 如果章节分段效果不好，尝试段落分段
            segments = await self._segment_by_paragraphs(content)

        # 进一步优化：合并过短的分段，分割过长的分段
        optimized_segments: list[dict[str, Any]] = []

        for segment in segments:
            segment_content = segment["content"]

            if len(segment_content) < self.min_segment_length:
                # 分段太短，尝试与前一个分段合并
                if optimized_segments:
                    last_segment = optimized_segments[-1]
                    combined_length = len(last_segment["content"]) + len(
                        segment_content
                    )

                    if combined_length <= self.max_segment_length:
                        # 合并分段
                        last_segment["content"] += "\n\n" + segment_content
                        last_segment["word_count"] = len(
                            last_segment["content"].split()
                        )
                        last_segment["char_count"] = len(last_segment["content"])
                        continue

                optimized_segments.append(segment)

            elif len(segment_content) > self.max_segment_length:
                # 分段太长，需要进一步分割
                sub_segments = await self._segment_by_length(segment_content)
                for i, sub_segment in enumerate(sub_segments):
                    sub_segment["id"] = f"{segment['id']}_sub_{i + 1}"
                    sub_segment["order"] = len(optimized_segments) + i + 1
                    optimized_segments.append(sub_segment)
            else:
                optimized_segments.append(segment)

        # 重新编号
        for i, segment in enumerate(optimized_segments):
            segment["order"] = i + 1
            segment["id"] = f"segment_{i + 1}"

        return optimized_segments

    async def _segment_by_length(self, content: str) -> list[dict[str, Any]]:
        """基于长度分段（带重叠）"""
        segments = []
        segment_count = 0
        start = 0

        while start < len(content):
            end = start + self.max_segment_length

            if end >= len(content):
                # 最后一个分段
                segment_content = content[start:].strip()
                if segment_content:
                    segment_count += 1
                    segments.append(
                        self._create_segment(
                            segment_content, segment_count, "length_based"
                        )
                    )
                break

            # 寻找合适的分割点（优先选择句号、换行等）
            segment_content = content[start:end]
            split_point = self._find_split_point(segment_content)

            if split_point > 0:
                actual_end = start + split_point
                segment_content = content[start:actual_end].strip()
            else:
                segment_content = content[start:end].strip()
                actual_end = end

            if segment_content:
                segment_count += 1
                segments.append(
                    self._create_segment(segment_content, segment_count, "length_based")
                )

            # 计算下一个分段的起始位置（考虑重叠）
            start = max(actual_end - self.overlap_length, start + 1)

        return segments

    def _find_split_point(self, content: str) -> int:
        """寻找合适的分割点"""
        # 优先级：中文句号 > 英文句号 > 换行 > 中文标点 > 英文标点 > 空格
        split_chars = ["。", ".", "\n", "！", "？", "；", "!", "?", ";", "，", ",", " "]

        # 从内容的后70%开始寻找分割点
        search_start = int(len(content) * 0.7)

        for char in split_chars:
            pos = content.rfind(char, search_start)
            if pos > search_start:  # 确保在合适的位置
                return pos + 1

        # 如果没有找到合适的分割点，尝试在前半部分寻找
        for char in split_chars:
            pos = content.rfind(char)
            if pos > len(content) * 0.3:  # 至少在30%的位置之后
                return pos + 1

        # 最后的回退：返回75%位置
        return int(len(content) * 0.75)

    def _create_segment(
        self,
        content: str,
        order: int,
        segment_type: str,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """创建分段对象"""
        content = content.strip()

        return {
            "id": f"segment_{order}",
            "content": content,
            "order": order,
            "type": segment_type,
            "word_count": len(content.split()),
            "char_count": len(content),
            "summary": self._extract_first_sentence(content),
            "metadata": {
                "segmentation_method": segment_type,
                "is_complete": True,
                **(metadata or {}),
            },
        }

    def _extract_first_sentence(self, content: str) -> str:
        """提取第一句话作为摘要"""
        content = content.strip()
        if not content:
            return ""

        # 改进的句子分割，支持中文标点
        sentences = re.split(r"[.!?。！？]+", content)
        if sentences and sentences[0].strip():
            first_sentence = sentences[0].strip()
            # 限制长度为100字符
            if len(first_sentence) > 100:
                return first_sentence[:97] + "..."
            else:
                return first_sentence

        # 如果没有找到句子分割，直接截取前100字符
        if len(content) > 100:
            return content[:97] + "..."
        else:
            return content

    def _post_process_segments(
        self, segments: list[dict[str, Any]], preserve_structure: bool
    ) -> list[dict[str, Any]]:
        """后处理分段结果"""
        if not segments:
            return segments

        # 确保每个分段都有必要的字段
        for segment in segments:
            if "summary" not in segment:
                segment["summary"] = self._extract_first_sentence(segment["content"])

            if "metadata" not in segment:
                segment["metadata"] = {}

            # 添加分段统计信息
            segment["metadata"]["total_segments"] = len(segments)
            segment["metadata"]["preserve_structure"] = preserve_structure

        # 检查分段质量
        total_length = sum(len(s["content"]) for s in segments)
        avg_length = total_length / len(segments)

        logger.info(
            f"分段统计: 总分段数={len(segments)}, 平均长度={avg_length:.0f}, 总长度={total_length}"
        )

        # 如果分段质量不好，记录警告
        if avg_length < self.min_segment_length:
            logger.warning("分段可能过短，建议调整分段策略")
        elif avg_length > self.max_segment_length * 0.9:
            logger.warning("分段可能过长，建议调整分段策略")

        return segments
