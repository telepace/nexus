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
    EXTRACTING_JSON = "extracting_json"    # 正在提取JSON内容
    COMPLETED = "completed"                # 提取完成


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
            r'```(?:json|jsonl)?\s*\n?',  # 代码块开始标记
            r'```\s*$',                   # 代码块结束标记
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
            return self._extract_jsonl_content()
        else:
            return "", False

    def _try_start_extraction(self) -> tuple[str, bool]:
        """尝试开始JSONL提取"""
        # 改进：先检查是否有代码块标记，如果有就提取代码块内容
        import re
        
        # 查找任何位置的代码块，而不只是开头
        code_block_pattern = r'```(?:jsonl|json)?\s*\n?(.*?)(?:\n?```|$)'
        match = re.search(code_block_pattern, self.buffer, re.DOTALL)
        
        if match:
            # 找到代码块，提取其中的内容
            jsonl_content = match.group(1).strip()
            lines = jsonl_content.split('\n')
            
            # 检查第一行是否是有效的JSON
            for line in lines:
                line = line.strip()
                if line and self._is_json_line_start(line):
                    # 找到有效的JSON开始，切换状态
                    self.state = ExtractionState.EXTRACTING_JSON
                    self.buffer = jsonl_content  # 只保留代码块内的内容
                    return self._extract_jsonl_content()
        else:
            # 没有代码块，查找第一个JSON对象的开始位置
            lines = self.buffer.split('\n')
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
                self.buffer = '\n'.join(lines[jsonl_start_idx:])

                # 提取当前可用的JSONL内容
                return self._extract_jsonl_content()

        return "", False

    def _extract_jsonl_content(self) -> tuple[str, bool]:
        """提取JSONL内容"""
        lines = self.buffer.split('\n')
        new_jsonl_lines = []

        for line in lines:
            line = line.strip()

            # 检查是否是代码块结束标记
            if re.match(r'```\s*$', line):
                self.state = ExtractionState.COMPLETED
                break

            # 跳过空行和代码块标记
            if not line or any(re.match(pattern, line) for pattern in self.code_block_patterns):
                continue

            # 检查是否是有效的JSON行
            if self._is_valid_jsonl_line(line):
                # 检查这行是否已经在pure_jsonl_content中
                if line not in self.pure_jsonl_content:
                    new_jsonl_lines.append(line)

        if new_jsonl_lines:
            new_content = '\n'.join(new_jsonl_lines)
            if self.pure_jsonl_content:
                self.pure_jsonl_content += '\n' + new_content
                return '\n' + new_content, True
            else:
                self.pure_jsonl_content = new_content
                return new_content, True

        return "", False

    def _is_json_line_start(self, line: str) -> bool:
        """检查是否是JSON行的开始"""
        if not line:
            return False

        # 简单检查是否以{开始
        if line.startswith('{'):
            try:
                # 尝试部分解析，看是否包含JSONL的基本字段
                if '"type"' in line or '"t"' in line:
                    return True
            except:
                pass

        return False

    def _is_valid_jsonl_line(self, line: str) -> bool:
        """检查是否是有效的JSONL行"""
        if not line or not line.startswith('{'):
            return False

        try:
            import json
            parsed = json.loads(line)
            # 检查是否包含JSONL块的基本字段
            return (
                isinstance(parsed, dict) and
                (("type" in parsed or "t" in parsed) and
                 ("content" in parsed or "c" in parsed))
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
