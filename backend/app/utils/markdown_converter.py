"""
Markdown转换和优化工具
提供Markdown格式的转换、清理和结构优化功能
"""

import logging
import re
from typing import Any

logger = logging.getLogger(__name__)


class MarkdownConverter:
    """Markdown转换和优化工具"""

    def __init__(self):
        # Markdown元素的正则表达式
        self.patterns = {
            "headers": re.compile(r"^(#{1,6})\s+(.+)$", re.MULTILINE),
            "bold": re.compile(r"\*\*([^*]+)\*\*"),
            "italic": re.compile(r"\*([^*]+)\*"),
            "code_inline": re.compile(r"`([^`]+)`"),
            "code_block": re.compile(r"```(\w*)\n(.*?)\n```", re.DOTALL),
            "links": re.compile(r"\[([^\]]+)\]\([^)]+\)"),
            "images": re.compile(r"!\[([^\]]+)\]\([^)]+\)"),
            "lists_unordered": re.compile(r"^[\s]*[-*+]\s+(.+)$", re.MULTILINE),
            "lists_ordered": re.compile(r"^[\s]*\d+\.\s+(.+)$", re.MULTILINE),
            "blockquotes": re.compile(r"^>\s*(.+)$", re.MULTILINE),
            "horizontal_rules": re.compile(r"^[-*_]{3,}$", re.MULTILINE),
        }

    def optimize_structure(self, markdown_content: str) -> str:
        """优化Markdown结构"""
        try:
            content = markdown_content

            # 1. 标准化换行符
            content = self._normalize_line_breaks(content)

            # 2. 优化标题结构
            content = self._optimize_headers(content)

            # 3. 清理多余空行
            content = self._clean_excessive_whitespace(content)

            # 4. 优化列表格式
            content = self._optimize_lists(content)

            # 5. 优化代码块
            content = self._optimize_code_blocks(content)

            # 6. 优化链接和图片
            content = self._optimize_links_and_images(content)

            # 7. 最终清理
            content = self._final_cleanup(content)

            return content

        except Exception as e:
            logger.error(f"Markdown结构优化失败: {str(e)}")
            return markdown_content  # 返回原始内容

    def extract_metadata(self, markdown_content: str) -> dict[str, Any]:
        """从Markdown内容中提取元数据"""
        metadata = {
            "headers": [],
            "word_count": 0,
            "estimated_reading_time": 0,
            "has_code": False,
            "has_images": False,
            "has_links": False,
            "structure_quality": 0.0,
        }

        try:
            # 提取标题
            headers = self.patterns["headers"].findall(markdown_content)
            metadata["headers"] = [
                {"level": len(level), "text": text.strip()} for level, text in headers
            ]

            # 计算字数
            clean_text = self._extract_plain_text(markdown_content)
            words = clean_text.split()
            metadata["word_count"] = len(words)

            # 估算阅读时间（每分钟200词）
            metadata["estimated_reading_time"] = max(1, len(words) // 200)

            # 检测内容类型
            metadata["has_code"] = bool(
                self.patterns["code_inline"].search(markdown_content)
                or self.patterns["code_block"].search(markdown_content)
            )

            metadata["has_images"] = bool(
                self.patterns["images"].search(markdown_content)
            )

            metadata["has_links"] = bool(
                self.patterns["links"].search(markdown_content)
            )

            # 评估结构质量
            metadata["structure_quality"] = self._assess_structure_quality(
                markdown_content, metadata
            )

        except Exception as e:
            logger.error(f"提取Markdown元数据失败: {str(e)}")

        return metadata

    def convert_to_plain_text(self, markdown_content: str) -> str:
        """将Markdown转换为纯文本"""
        try:
            content = markdown_content

            # 移除代码块
            content = self.patterns["code_block"].sub(
                lambda m: f"\n{m.group(2)}\n", content
            )

            # 移除行内代码标记
            content = self.patterns["code_inline"].sub(r"\1", content)

            # 移除标题标记
            content = self.patterns["headers"].sub(r"\2", content)

            # 移除粗体和斜体标记
            content = self.patterns["bold"].sub(r"\1", content)
            content = self.patterns["italic"].sub(r"\1", content)

            # 移除链接标记，保留文本
            content = self.patterns["links"].sub(r"\1", content)

            # 移除图片标记
            content = self.patterns["images"].sub(r"\1", content)

            # 移除列表标记
            content = self.patterns["lists_unordered"].sub(r"\1", content)
            content = self.patterns["lists_ordered"].sub(r"\1", content)

            # 移除引用标记
            content = self.patterns["blockquotes"].sub(r"\1", content)

            # 移除水平分割线
            content = self.patterns["horizontal_rules"].sub("", content)

            # 清理空行
            content = re.sub(r"\n\s*\n", "\n\n", content)

            return content.strip()

        except Exception as e:
            logger.error(f"Markdown转纯文本失败: {str(e)}")
            return markdown_content

    def _normalize_line_breaks(self, content: str) -> str:
        """标准化换行符"""
        # 统一换行符
        content = content.replace("\r\n", "\n").replace("\r", "\n")
        return content

    def _optimize_headers(self, content: str) -> str:
        """优化标题结构"""
        lines = content.split("\n")
        optimized_lines: list[str] = []
        prev_line_empty = True

        for i, line in enumerate(lines):
            is_header = bool(re.match(r"^#{1,6}\s+", line.strip()))

            if is_header:
                # 确保标题前有空行（除非是第一行）
                if not prev_line_empty and optimized_lines:
                    optimized_lines.append("")

                optimized_lines.append(line)

                # 确保标题后有空行（除非是最后一行）
                if i < len(lines) - 1 and lines[i + 1].strip():
                    optimized_lines.append("")
                    prev_line_empty = True
                else:
                    prev_line_empty = False
            else:
                optimized_lines.append(line)
                prev_line_empty = not line.strip()

        return "\n".join(optimized_lines)

    def _clean_excessive_whitespace(self, content: str) -> str:
        """清理多余的空白"""
        # 移除行尾空白
        content = re.sub(r"[ \t]+$", "", content, flags=re.MULTILINE)

        # 限制连续空行不超过2行
        content = re.sub(r"\n{3,}", "\n\n", content)

        # 移除开头和结尾的空行
        content = content.strip()

        return content

    def _optimize_lists(self, content: str) -> str:
        """优化列表格式"""
        lines = content.split("\n")
        optimized_lines: list[str] = []
        in_list = False

        for line in lines:
            is_list_item = bool(
                re.match(r"^[\s]*[-*+]\s+", line) or re.match(r"^[\s]*\d+\.\s+", line)
            )

            if is_list_item:
                if not in_list and optimized_lines and optimized_lines[-1].strip():
                    # 列表开始前添加空行
                    optimized_lines.append("")
                in_list = True
                optimized_lines.append(line)
            else:
                if in_list and line.strip():
                    # 列表结束后添加空行
                    optimized_lines.append("")
                    in_list = False
                else:
                    in_list = False
                optimized_lines.append(line)

        return "\n".join(optimized_lines)

    def _optimize_code_blocks(self, content: str) -> str:
        """优化代码块格式"""
        # 确保代码块前后有空行
        content = re.sub(r"([^\n])\n(```)", r"\1\n\n\2", content)
        content = re.sub(r"(```)\n([^\n])", r"\1\n\n\2", content)

        return content

    def _optimize_links_and_images(self, content: str) -> str:
        """优化链接和图片格式"""
        # 这里可以添加链接验证、图片alt文本优化等逻辑
        return content

    def _final_cleanup(self, content: str) -> str:
        """最终清理"""
        # 确保文档以单个换行符结尾
        content = content.rstrip() + "\n"

        # 移除多余的空格
        content = re.sub(r"[ \t]+", " ", content)

        return content

    def _extract_plain_text(self, markdown_content: str) -> str:
        """提取纯文本用于统计"""
        # 简化版的纯文本提取
        text = re.sub(r"#{1,6}\s+", "", markdown_content)  # 移除标题标记
        text = re.sub(r"\*\*([^*]+)\*\*", r"\1", text)  # 移除粗体
        text = re.sub(r"\*([^*]+)\*", r"\1", text)  # 移除斜体
        text = re.sub(r"`([^`]+)`", r"\1", text)  # 移除行内代码
        text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)  # 移除链接
        text = re.sub(r"!\[([^\]]+)\]\([^)]+\)", "", text)  # 移除图片
        text = re.sub(r"^[\s]*[-*+]\s+", "", text, flags=re.MULTILINE)  # 移除列表标记
        text = re.sub(r"^[\s]*\d+\.\s+", "", text, flags=re.MULTILINE)  # 移除有序列表
        text = re.sub(r"^>\s+", "", text, flags=re.MULTILINE)  # 移除引用

        return text

    def _assess_structure_quality(
        self, content: str, metadata: dict[str, Any]
    ) -> float:
        """评估结构质量"""
        score = 0.0

        # 有标题结构 +0.3
        if metadata["headers"]:
            score += 0.3

            # 标题层级合理 +0.2
            levels = [h["level"] for h in metadata["headers"]]
            if len(set(levels)) > 1:  # 有多层级标题
                score += 0.2

        # 有适当的段落结构 +0.2
        paragraphs = content.split("\n\n")
        if len(paragraphs) > 1:
            avg_paragraph_length = sum(len(p.split()) for p in paragraphs) / len(
                paragraphs
            )
            if 20 <= avg_paragraph_length <= 200:  # 合理的段落长度
                score += 0.2

        # 有列表结构 +0.1
        if self.patterns["lists_unordered"].search(content) or self.patterns[
            "lists_ordered"
        ].search(content):
            score += 0.1

        # 有代码示例 +0.1
        if metadata["has_code"]:
            score += 0.1

        # 有链接或图片 +0.1
        if metadata["has_links"] or metadata["has_images"]:
            score += 0.1

        return min(1.0, score)
