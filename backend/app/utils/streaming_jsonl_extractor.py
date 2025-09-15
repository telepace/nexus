"""
流式JSONL内容提取器

在LLM流式输出过程中实时识别和提取JSONL内容，
忽略markdown代码块标记、多余的文本等干扰信息。
"""

import logging
import re
from enum import Enum

logger = logging.getLogger(__name__)


class ExtractionState(Enum):
    """提取状态枚举"""

    WAITING_FOR_JSON = "waiting_for_json"  # 等待第一个JSON对象
    EXTRACTING_JSON = "extracting_json"  # 正在提取JSON内容
    COMPLETED = "completed"  # 提取完成


class StreamingJSONLExtractor:
    """
    流式JSONL内容提取器

    用于在LLM流式输出过程中实时识别和提取JSONL内容，
    自动过滤掉markdown代码块标记和其他干扰信息。
    """

    def __init__(self):
        self.state = ExtractionState.WAITING_FOR_JSON
        self.accumulated_content = ""
        self.pure_jsonl_content = ""
        self.buffer = ""
        self.code_block_patterns = [
            r"```(?:json|jsonl)?\s*\n?",  # 代码块开始标记
            r"```\s*$",  # 代码块结束标记
        ]

    def process_chunk(self, chunk: str) -> tuple[str, bool]:
        """
        处理流式数据块

        Args:
            chunk: 新接收到的数据块

        Returns:
            Tuple[str, bool]: (提取的JSONL内容增量, 是否有新内容)
        """
        if not chunk:
            return "", False

        self.accumulated_content += chunk
        self.buffer += chunk

        # 根据当前状态处理
        if self.state == ExtractionState.WAITING_FOR_JSON:
            return self._try_start_extraction()
        elif self.state == ExtractionState.EXTRACTING_JSON:
            # In extracting mode, check if we have a complete codeblock or continue extracting
            return self._continue_extraction()
        else:
            return "", False

    def _try_start_extraction(self) -> tuple[str, bool]:
        """尝试开始JSONL提取"""
        # 改进：先检查是否有代码块标记，如果有就提取代码块内容
        import re

        # 查找任何位置的代码块，而不只是开头
        code_block_pattern = r"```(?:jsonl|json)?\s*\n?(.*?)(?:\n?```|$)"
        match = re.search(code_block_pattern, self.buffer, re.DOTALL)

        if match:
            # 找到代码块，检查其中的内容
            jsonl_content = match.group(1).strip()
            lines = jsonl_content.split("\n")

            # 检查是否有任何有效的JSON行
            has_valid_json = any(
                line.strip() and self._is_json_line_start(line.strip())
                for line in lines
                if line.strip()
            )

            if has_valid_json:
                # 找到有效的JSON，切换状态但不修改buffer
                self.state = ExtractionState.EXTRACTING_JSON
                # 直接处理代码块内的内容而不修改buffer
                return self._extract_jsonl_from_codeblock(jsonl_content)
        else:
            # 没有代码块，查找第一个JSON对象的开始位置
            lines = self.buffer.split("\n")
            jsonl_start_idx = None

            for i, line in enumerate(lines):
                line = line.strip()

                # 跳过代码块标记
                if any(re.match(pattern, line) for pattern in self.code_block_patterns):
                    continue

                # 检查是否是JSON对象开始
                if self._is_json_line_start(line):
                    jsonl_start_idx = i
                    break

            if jsonl_start_idx is not None:
                # 找到了JSON开始位置，切换状态
                self.state = ExtractionState.EXTRACTING_JSON

                # 从JSON开始位置重新构建buffer
                self.buffer = "\n".join(lines[jsonl_start_idx:])

                # 提取当前可用的JSONL内容
                return self._extract_jsonl_content()

        return "", False

    def _continue_extraction(self) -> tuple[str, bool]:
        """继续提取JSONL内容"""
        # Check if we now have a complete codeblock
        code_block_pattern = r"```(?:jsonl|json)?\s*\n?(.*?)(?:\n?```|$)"
        match = re.search(code_block_pattern, self.buffer, re.DOTALL)

        if match and "```" in self.buffer and self.buffer.rstrip().endswith("```"):
            # We have a complete codeblock, extract from it and mark as completed
            jsonl_content = match.group(1).strip()
            result = self._extract_jsonl_from_codeblock(jsonl_content)
            self.state = ExtractionState.COMPLETED
            return result
        elif match:
            # We have a partial codeblock, extract from it
            jsonl_content = match.group(1).strip()
            return self._extract_jsonl_from_codeblock(jsonl_content)
        else:
            # No codeblock pattern, use the regular extraction
            return self._extract_jsonl_content()

    def _extract_jsonl_from_codeblock(self, codeblock_content: str) -> tuple[str, bool]:
        """从代码块内容中提取JSONL"""
        lines = codeblock_content.split("\n")
        new_jsonl_lines = []

        for line in lines:
            line = line.strip()

            # 跳过空行
            if not line:
                continue

            # 检查是否是有效的JSON行
            if self._is_valid_jsonl_line(line):
                # 检查这行是否已经在pure_jsonl_content中
                existing_lines = self.pure_jsonl_content.split("\n") if self.pure_jsonl_content else []
                if line not in existing_lines:
                    new_jsonl_lines.append(line)

        if new_jsonl_lines:
            new_content = "\n".join(new_jsonl_lines)
            if self.pure_jsonl_content:
                self.pure_jsonl_content += "\n" + new_content
                return "\n" + new_content, True
            else:
                self.pure_jsonl_content = new_content
                return new_content, True

        return "", False

    def _extract_jsonl_content(self) -> tuple[str, bool]:
        """提取JSONL内容"""
        lines = self.buffer.split("\n")
        new_jsonl_lines = []

        for line in lines:
            line = line.strip()

            # 检查是否是代码块结束标记
            if re.match(r"```\s*$", line):
                self.state = ExtractionState.COMPLETED
                break

            # 跳过空行和代码块标记
            if not line or any(
                re.match(pattern, line) for pattern in self.code_block_patterns
            ):
                continue

            # 检查是否是有效的JSON行
            if self._is_valid_jsonl_line(line):
                # 检查这行是否已经在pure_jsonl_content中 - 使用更精确的检查
                existing_lines = self.pure_jsonl_content.split("\n") if self.pure_jsonl_content else []
                if line not in existing_lines:
                    new_jsonl_lines.append(line)

        if new_jsonl_lines:
            new_content = "\n".join(new_jsonl_lines)
            if self.pure_jsonl_content:
                self.pure_jsonl_content += "\n" + new_content
                return "\n" + new_content, True
            else:
                self.pure_jsonl_content = new_content
                return new_content, True

        return "", False

    def _is_json_line_start(self, line: str) -> bool:
        """检查是否是JSON行的开始"""
        if not line:
            return False

        # 简单检查是否以{开始
        if line.startswith("{"):
            try:
                # 尝试部分解析，看是否包含JSONL的基本字段
                if '"type"' in line or '"t"' in line:
                    return True
            except Exception:
                pass

        return False

    def _is_valid_jsonl_line(self, line: str) -> bool:
        """检查是否是有效的JSONL行"""
        if not line or not line.startswith("{"):
            return False

        try:
            import json

            parsed = json.loads(line)
            # 检查是否包含JSONL块的基本字段
            return isinstance(parsed, dict) and (
                ("type" in parsed or "t" in parsed)
                and ("content" in parsed or "c" in parsed)
            )
        except json.JSONDecodeError:
            return False

    def get_current_jsonl(self) -> str:
        """获取当前提取到的完整JSONL内容"""
        return self.pure_jsonl_content

    def reset(self):
        """重置提取器状态"""
        self.state = ExtractionState.WAITING_FOR_JSON
        self.accumulated_content = ""
        self.pure_jsonl_content = ""
        self.buffer = ""

    def is_completed(self) -> bool:
        """检查提取是否完成"""
        return self.state == ExtractionState.COMPLETED

    def has_jsonl_content(self) -> bool:
        """检查是否已提取到JSONL内容"""
        return bool(self.pure_jsonl_content)


def create_streaming_jsonl_extractor() -> StreamingJSONLExtractor:
    """创建流式JSONL提取器实例"""
    return StreamingJSONLExtractor()
