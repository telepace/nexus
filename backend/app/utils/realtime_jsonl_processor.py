"""
实时JSONL处理器 - 检测完整JSONL行并立即传输
"""

import json
import re
from collections.abc import Generator


class RealtimeJSONLProcessor:
    """实时JSONL流处理器，检测完整的JSONL行并立即发送"""

    def __init__(self):
        self.buffer = ""  # 累积缓冲区
        self.complete_lines = []  # 已检测到的完整JSONL行

    def process_chunk(self, chunk: str) -> Generator[str, None, None]:
        """
        处理接收到的文本块，检测并yield完整的JSONL行

        Args:
            chunk: 从LLM接收到的文本块

        Yields:
            str: 完整的JSONL行
        """
        if not chunk:
            return

        # 将新chunk添加到缓冲区
        self.buffer += chunk

        # 尝试提取完整的JSONL行
        yield from self._extract_complete_jsonl_lines()

    def _extract_complete_jsonl_lines(self) -> Generator[str, None, None]:
        """从缓冲区提取完整的JSONL行"""

        # 查找所有可能的JSON对象
        lines_to_remove = []

        # 分割缓冲区为潜在的行
        potential_lines = self.buffer.split("\n")

        # 处理除最后一行外的所有行（最后一行可能不完整）
        for i, line in enumerate(potential_lines[:-1]):
            line = line.strip()
            if line:
                jsonl_line = self._try_parse_jsonl_line(line)
                if jsonl_line:
                    yield jsonl_line
                    lines_to_remove.append(i)

        # 检查缓冲区中的完整JSON对象（不依赖换行符）
        remaining_buffer = potential_lines[-1] if potential_lines else ""

        # 尝试从剩余缓冲区中提取完整的JSON对象
        extracted_objects, remaining = self._extract_json_objects(remaining_buffer)

        yield from extracted_objects

        # 更新缓冲区：移除已处理的行，保留未完成的部分
        if lines_to_remove or extracted_objects:
            # 保留未处理完的最后部分
            self.buffer = remaining

    def _try_parse_jsonl_line(self, line: str) -> str | None:
        """尝试解析单行JSONL"""
        try:
            # 尝试解析为JSON
            parsed = json.loads(line)

            # 验证是否包含必要字段
            if isinstance(parsed, dict) and "t" in parsed and "c" in parsed:
                return line

        except (json.JSONDecodeError, ValueError):
            pass

        return None

    def _extract_json_objects(self, text: str) -> tuple[list[str], str]:
        """
        从文本中提取完整的JSON对象

        Returns:
            Tuple[list[str], str]: (提取的JSON对象列表, 剩余文本)
        """
        extracted = []
        remaining = text

        # 使用正则表达式查找JSON对象模式
        # 匹配 {"t":"...","c":"..."...} 格式
        json_pattern = r'\{"t"[^}]*\}'

        while True:
            match = re.search(json_pattern, remaining)
            if not match:
                break

            json_str = match.group(0)

            # 尝试解析JSON
            try:
                parsed = json.loads(json_str)
                if isinstance(parsed, dict) and "t" in parsed and "c" in parsed:
                    extracted.append(json_str)

                    # 从剩余文本中移除已提取的JSON
                    remaining = remaining[match.end() :]
                else:
                    # 如果解析失败，移动到下一个位置
                    remaining = remaining[match.start() + 1 :]

            except (json.JSONDecodeError, ValueError):
                # 如果解析失败，移动到下一个位置
                remaining = remaining[match.start() + 1 :]

        return extracted, remaining

    def finalize(self) -> Generator[str, None, None]:
        """处理缓冲区中剩余的内容（流结束时调用）"""
        if self.buffer.strip():
            # 尝试解析剩余内容
            final_line = self._try_parse_jsonl_line(self.buffer.strip())
            if final_line:
                yield final_line
            else:
                # 尝试提取JSON对象
                extracted_objects, _ = self._extract_json_objects(self.buffer)
                yield from extracted_objects


class SmartJSONLExtractor:
    """智能JSONL提取器，结合多种策略"""

    def __init__(self):
        self.realtime_processor = RealtimeJSONLProcessor()
        self.accumulated_content = ""
        self.jsonl_content = ""

    def process_chunk(self, chunk: str) -> tuple[str, bool]:
        """
        处理文本块并返回增量JSONL内容

        Returns:
            Tuple[str, bool]: (增量JSONL内容, 是否有新的JSONL内容)
        """
        if not chunk:
            return "", False

        self.accumulated_content += chunk

        # 使用实时处理器检测完整JSONL行
        new_jsonl_lines = list(self.realtime_processor.process_chunk(chunk))

        if new_jsonl_lines:
            # 有新的JSONL行
            increment = "\n".join(new_jsonl_lines) + "\n"
            self.jsonl_content += increment
            return increment, True

        return "", False

    def finalize(self) -> str:
        """获取最终的JSONL内容"""
        # 处理剩余内容
        final_lines = list(self.realtime_processor.finalize())
        if final_lines:
            final_content = "\n".join(final_lines) + "\n"
            self.jsonl_content += final_content
            return final_content

        return ""

    def get_current_jsonl(self) -> str:
        """获取当前累积的JSONL内容"""
        return self.jsonl_content

    def has_jsonl_content(self) -> bool:
        """检查是否有JSONL内容"""
        return bool(self.jsonl_content.strip())


def create_realtime_jsonl_processor() -> SmartJSONLExtractor:
    """创建智能JSONL提取器实例"""
    return SmartJSONLExtractor()
