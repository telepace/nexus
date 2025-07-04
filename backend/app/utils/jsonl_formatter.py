"""
JSONL 格式化器模块

提供将解析后的块对象格式化为 JSONL 字符串的功能，支持：
- 自定义输出格式
- 字段映射和转换
- 压缩和美化输出
- 批量处理
"""

import json
import logging
from collections.abc import Callable
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from .jsonl_parser import ParsedBlock, ParseResult

logger = logging.getLogger(__name__)

class OutputFormat(Enum):
    """输出格式枚举"""
    COMPACT = "compact"      # 紧凑格式，无额外空格
    PRETTY = "pretty"        # 美化格式，有缩进
    MINIFIED = "minified"    # 最小化格式，去除所有可选空格

@dataclass
class FieldMapping:
    """字段映射配置"""
    source_field: str
    target_field: str
    transformer: Callable[[Any], Any] | None = None
    required: bool = True

@dataclass
class FormatterConfig:
    """格式化器配置"""
    output_format: OutputFormat = OutputFormat.COMPACT
    field_mappings: list[FieldMapping] = field(default_factory=list)
    include_line_numbers: bool = False
    include_metadata: bool = False
    custom_separators: dict[str, str] | None = None
    encoding: str = "utf-8"
    ensure_ascii: bool = False
    sort_keys: bool = False
    exclude_empty_fields: bool = True
    use_short_field_names: bool = True  # 使用 t, c 而不是 type, content

class JsonlFormatter:
    """JSONL 格式化器"""

    def __init__(self, config: FormatterConfig | None = None):
        self.config = config or FormatterConfig()
        self._setup_default_mappings()

    def _setup_default_mappings(self):
        """设置默认的字段映射"""
        if not self.config.field_mappings:
            if self.config.use_short_field_names:
                self.config.field_mappings = [
                    FieldMapping("type", "t"),
                    FieldMapping("content", "c"),
                ]
            else:
                self.config.field_mappings = [
                    FieldMapping("type", "type"),
                    FieldMapping("content", "content"),
                ]

    def format_blocks(self, blocks: list[ParsedBlock]) -> str:
        """
        格式化块列表为 JSONL 字符串

        Args:
            blocks: 要格式化的块列表

        Returns:
            str: JSONL 格式的字符串
        """
        if not blocks:
            return ""

        lines = []
        for block in blocks:
            try:
                formatted_block = self._format_single_block(block)
                if formatted_block:  # 跳过空块
                    lines.append(formatted_block)
            except Exception as e:
                logger.error(f"Failed to format block at line {block.line_number}: {e}")
                # 创建错误恢复块
                fallback_block = self._create_fallback_block(block, str(e))
                if fallback_block:
                    lines.append(fallback_block)

        return '\n'.join(lines)

    def format_parse_result(self, parse_result: ParseResult) -> str:
        """
        格式化解析结果为 JSONL 字符串

        Args:
            parse_result: 解析结果对象

        Returns:
            str: JSONL 格式的字符串
        """
        return self.format_blocks(parse_result.blocks)

    def _format_single_block(self, block: ParsedBlock) -> str | None:
        """格式化单个块"""
        # 构建输出字典
        output_dict = {}

        # 应用字段映射
        for mapping in self.config.field_mappings:
            source_value = self._get_source_value(block, mapping.source_field)

            if source_value is None and mapping.required:
                logger.warning(f"Required field '{mapping.source_field}' is missing in block at line {block.line_number}")
                continue

            if source_value is not None:
                # 应用转换函数
                if mapping.transformer:
                    try:
                        source_value = mapping.transformer(source_value)
                    except Exception as e:
                        logger.error(f"Field transformer failed for '{mapping.source_field}': {e}")
                        continue

                output_dict[mapping.target_field] = source_value

        # 添加属性字段
        for attr_key, attr_value in block.attributes.items():
            if attr_key not in output_dict:  # 避免覆盖已映射的字段
                output_dict[attr_key] = attr_value

        # 排除空字段
        if self.config.exclude_empty_fields:
            output_dict = {k: v for k, v in output_dict.items()
                          if v is not None and v != "" and v != []}

        # 添加元数据
        if self.config.include_metadata:
            output_dict["_metadata"] = {
                "line_number": block.line_number,
                "is_valid": block.is_valid,
                "original_json": block.raw_json if self.config.include_line_numbers else None
            }

        # 序列化为 JSON
        return self._serialize_to_json(output_dict)

    def _get_source_value(self, block: ParsedBlock, field_name: str) -> Any:
        """获取源字段值"""
        if field_name == "type":
            return block.type
        elif field_name == "content":
            return block.content
        else:
            return block.get_attribute(field_name)

    def _serialize_to_json(self, data: dict[str, Any]) -> str:
        """序列化字典为 JSON 字符串"""
        json_kwargs = {
            "ensure_ascii": self.config.ensure_ascii,
            "sort_keys": self.config.sort_keys,
        }

        if self.config.output_format == OutputFormat.COMPACT:
            json_kwargs["separators"] = (',', ':')
        elif self.config.output_format == OutputFormat.PRETTY:
            json_kwargs["indent"] = 2
        elif self.config.output_format == OutputFormat.MINIFIED:
            json_kwargs["separators"] = (',', ':')

        # 自定义分隔符
        if self.config.custom_separators:
            json_kwargs["separators"] = (
                self.config.custom_separators.get("item_separator", ","),
                self.config.custom_separators.get("key_separator", ":")
            )

        return json.dumps(data, **json_kwargs)

    def _create_fallback_block(self, block: ParsedBlock, error_msg: str) -> str | None:
        """创建错误恢复块"""
        fallback_dict = {
            "t" if self.config.use_short_field_names else "type": "error",
            "c" if self.config.use_short_field_names else "content": f"格式化错误: {error_msg}",
            "original_content": block.content[:100] if len(block.content) > 100 else block.content,
            "line_number": block.line_number
        }

        return self._serialize_to_json(fallback_dict)

class ConditionalFormatter(JsonlFormatter):
    """条件格式化器，可根据条件选择不同的格式化策略"""

    def __init__(self, formatters: dict[str, JsonlFormatter],
                 condition_func: Callable[[ParsedBlock], str]):
        """
        Args:
            formatters: 格式化器映射 {condition_key: formatter}
            condition_func: 条件函数，返回格式化器的键
        """
        self.formatters = formatters
        self.condition_func = condition_func

    def format_blocks(self, blocks: list[ParsedBlock]) -> str:
        """使用条件格式化块列表"""
        grouped_blocks = self._group_blocks_by_condition(blocks)

        all_lines = []
        for condition_key, condition_blocks in grouped_blocks.items():
            if condition_key in self.formatters:
                formatter = self.formatters[condition_key]
                formatted = formatter.format_blocks(condition_blocks)
                if formatted:
                    all_lines.append(formatted)
            else:
                logger.warning(f"No formatter found for condition: {condition_key}")

        return '\n'.join(all_lines)

    def _group_blocks_by_condition(self, blocks: list[ParsedBlock]) -> dict[str, list[ParsedBlock]]:
        """按条件分组块"""
        groups = {}
        for block in blocks:
            condition_key = self.condition_func(block)
            if condition_key not in groups:
                groups[condition_key] = []
            groups[condition_key].append(block)

        return groups

class StreamingFormatter:
    """流式格式化器，适用于大量数据的实时处理"""

    def __init__(self, formatter: JsonlFormatter, batch_size: int = 1000):
        self.formatter = formatter
        self.batch_size = batch_size

    def format_blocks_streaming(self, blocks: list[ParsedBlock]) -> list[str]:
        """
        流式格式化，返回批次化的 JSONL 字符串列表

        Returns:
            List[str]: 每个元素是一个批次的 JSONL 字符串
        """
        batches = []

        for i in range(0, len(blocks), self.batch_size):
            batch_blocks = blocks[i:i + self.batch_size]
            batch_output = self.formatter.format_blocks(batch_blocks)
            if batch_output:
                batches.append(batch_output)

        return batches

# 预定义格式化器
def create_compact_formatter() -> JsonlFormatter:
    """创建紧凑格式的格式化器"""
    config = FormatterConfig(
        output_format=OutputFormat.COMPACT,
        use_short_field_names=True,
        exclude_empty_fields=True
    )
    return JsonlFormatter(config)

def create_pretty_formatter() -> JsonlFormatter:
    """创建美化格式的格式化器"""
    config = FormatterConfig(
        output_format=OutputFormat.PRETTY,
        use_short_field_names=False,
        include_metadata=True,
        exclude_empty_fields=False
    )
    return JsonlFormatter(config)

def create_debug_formatter() -> JsonlFormatter:
    """创建调试格式的格式化器"""
    config = FormatterConfig(
        output_format=OutputFormat.PRETTY,
        use_short_field_names=False,
        include_line_numbers=True,
        include_metadata=True,
        exclude_empty_fields=False
    )
    return JsonlFormatter(config)

def create_type_based_formatter() -> ConditionalFormatter:
    """创建基于块类型的条件格式化器"""
    compact_formatter = create_compact_formatter()
    pretty_formatter = create_pretty_formatter()

    formatters = {
        "structure": pretty_formatter,  # 标题等结构性元素使用美化格式
        "content": compact_formatter,   # 内容元素使用紧凑格式
    }

    def condition_func(block: ParsedBlock) -> str:
        if block.type in ["h1", "h2", "h3"]:
            return "structure"
        return "content"

    return ConditionalFormatter(formatters, condition_func)

# 便捷函数
def format_blocks_compact(blocks: list[ParsedBlock]) -> str:
    """便捷函数：紧凑格式化块列表"""
    formatter = create_compact_formatter()
    return formatter.format_blocks(blocks)

def format_blocks_pretty(blocks: list[ParsedBlock]) -> str:
    """便捷函数：美化格式化块列表"""
    formatter = create_pretty_formatter()
    return formatter.format_blocks(blocks)

def format_parse_result(parse_result: ParseResult,
                       format_type: str = "compact") -> str:
    """
    便捷函数：格式化解析结果

    Args:
        parse_result: 解析结果
        format_type: 格式类型 ("compact", "pretty", "debug")
    """
    formatters = {
        "compact": create_compact_formatter(),
        "pretty": create_pretty_formatter(),
        "debug": create_debug_formatter(),
    }

    formatter = formatters.get(format_type, create_compact_formatter())
    return formatter.format_parse_result(parse_result)

# 导出的公共接口
__all__ = [
    'JsonlFormatter',
    'ConditionalFormatter',
    'StreamingFormatter',
    'FormatterConfig',
    'FieldMapping',
    'OutputFormat',
    'create_compact_formatter',
    'create_pretty_formatter',
    'create_debug_formatter',
    'create_type_based_formatter',
    'format_blocks_compact',
    'format_blocks_pretty',
    'format_parse_result'
]
