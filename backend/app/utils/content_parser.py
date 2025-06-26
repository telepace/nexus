"""
内容解析器
支持多种格式的内容解析并转换为统一的Markdown格式
"""

import logging
import re

from bs4 import BeautifulSoup
from markdownify import markdownify as md

logger = logging.getLogger(__name__)


class ContentParser:
    """内容解析器"""

    def __init__(self):
        self.html_parser = BeautifulSoup()

    async def html_to_markdown(self, html_content: str) -> str:
        """将HTML内容转换为Markdown"""
        try:
            # 清理HTML
            cleaned_html = self._clean_html(html_content)

            # 转换为Markdown
            markdown_content = md(
                cleaned_html,
                heading_style="ATX",  # 使用#风格标题
                bullets="-",  # 使用-作为列表符号
                strip=[
                    "script",
                    "style",
                    "meta",
                    "link",
                    "noscript",
                ],  # 移除不需要的标签
            )

            # 后处理优化
            markdown_content = self._optimize_markdown(markdown_content)

            return markdown_content

        except Exception as e:
            logger.error(f"HTML转Markdown失败: {str(e)}")
            # 回退到纯文本
            return self._extract_text_from_html(html_content)

    async def pdf_to_markdown(self, pdf_content: str) -> str:
        """将PDF内容转换为Markdown（简化版）"""
        try:
            # 这里假设pdf_content是已提取的文本
            # 实际项目中可能需要使用PyPDF2或pdfplumber等库

            # 检测和转换标题
            markdown_content = self._detect_and_convert_headings(pdf_content)

            # 检测列表
            markdown_content = self._detect_and_convert_lists(markdown_content)

            # 优化段落
            markdown_content = self._optimize_paragraphs(markdown_content)

            return markdown_content

        except Exception as e:
            logger.error(f"PDF转Markdown失败: {str(e)}")
            return pdf_content  # 回退到原始内容

    async def text_to_markdown(self, text_content: str) -> str:
        """将纯文本转换为Markdown"""
        try:
            # 检测标题结构
            markdown_content = self._detect_and_convert_headings(text_content)

            # 检测列表
            markdown_content = self._detect_and_convert_lists(markdown_content)

            # 检测代码块
            markdown_content = self._detect_and_convert_code_blocks(markdown_content)

            # 优化段落和换行
            markdown_content = self._optimize_paragraphs(markdown_content)

            return markdown_content

        except Exception as e:
            logger.error(f"文本转Markdown失败: {str(e)}")
            return text_content  # 回退到原始内容

    def _clean_html(self, html_content: str) -> str:
        """清理HTML内容"""
        soup = BeautifulSoup(html_content, "html.parser")

        # 移除script和style标签
        for script in soup(["script", "style", "meta", "link", "noscript"]):
            script.decompose()

        # 移除注释
        from bs4 import Comment

        comments = soup.findAll(text=lambda text: isinstance(text, Comment))
        for comment in comments:
            comment.extract()

        # 清理属性，只保留有用的
        useful_attrs = ["href", "src", "alt", "title"]
        for tag in soup.find_all():
            if hasattr(tag, "attrs"):  # 确保是 Tag 对象而不是 NavigableString
                attrs = dict(tag.attrs)
                for attr in attrs:
                    if attr not in useful_attrs:
                        del tag.attrs[attr]

        return str(soup)

    def _extract_text_from_html(self, html_content: str) -> str:
        """从HTML中提取纯文本"""
        soup = BeautifulSoup(html_content, "html.parser")
        return soup.get_text(separator="\n", strip=True)

    def _detect_and_convert_headings(self, content: str) -> str:
        """检测并转换标题"""
        lines = content.split("\n")
        processed_lines = []

        for line in lines:
            stripped = line.strip()
            if not stripped:
                processed_lines.append(line)
                continue

            # 检测可能的标题模式
            # 1. 全大写且较短
            if (
                stripped.isupper()
                and len(stripped) < 80
                and not any(char in stripped for char in [".", ",", ";", ":", "!", "?"])
            ):
                processed_lines.append(f"## {stripped.title()}")
            # 2. 以数字开头的章节
            elif re.match(r"^\d+[\.\)]\s+[A-Z]", stripped):
                processed_lines.append(f"### {stripped}")
            # 3. 以大写字母开头，较短，且下一行是空行或内容
            elif (
                len(stripped) < 100
                and stripped[0].isupper()
                and not stripped.endswith(".")
                and ":" not in stripped
            ):
                # 简单启发式：如果看起来像标题
                if len(stripped.split()) <= 10:
                    processed_lines.append(f"## {stripped}")
                else:
                    processed_lines.append(line)
            else:
                processed_lines.append(line)

        return "\n".join(processed_lines)

    def _detect_and_convert_lists(self, content: str) -> str:
        """检测并转换列表"""
        lines = content.split("\n")
        processed_lines = []

        for line in lines:
            stripped = line.strip()

            # 检测现有的Markdown列表
            if re.match(r"^[\*\-\+]\s+", stripped) or re.match(r"^\d+\.\s+", stripped):
                processed_lines.append(line)
                continue

            # 检测可能的列表项
            # 1. 以• • - * 开头
            if re.match(r"^[•·‣▪▫‒–—]\s+", stripped):
                processed_lines.append(f"- {stripped[1:].strip()}")
            # 2. 以数字加括号开头
            elif re.match(r"^\d+\)\s+", stripped):
                match = re.match(r"^(\d+)\)", stripped)
                if match:
                    num = match.group(1)
                    processed_lines.append(f"{num}. {stripped[len(num) + 2 :].strip()}")
                else:
                    processed_lines.append(line)
            # 3. 缩进的短行可能是列表项
            elif line.startswith("    ") and len(stripped) < 200:
                processed_lines.append(f"- {stripped}")
            else:
                processed_lines.append(line)

        return "\n".join(processed_lines)

    def _detect_and_convert_code_blocks(self, content: str) -> str:
        """检测并转换代码块"""
        lines = content.split("\n")
        processed_lines = []
        in_code_block = False
        code_lines: list[str] = []

        for line in lines:
            # 检测代码块开始/结束标记
            if line.strip() in ["```", "~~~"] or re.match(r"^```\w*$", line.strip()):
                if in_code_block:
                    # 结束代码块
                    processed_lines.append("```")
                    processed_lines.extend(code_lines)
                    processed_lines.append("```")
                    code_lines = []
                    in_code_block = False
                else:
                    # 开始代码块
                    in_code_block = True
                continue

            if in_code_block:
                code_lines.append(line)
            else:
                # 检测单行代码（缩进4个空格或更多）
                if line.startswith("    ") and line.strip():
                    processed_lines.append(f"`{line.strip()}`")
                else:
                    processed_lines.append(line)

        # 处理未关闭的代码块
        if in_code_block and code_lines:
            processed_lines.append("```")
            processed_lines.extend(code_lines)
            processed_lines.append("```")

        return "\n".join(processed_lines)

    def _optimize_paragraphs(self, content: str) -> str:
        """优化段落结构"""
        # 规范化换行符
        content = content.replace("\r\n", "\n").replace("\r", "\n")

        # 移除多余的空行（3个以上连续空行合并为2个）
        content = re.sub(r"\n{3,}", "\n\n", content)

        # 确保段落之间有适当的间距
        lines = content.split("\n")
        processed_lines = []
        prev_line_empty = False

        for line in lines:
            is_empty = not line.strip()

            if is_empty:
                if not prev_line_empty:
                    processed_lines.append("")
            else:
                processed_lines.append(line)

            prev_line_empty = is_empty

        return "\n".join(processed_lines)

    def _optimize_markdown(self, markdown_content: str) -> str:
        """优化Markdown格式"""
        # 清理多余的空行
        markdown_content = re.sub(r"\n{3,}", "\n\n", markdown_content)

        # 清理标题格式（去除标题前后的多余空格）
        markdown_content = re.sub(
            r"(#{1,6})\s+(.+?)\s*$", r"\1 \2", markdown_content, flags=re.MULTILINE
        )

        # 确保标题前后有空行
        markdown_content = re.sub(r"([^\n])\n(#{1,6}\s)", r"\1\n\n\2", markdown_content)
        markdown_content = re.sub(
            r"(#{1,6}[^\n]*)\n([^\n#])", r"\1\n\n\2", markdown_content
        )

        # 修复列表格式，确保-后有空格，同时移除前导空格
        markdown_content = re.sub(
            r"^\s*-([^\s])", r"- \1", markdown_content, flags=re.MULTILINE
        )
        markdown_content = re.sub(
            r"^\s*-\s{2,}", r"- ", markdown_content, flags=re.MULTILINE
        )
        # 移除所有列表项的前导空格（包括已经格式正确的）
        markdown_content = re.sub(
            r"^\s*(- )", r"\1", markdown_content, flags=re.MULTILINE
        )

        # 清理列表格式
        markdown_content = re.sub(r"\n\n(\s*[\*\-\+])", r"\n\1", markdown_content)

        # 清理行内代码周围的空格
        markdown_content = re.sub(r"\s+`([^`]+)`\s+", r" `\1` ", markdown_content)

        return markdown_content.strip()
