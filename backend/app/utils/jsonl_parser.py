"""
高性能、可扩展的 JSONL 内容解析器

这个模块提供了一个完整的 JSONL 解析解决方案，支持：
- 灵活的块类型系统
- 可扩展的属性验证
- 详细的错误处理和报告
- 插件化架构
- 性能优化的流式处理
"""

import asyncio
import json
import logging
import re
from dataclasses import dataclass, field
from enum import Enum
from typing import (
    Any,
    Protocol,
    TypeVar,
    runtime_checkable,
)

logger = logging.getLogger(__name__)

# Type definitions
T = TypeVar("T")


class ErrorType(Enum):
    """错误类型枚举"""

    INVALID_JSON = "invalid_json"
    MISSING_REQUIRED_FIELD = "missing_field"
    INVALID_BLOCK_TYPE = "invalid_type"
    INVALID_ATTRIBUTE = "invalid_attr"
    CONTENT_EMPTY = "empty_content"
    REFERENCE_NOT_FOUND = "ref_not_found"
    ENCODING_ERROR = "encoding_error"
    SIZE_LIMIT_EXCEEDED = "size_limit"


class BasicBlockType(Enum):
    """基础块类型定义"""

    H1 = "h1"
    H2 = "h2"
    H3 = "h3"
    P = "p"
    INSIGHT = "insight"
    CONCEPT = "concept"
    LIST = "list"
    QUOTE = "quote"
    QA = "qa"
    ACTION = "action"


@dataclass
class ParseError:
    """解析错误信息"""

    type: ErrorType
    message: str
    line_number: int
    suggestions: list[str] = field(default_factory=list)
    raw_content: str | None = None


@dataclass
class ParseWarning:
    """解析警告信息"""

    message: str
    line_number: int
    context: str | None = None


@dataclass
class ParsedBlock:
    """解析后的块对象"""

    type: str
    content: str
    attributes: dict[str, Any]
    line_number: int
    raw_json: str

    @property
    def is_valid(self) -> bool:
        """检查块是否有效"""
        return bool(self.type and self.content is not None)

    def get_attribute(self, key: str, default: Any = None) -> Any:
        """安全获取属性值"""
        return self.attributes.get(key, default)


@dataclass
class ParseResult:
    """解析结果"""

    success: bool
    blocks: list[ParsedBlock]
    errors: list[ParseError]
    warnings: list[ParseWarning]
    total_lines: int
    processed_lines: int

    @property
    def has_errors(self) -> bool:
        return len(self.errors) > 0

    @property
    def has_warnings(self) -> bool:
        return len(self.warnings) > 0

    @property
    def error_rate(self) -> float:
        """错误率"""
        if self.total_lines == 0:
            return 0.0
        return len(self.errors) / self.total_lines

    def get_errors_by_type(self, error_type: ErrorType) -> list[ParseError]:
        """按类型获取错误"""
        return [e for e in self.errors if e.type == error_type]


@dataclass
class PreprocessorConfig:
    """预处理器配置"""

    remove_code_blocks: bool = True
    trim_whitespace: bool = True
    fix_common_errors: bool = True
    validate_encoding: bool = True
    max_line_length: int = 10000
    normalize_quotes: bool = True


@dataclass
class ParseOptions:
    """解析选项"""

    strict_mode: bool = False
    max_errors: int = 100
    custom_validators: dict[str, "AttributeValidator"] = field(default_factory=dict)
    preprocessor: PreprocessorConfig = field(default_factory=PreprocessorConfig)
    allow_empty_content: bool = False
    auto_generate_mapping: bool = True
    batch_size: int = 1000


@runtime_checkable
class AttributeValidator(Protocol):
    """属性验证器协议"""

    def validate(self, value: Any, context: dict[str, Any]) -> tuple[bool, str | None]:
        """
        验证属性值

        Returns:
            (is_valid, error_message)
        """
        ...


@runtime_checkable
class BlockTypeDefinition(Protocol):
    """块类型定义协议"""

    @property
    def type_name(self) -> str:
        """块类型名称"""
        ...

    @property
    def required_attributes(self) -> set[str]:
        """必需属性集合"""
        ...

    @property
    def optional_attributes(self) -> set[str]:
        """可选属性集合"""
        ...

    def validate_block(self, block: dict[str, Any]) -> tuple[bool, list[str]]:
        """
        验证块内容

        Returns:
            (is_valid, error_messages)
        """
        ...


class DefaultBlockTypeDefinition:
    """默认块类型定义实现"""

    def __init__(
        self,
        type_name: str,
        required_attrs: set[str] | None = None,
        optional_attrs: set[str] | None = None,
    ):
        self._type_name = type_name
        self._required_attributes = required_attrs or {"t", "c"}
        self._optional_attributes = optional_attrs or {"ref", "expandable", "priority"}

    @property
    def type_name(self) -> str:
        return self._type_name

    @property
    def required_attributes(self) -> set[str]:
        return self._required_attributes

    @property
    def optional_attributes(self) -> set[str]:
        return self._optional_attributes

    def validate_block(self, block: dict[str, Any]) -> tuple[bool, list[str]]:
        """验证块内容"""
        errors = []

        # 检查必需字段
        for attr in self.required_attributes:
            if attr not in block and self._get_long_form(attr) not in block:
                errors.append(f"Missing required attribute: {attr}")

        # 检查内容是否为空
        content_field = "c" if "c" in block else "content"
        if content_field in block and not block[content_field]:
            errors.append("Content cannot be empty")

        return len(errors) == 0, errors

    def _get_long_form(self, short_attr: str) -> str:
        """获取属性的长格式名称"""
        mapping = {
            "t": "type",
            "c": "content",
        }
        return mapping.get(short_attr, short_attr)


class RegexValidator:
    """正则表达式验证器"""

    def __init__(self, pattern: str, error_message: str):
        self.pattern = re.compile(pattern)
        self.error_message = error_message

    def validate(self, value: Any, context: dict[str, Any]) -> tuple[bool, str | None]:
        if not isinstance(value, str):
            return False, f"Expected string, got {type(value).__name__}"

        if not self.pattern.match(value):
            return False, self.error_message

        return True, None


class LengthValidator:
    """长度验证器"""

    def __init__(self, min_length: int = 0, max_length: int = 1000):
        self.min_length = min_length
        self.max_length = max_length

    def validate(self, value: Any, context: dict[str, Any]) -> tuple[bool, str | None]:
        if not isinstance(value, str):
            return False, f"Expected string, got {type(value).__name__}"

        length = len(value)
        if length < self.min_length:
            return False, f"Content too short (min: {self.min_length}, got: {length})"

        if length > self.max_length:
            return False, f"Content too long (max: {self.max_length}, got: {length})"

        return True, None


class JsonlPreprocessor:
    """JSONL 预处理器"""

    def __init__(self, config: PreprocessorConfig):
        self.config = config

    def preprocess(self, content: str) -> str:
        """预处理 JSONL 内容"""
        if not content:
            return content

        # 编码验证
        if self.config.validate_encoding:
            content = self._validate_encoding(content)

        # 移除代码块标记
        if self.config.remove_code_blocks:
            content = self._remove_code_blocks(content)

        # 修复常见错误
        if self.config.fix_common_errors:
            content = self._fix_common_errors(content)

        # 规范化引号
        if self.config.normalize_quotes:
            content = self._normalize_quotes(content)

        # 清理空白字符
        if self.config.trim_whitespace:
            content = self._trim_whitespace(content)

        return content

    def _validate_encoding(self, content: str) -> str:
        """验证和修复编码问题"""
        try:
            # 尝试编码为 UTF-8 然后解码，检查是否有问题
            content.encode("utf-8").decode("utf-8")
            return content
        except UnicodeError:
            logger.warning("Detected encoding issues, attempting to fix")
            # 使用 errors='replace' 替换有问题的字符
            return content.encode("utf-8", errors="replace").decode("utf-8")

    def _remove_code_blocks(self, content: str) -> str:
        """移除 markdown 代码块标记"""
        # 移除 ```jsonl、```json 和 ``` 标记
        # 注意：jsonl 必须在 json 前面，避免 jsonl 被误匹配为 json
        content = re.sub(
            r"^```(?:jsonl|json)\s*\n?", "", content, flags=re.MULTILINE | re.IGNORECASE
        )
        content = re.sub(r"^```\s*$", "", content, flags=re.MULTILINE)
        return content

    def _fix_common_errors(self, content: str) -> str:
        """修复常见的 JSON 格式错误"""
        lines = content.split("\n")
        fixed_lines = []

        for line in lines:
            line = line.strip()
            if not line:
                continue

            # 修复缺少引号的情况
            line = self._fix_missing_quotes(line)

            # 修复多余逗号
            line = self._fix_trailing_commas(line)

            fixed_lines.append(line)

        return "\n".join(fixed_lines)

    def _fix_missing_quotes(self, line: str) -> str:
        """修复缺少引号的 JSON 字段"""
        # 简单的启发式修复：如果看起来是 key: value 格式，尝试添加引号
        patterns = [
            (
                r'\b(\w+):\s*([^",}\]]+)(?=\s*[,}])',
                r'"\1": "\2"',
            ),  # key: value -> "key": "value"
            (r'\b(\w+):\s*"([^"]*)"', r'"\1": "\2"'),  # key: "value" -> "key": "value"
        ]

        for pattern, replacement in patterns:
            line = re.sub(pattern, replacement, line)

        return line

    def _fix_trailing_commas(self, line: str) -> str:
        """移除多余的逗号"""
        # 移除 } 或 ] 前的逗号
        line = re.sub(r",\s*([}\]])", r"\1", line)
        return line

    def _normalize_quotes(self, content: str) -> str:
        """规范化引号（将中文引号等转换为标准双引号）"""
        # 中文引号转换
        content = content.replace('"', '"').replace('"', '"')
        content = content.replace(""", "'").replace(""", "'")
        return content

    def _trim_whitespace(self, content: str) -> str:
        """清理多余的空白字符"""
        lines = [line.strip() for line in content.split("\n") if line.strip()]
        return "\n".join(lines)


class JsonlParser:
    """高性能 JSONL 解析器"""

    def __init__(self):
        self._block_types: dict[str, BlockTypeDefinition] = {}
        self._attribute_validators: dict[str, AttributeValidator] = {}
        self._preprocessor = JsonlPreprocessor(PreprocessorConfig())
        self._setup_default_types()
        self._setup_default_validators()

    def _setup_default_types(self):
        """设置默认的块类型"""
        for block_type in BasicBlockType:
            self.register_block_type(
                block_type.value, DefaultBlockTypeDefinition(block_type.value)
            )

    def _setup_default_validators(self):
        """设置默认的属性验证器"""
        self.register_attribute_validator(
            "content", LengthValidator(min_length=0, max_length=10000)
        )
        self.register_attribute_validator(
            "c", LengthValidator(min_length=0, max_length=10000)
        )

    def register_block_type(self, type_name: str, definition: BlockTypeDefinition):
        """注册新的块类型"""
        self._block_types[type_name] = definition
        logger.debug(f"Registered block type: {type_name}")

    def register_attribute_validator(
        self, attribute: str, validator: AttributeValidator
    ):
        """注册属性验证器"""
        self._attribute_validators[attribute] = validator
        logger.debug(f"Registered attribute validator: {attribute}")

    def get_supported_block_types(self) -> list[str]:
        """获取支持的块类型列表"""
        return list(self._block_types.keys())

    async def parse(
        self, content: str, options: ParseOptions | None = None
    ) -> ParseResult:
        """
        异步解析 JSONL 内容

        Args:
            content: JSONL 格式的内容字符串
            options: 解析选项

        Returns:
            ParseResult: 解析结果
        """
        if options is None:
            options = ParseOptions()

        # 更新预处理器配置
        if options.preprocessor:
            self._preprocessor = JsonlPreprocessor(options.preprocessor)

        # 预处理
        try:
            preprocessed_content = self._preprocessor.preprocess(content)
        except Exception as e:
            return ParseResult(
                success=False,
                blocks=[],
                errors=[
                    ParseError(
                        type=ErrorType.ENCODING_ERROR,
                        message=f"Preprocessing failed: {str(e)}",
                        line_number=0,
                    )
                ],
                warnings=[],
                total_lines=0,
                processed_lines=0,
            )

        # 分行处理
        lines = preprocessed_content.split("\n")
        total_lines = len(lines)

        # 批量处理
        blocks = []
        errors = []
        warnings = []
        processed_lines = 0

        for i in range(0, len(lines), options.batch_size):
            batch_lines = lines[i : i + options.batch_size]
            batch_result = await self._parse_batch(batch_lines, i + 1, options)

            blocks.extend(batch_result.blocks)
            errors.extend(batch_result.errors)
            warnings.extend(batch_result.warnings)
            processed_lines += batch_result.processed_lines

            # 检查错误限制
            if len(errors) >= options.max_errors:
                if options.strict_mode:
                    break
                warnings.append(
                    ParseWarning(
                        message=f"Reached maximum error limit ({options.max_errors})",
                        line_number=i + len(batch_lines),
                    )
                )
                break

        # 后处理：建立引用关系
        self._establish_references(blocks, warnings)

        success = len(errors) == 0 or not options.strict_mode

        return ParseResult(
            success=success,
            blocks=blocks,
            errors=errors,
            warnings=warnings,
            total_lines=total_lines,
            processed_lines=processed_lines,
        )

    async def _parse_batch(
        self, lines: list[str], start_line: int, options: ParseOptions
    ) -> ParseResult:
        """批量解析行"""
        blocks = []
        errors = []
        warnings = []
        processed = 0

        for i, line in enumerate(lines):
            line_number = start_line + i
            line = line.strip()

            if not line:
                continue

            try:
                # 检查行长度
                if len(line) > options.preprocessor.max_line_length:
                    errors.append(
                        ParseError(
                            type=ErrorType.SIZE_LIMIT_EXCEEDED,
                            message=f"Line too long ({len(line)} > {options.preprocessor.max_line_length})",
                            line_number=line_number,
                            raw_content=line[:100] + "..." if len(line) > 100 else line,
                        )
                    )
                    continue

                # 解析 JSON
                try:
                    block_data = json.loads(line)
                except json.JSONDecodeError as e:
                    errors.append(
                        ParseError(
                            type=ErrorType.INVALID_JSON,
                            message=f"Invalid JSON: {str(e)}",
                            line_number=line_number,
                            suggestions=[
                                "Check for missing quotes",
                                "Check for trailing commas",
                            ],
                            raw_content=line,
                        )
                    )
                    continue

                # 验证是否为字典
                if not isinstance(block_data, dict):
                    # 尝试包装为段落块
                    block_data = {
                        "type": "p",
                        "content": str(block_data),
                        "mapping": f"auto_{line_number}",
                    }
                    warnings.append(
                        ParseWarning(
                            message="Non-dictionary JSON converted to paragraph block",
                            line_number=line_number,
                            context=line,
                        )
                    )

                # 标准化字段名
                block_data = self._normalize_field_names(block_data)

                # 自动生成映射
                if options.auto_generate_mapping and "mapping" not in block_data:
                    block_data["mapping"] = f"auto_{line_number}"

                # 验证块
                block_errors = self._validate_block(block_data, line_number, options)
                if block_errors:
                    errors.extend(block_errors)
                    if options.strict_mode:
                        continue

                # 创建解析后的块
                parsed_block = self._create_parsed_block(block_data, line_number, line)
                blocks.append(parsed_block)
                processed += 1

            except Exception as e:
                errors.append(
                    ParseError(
                        type=ErrorType.INVALID_JSON,
                        message=f"Unexpected error: {str(e)}",
                        line_number=line_number,
                        raw_content=line,
                    )
                )

        return ParseResult(
            success=len(errors) == 0,
            blocks=blocks,
            errors=errors,
            warnings=warnings,
            total_lines=len(lines),
            processed_lines=processed,
        )

    def _normalize_field_names(self, block_data: dict[str, Any]) -> dict[str, Any]:
        """标准化字段名称"""
        # 处理短字段名
        if "t" in block_data and "type" not in block_data:
            block_data["type"] = block_data["t"]

        if "c" in block_data and "content" not in block_data:
            block_data["content"] = block_data["c"]

        # 设置默认值
        if "type" not in block_data and "t" not in block_data:
            block_data["type"] = "p"

        if "content" not in block_data and "c" not in block_data:
            block_data["content"] = ""

        return block_data

    def _validate_block(
        self, block_data: dict[str, Any], line_number: int, options: ParseOptions
    ) -> list[ParseError]:
        """验证块数据"""
        errors = []

        # 获取块类型
        block_type = block_data.get("type") or block_data.get("t", "p")

        # 检查块类型是否支持
        if block_type not in self._block_types:
            # 如果是未知类型，将其注册为默认类型
            self.register_block_type(block_type, DefaultBlockTypeDefinition(block_type))

        # 使用块类型定义验证
        type_def = self._block_types[block_type]
        is_valid, error_messages = type_def.validate_block(block_data)

        if not is_valid:
            for msg in error_messages:
                errors.append(
                    ParseError(
                        type=ErrorType.MISSING_REQUIRED_FIELD,
                        message=msg,
                        line_number=line_number,
                    )
                )

        # 验证属性
        for attr, value in block_data.items():
            if attr in self._attribute_validators:
                validator = self._attribute_validators[attr]
                is_valid, error_msg = validator.validate(value, block_data)
                if not is_valid:
                    errors.append(
                        ParseError(
                            type=ErrorType.INVALID_ATTRIBUTE,
                            message=f"Invalid attribute '{attr}': {error_msg}",
                            line_number=line_number,
                        )
                    )

        # 自定义验证器
        for attr, validator in options.custom_validators.items():
            if attr in block_data:
                try:
                    is_valid, error_message = validator.validate(
                        block_data[attr], block_data
                    )
                    if not is_valid:
                        errors.append(
                            ParseError(
                                type=ErrorType.INVALID_ATTRIBUTE,
                                message=error_message
                                or f"Custom validation failed for '{attr}'",
                                line_number=line_number,
                            )
                        )
                except Exception as e:
                    errors.append(
                        ParseError(
                            type=ErrorType.INVALID_ATTRIBUTE,
                            message=f"Custom validator error for '{attr}': {str(e)}",
                            line_number=line_number,
                        )
                    )

        return errors

    def _create_parsed_block(
        self, block_data: dict[str, Any], line_number: int, raw_json: str
    ) -> ParsedBlock:
        """创建解析后的块对象"""
        # 提取核心字段
        block_type = block_data.get("type") or block_data.get("t", "p")
        content = block_data.get("content") or block_data.get("c", "")

        # 提取其他属性
        attributes = {
            k: v
            for k, v in block_data.items()
            if k not in ["type", "t", "content", "c"]
        }

        return ParsedBlock(
            type=block_type,
            content=content,
            attributes=attributes,
            line_number=line_number,
            raw_json=raw_json,
        )

    def _establish_references(
        self, blocks: list[ParsedBlock], warnings: list[ParseWarning]
    ):
        """建立块之间的引用关系"""
        # 创建段落编号到块的映射
        paragraph_map = {}
        for block in blocks:
            ref = block.get_attribute("ref")
            if ref:
                paragraph_map[ref] = block

        # 验证引用
        for block in blocks:
            ref = block.get_attribute("ref")
            if ref and ref not in paragraph_map:
                warnings.append(
                    ParseWarning(
                        message=f"Reference '{ref}' not found",
                        line_number=block.line_number,
                        context=f"Block type: {block.type}",
                    )
                )

    def parse_sync(
        self, content: str, options: ParseOptions | None = None
    ) -> ParseResult:
        """同步解析接口"""
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            return loop.run_until_complete(self.parse(content, options))
        finally:
            loop.close()


# 工厂函数和便捷接口
def create_parser() -> JsonlParser:
    """创建默认配置的解析器"""
    return JsonlParser()


async def parse_jsonl(content: str, options: ParseOptions | None = None) -> ParseResult:
    """便捷的异步解析函数"""
    parser = create_parser()
    return await parser.parse(content, options)


def parse_jsonl_sync(content: str, options: ParseOptions | None = None) -> ParseResult:
    """便捷的同步解析函数"""
    parser = create_parser()
    return parser.parse_sync(content, options)


# 导出的公共接口
__all__ = [
    "JsonlParser",
    "ParseResult",
    "ParsedBlock",
    "ParseError",
    "ParseWarning",
    "ParseOptions",
    "PreprocessorConfig",
    "ErrorType",
    "BasicBlockType",
    "AttributeValidator",
    "BlockTypeDefinition",
    "DefaultBlockTypeDefinition",
    "RegexValidator",
    "LengthValidator",
    "create_parser",
    "parse_jsonl",
    "parse_jsonl_sync",
]
