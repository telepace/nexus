"""
段落格式化工具
将段落数组转换为带标号的统一文本格式，供所有AI功能使用
"""

from app.models.content import Segment


class SegmentFormatter:
    """段落格式化器，统一处理段落标号显示"""

    @staticmethod
    def format_segments_with_numbers(segments: list[Segment]) -> str:
        """
        将段落数组格式化为带标号的文本

        Args:
            segments: 段落对象列表

        Returns:
            str: 格式化后的带标号文本
        """
        if not segments:
            return ""

        formatted_parts = []
        for segment in segments:
            # 使用display_number（从1开始）作为用户友好的标号
            segment_number = getattr(
                segment, "display_number", segment.segment_index + 1
            )
            formatted_parts.append(f"[{segment_number}] {segment.content}")

        return "\n\n".join(formatted_parts)

    @staticmethod
    def format_segments_for_ai_prompt(
        segments: list[Segment], include_metadata: bool = False
    ) -> str:
        """
        为AI提示专门格式化段落内容

        Args:
            segments: 段落对象列表
            include_metadata: 是否包含段落元数据

        Returns:
            str: AI专用的格式化文本
        """
        if not segments:
            return "暂无内容段落。"

        formatted_parts = ["=== 文档内容（已分段标号） ==="]

        for segment in segments:
            segment_number = getattr(
                segment, "display_number", segment.segment_index + 1
            )
            content = segment.content.strip()

            if include_metadata:
                segment_type = getattr(segment, "segment_type", "paragraph")
                formatted_parts.append(f"[{segment_number}] ({segment_type}) {content}")
            else:
                formatted_parts.append(f"[{segment_number}] {content}")

        formatted_parts.append("=== 文档内容结束 ===")
        return "\n\n".join(formatted_parts)

    @staticmethod
    def extract_segment_references_from_text(text: str) -> list[int]:
        """
        从文本中提取段落引用标号

        Args:
            text: 包含段落引用的文本，如"根据 [1] 和 [3] 的描述..."

        Returns:
            list[int]: 提取到的段落标号列表
        """
        import re

        # 匹配 [数字] 格式的引用
        pattern = r"\[(\d+)\]"
        matches = re.findall(pattern, text)

        # 转换为整数并去重，保持顺序
        segment_numbers = []
        seen = set()
        for match in matches:
            num = int(match)
            if num not in seen:
                segment_numbers.append(num)
                seen.add(num)

        return segment_numbers

    @staticmethod
    def validate_segment_references(
        segment_numbers: list[int], available_segments: list[Segment]
    ) -> list[int]:
        """
        验证段落引用是否有效

        Args:
            segment_numbers: 要验证的段落标号列表
            available_segments: 可用的段落列表

        Returns:
            list[int]: 有效的段落标号列表
        """
        available_numbers = {
            getattr(segment, "display_number", segment.segment_index + 1)
            for segment in available_segments
        }

        return [num for num in segment_numbers if num in available_numbers]


# 创建全局实例
segment_formatter = SegmentFormatter()
