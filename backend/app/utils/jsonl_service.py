"""
高级 JSONL 服务模块

提供统一的 JSONL 处理服务，整合解析器和格式化器，支持：
- 端到端的 JSONL 处理流水线
- 智能错误恢复和处理
- 性能监控和统计
- 缓存和优化
- 插件扩展
"""

import asyncio
import hashlib
import json
import logging
import re
import time
from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

from .jsonl_formatter import (
    create_compact_formatter,
    create_pretty_formatter,
)
from .jsonl_parser import (
    ErrorType,
    ParsedBlock,
    ParseOptions,
    ParseResult,
    create_parser,
)

logger = logging.getLogger(__name__)

@dataclass
class ProcessingStats:
    """处理统计信息"""
    total_lines: int = 0
    processed_lines: int = 0
    successful_blocks: int = 0
    failed_blocks: int = 0
    error_count: int = 0
    warning_count: int = 0
    processing_time: float = 0.0
    cache_hits: int = 0
    cache_misses: int = 0

    @property
    def success_rate(self) -> float:
        """成功率"""
        if self.total_lines == 0:
            return 0.0
        return self.successful_blocks / self.total_lines

    @property
    def error_rate(self) -> float:
        """错误率"""
        if self.total_lines == 0:
            return 0.0
        return self.error_count / self.total_lines

    @property
    def cache_hit_rate(self) -> float:
        """缓存命中率"""
        total_requests = self.cache_hits + self.cache_misses
        if total_requests == 0:
            return 0.0
        return self.cache_hits / total_requests

@dataclass
class ServiceConfig:
    """服务配置"""
    enable_caching: bool = True
    cache_size: int = 1000
    enable_stats: bool = True
    auto_recovery: bool = True
    max_retry_attempts: int = 3
    timeout_seconds: float = 30.0
    enable_preprocessing: bool = True
    enable_validation: bool = True

class JsonlService:
    """高级 JSONL 处理服务"""

    def __init__(self, config: ServiceConfig | None = None):
        self.config = config or ServiceConfig()
        self.parser = create_parser()
        self.compact_formatter = create_compact_formatter()
        self.pretty_formatter = create_pretty_formatter()
        self.stats = ProcessingStats()
        self._cache = {} if self.config.enable_caching else None
        self._custom_processors: list[Callable] = []

    def register_custom_processor(self, processor: Callable[[list[ParsedBlock]], list[ParsedBlock]]):
        """注册自定义后处理器"""
        self._custom_processors.append(processor)
        logger.info("Registered custom processor")

    async def process_content(self, content: str,
                            parse_options: ParseOptions | None = None,
                            format_type: str = "compact") -> dict[str, Any]:
        """
        处理 JSONL 内容的主要接口

        Args:
            content: 原始内容字符串
            parse_options: 解析选项
            format_type: 输出格式类型

        Returns:
            Dict[str, Any]: 处理结果
        """
        start_time = time.time()

        try:
            # 检查缓存
            cache_key = self._generate_cache_key(content, parse_options, format_type)
            cached_result = self._get_from_cache(cache_key)
            if cached_result:
                self.stats.cache_hits += 1
                return cached_result

            self.stats.cache_misses += 1

            # 检测输入格式
            input_format = self._detect_input_format(content)

            # 解析内容
            parse_result = await self._parse_with_retry(content, parse_options)

            # 应用自定义处理器
            processed_blocks = self._apply_custom_processors(parse_result.blocks)
            parse_result.blocks = processed_blocks

            # 格式化输出
            formatted_output = self._format_output(parse_result, format_type)

            # 更新统计
            self._update_stats(parse_result, time.time() - start_time)

            # 构建结果
            result = {
                "success": parse_result.success,
                "input_format": input_format,
                "output_format": format_type,
                "content": formatted_output,
                "blocks": [self._block_to_dict(block) for block in parse_result.blocks],
                "stats": {
                    "total_lines": parse_result.total_lines,
                    "processed_lines": parse_result.processed_lines,
                    "successful_blocks": len(parse_result.blocks),
                    "error_count": len(parse_result.errors),
                    "warning_count": len(parse_result.warnings),
                    "processing_time": time.time() - start_time
                },
                "errors": [self._error_to_dict(error) for error in parse_result.errors],
                "warnings": [self._warning_to_dict(warning) for warning in parse_result.warnings],
                "metadata": {
                    "cache_used": False,
                    "input_hash": hashlib.md5(content.encode()).hexdigest()[:8],
                    "timestamp": time.time()
                }
            }

            # 缓存结果
            self._save_to_cache(cache_key, result)

            return result

        except asyncio.TimeoutError:
            return self._create_error_result("Processing timeout", start_time)
        except Exception as e:
            logger.error(f"Processing failed: {str(e)}")
            return self._create_error_result(f"Processing error: {str(e)}", start_time)

    def process_content_sync(self, content: str,
                           parse_options: ParseOptions | None = None,
                           format_type: str = "compact") -> dict[str, Any]:
        """同步处理接口"""
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            return loop.run_until_complete(
                asyncio.wait_for(
                    self.process_content(content, parse_options, format_type),
                    timeout=self.config.timeout_seconds
                )
            )
        finally:
            loop.close()

    async def validate_jsonl(self, content: str) -> dict[str, Any]:
        """验证 JSONL 内容的有效性"""
        parse_options = ParseOptions(strict_mode=True, max_errors=50)
        result = await self.process_content(content, parse_options, "compact")

        return {
            "is_valid": result["success"] and len(result["errors"]) == 0,
            "error_count": len(result["errors"]),
            "warning_count": len(result["warnings"]),
            "block_count": len(result["blocks"]),
            "errors": result["errors"],
            "warnings": result["warnings"],
            "summary": self._generate_validation_summary(result)
        }

    async def convert_format(self, content: str,
                           from_format: str = "auto",
                           to_format: str = "compact") -> dict[str, Any]:
        """格式转换"""
        # 如果输入已经是 JSONL，直接重新格式化
        if from_format == "jsonl" or self._is_jsonl_content(content):
            return await self.process_content(content, format_type=to_format)

        # 否则需要先转换为块结构，再格式化
        # 这里可以扩展支持 Markdown、XML 等格式的转换
        return await self.process_content(content, format_type=to_format)

    def get_processing_stats(self) -> dict[str, Any]:
        """获取处理统计信息"""
        return {
            "total_lines": self.stats.total_lines,
            "processed_lines": self.stats.processed_lines,
            "successful_blocks": self.stats.successful_blocks,
            "failed_blocks": self.stats.failed_blocks,
            "error_count": self.stats.error_count,
            "warning_count": self.stats.warning_count,
            "processing_time": self.stats.processing_time,
            "success_rate": self.stats.success_rate,
            "error_rate": self.stats.error_rate,
            "cache_hits": self.stats.cache_hits,
            "cache_misses": self.stats.cache_misses,
            "cache_hit_rate": self.stats.cache_hit_rate
        }

    def reset_stats(self):
        """重置统计信息"""
        self.stats = ProcessingStats()

    def clear_cache(self):
        """清空缓存"""
        if self._cache:
            self._cache.clear()
            logger.info("Cache cleared")

    async def _parse_with_retry(self, content: str,
                              parse_options: ParseOptions | None) -> ParseResult:
        """带重试的解析"""
        last_exception = None

        for attempt in range(self.config.max_retry_attempts):
            try:
                result = await self.parser.parse(content, parse_options)

                # 如果启用了自动恢复且有错误，尝试修复
                if self.config.auto_recovery and result.has_errors:
                    result = await self._attempt_auto_recovery(content, result, parse_options)

                return result

            except Exception as e:
                last_exception = e
                logger.warning(f"Parse attempt {attempt + 1} failed: {str(e)}")

                if attempt < self.config.max_retry_attempts - 1:
                    await asyncio.sleep(0.1 * (attempt + 1))  # 指数退避

        # 所有重试都失败，返回错误结果
        raise last_exception

    async def _attempt_auto_recovery(self, content: str, failed_result: ParseResult,
                                   parse_options: ParseOptions | None) -> ParseResult:
        """尝试自动恢复错误"""
        logger.info(f"Attempting auto recovery for {len(failed_result.errors)} errors")

        # 分析错误类型并尝试修复
        recovery_strategies = {
            ErrorType.INVALID_JSON: self._fix_json_errors,
            ErrorType.MISSING_REQUIRED_FIELD: self._fix_missing_fields,
            ErrorType.ENCODING_ERROR: self._fix_encoding_errors,
        }

        fixed_content = content

        for error_type, strategy in recovery_strategies.items():
            errors_of_type = failed_result.get_errors_by_type(error_type)
            if errors_of_type:
                try:
                    fixed_content = await strategy(fixed_content, errors_of_type)
                except Exception as e:
                    logger.warning(f"Recovery strategy failed for {error_type}: {e}")

        # 如果内容被修改，重新解析
        if fixed_content != content:
            logger.info("Content was modified during recovery, re-parsing")
            return await self.parser.parse(fixed_content, parse_options)

        return failed_result

    async def _fix_json_errors(self, content: str, errors: list) -> str:
        """修复 JSON 语法错误"""
        lines = content.split('\n')

        for error in errors:
            line_idx = error.line_number - 1
            if 0 <= line_idx < len(lines):
                line = lines[line_idx]

                # 尝试修复常见的 JSON 错误
                fixed_line = self._fix_json_line(line)
                if fixed_line != line:
                    lines[line_idx] = fixed_line
                    logger.debug(f"Fixed JSON error at line {error.line_number}")

        return '\n'.join(lines)

    def _fix_json_line(self, line: str) -> str:
        """修复单行 JSON 错误"""
        # 添加缺失的引号
        line = re.sub(r'\b(\w+):', r'"\1":', line)

        # 移除多余的逗号
        line = re.sub(r',\s*([}\]])', r'\1', line)

        # 修复单引号
        line = line.replace("'", '"')

        return line

    async def _fix_missing_fields(self, content: str, errors: list) -> str:
        """修复缺失字段错误"""
        # 这里可以实现自动添加默认字段的逻辑
        return content

    async def _fix_encoding_errors(self, content: str, errors: list) -> str:
        """修复编码错误"""
        try:
            # 尝试重新编码
            return content.encode('utf-8', errors='replace').decode('utf-8')
        except Exception:
            return content

    def _apply_custom_processors(self, blocks: list[ParsedBlock]) -> list[ParsedBlock]:
        """应用自定义处理器"""
        processed_blocks = blocks

        for processor in self._custom_processors:
            try:
                processed_blocks = processor(processed_blocks)
            except Exception as e:
                logger.error(f"Custom processor failed: {e}")

        return processed_blocks

    def _format_output(self, parse_result: ParseResult, format_type: str) -> str:
        """格式化输出"""
        formatters = {
            "compact": self.compact_formatter,
            "pretty": self.pretty_formatter,
        }

        formatter = formatters.get(format_type, self.compact_formatter)
        return formatter.format_parse_result(parse_result)

    def _detect_input_format(self, content: str) -> str:
        """检测输入格式"""
        if self._is_jsonl_content(content):
            return "jsonl"
        elif content.strip().startswith('#') or content.strip().startswith('##'):
            return "markdown"
        elif content.strip().startswith('<'):
            return "html"
        else:
            return "text"

    def _is_jsonl_content(self, content: str) -> bool:
        """检测是否为 JSONL 内容"""
        if not content or not content.strip():
            return False

        lines = [line.strip() for line in content.strip().split('\n') if line.strip()]
        if not lines:
            return False

        try:
            first_line = lines[0]
            parsed = json.loads(first_line)
            return (
                isinstance(parsed, dict) and
                ("type" in parsed or "t" in parsed) and
                ("content" in parsed or "c" in parsed)
            )
        except:
            return False

    def _generate_cache_key(self, content: str, parse_options: ParseOptions | None,
                          format_type: str) -> str:
        """生成缓存键"""
        content_hash = hashlib.md5(content.encode()).hexdigest()
        options_hash = hashlib.md5(str(parse_options).encode()).hexdigest() if parse_options else "default"
        return f"{content_hash}_{options_hash}_{format_type}"

    def _get_from_cache(self, cache_key: str) -> dict[str, Any] | None:
        """从缓存获取结果"""
        if not self.config.enable_caching or not self._cache:
            return None

        return self._cache.get(cache_key)

    def _save_to_cache(self, cache_key: str, result: dict[str, Any]):
        """保存结果到缓存"""
        if not self.config.enable_caching or not self._cache:
            return

        # 简单的 LRU 实现
        if len(self._cache) >= self.config.cache_size:
            # 删除最旧的条目
            oldest_key = next(iter(self._cache))
            del self._cache[oldest_key]

        result["metadata"]["cache_used"] = True
        self._cache[cache_key] = result

    def _update_stats(self, parse_result: ParseResult, processing_time: float):
        """更新统计信息"""
        if not self.config.enable_stats:
            return

        self.stats.total_lines += parse_result.total_lines
        self.stats.processed_lines += parse_result.processed_lines
        self.stats.successful_blocks += len(parse_result.blocks)
        self.stats.failed_blocks += parse_result.total_lines - len(parse_result.blocks)
        self.stats.error_count += len(parse_result.errors)
        self.stats.warning_count += len(parse_result.warnings)
        self.stats.processing_time += processing_time

    def _create_error_result(self, error_message: str, start_time: float) -> dict[str, Any]:
        """创建错误结果"""
        return {
            "success": False,
            "error": error_message,
            "content": "",
            "blocks": [],
            "stats": {
                "processing_time": time.time() - start_time,
                "error_count": 1
            },
            "errors": [{"message": error_message, "type": "system_error"}],
            "warnings": [],
            "metadata": {
                "timestamp": time.time()
            }
        }

    def _block_to_dict(self, block: ParsedBlock) -> dict[str, Any]:
        """将块对象转换为字典"""
        return {
            "type": block.type,
            "content": block.content,
            "attributes": block.attributes,
            "line_number": block.line_number,
            "is_valid": block.is_valid
        }

    def _error_to_dict(self, error) -> dict[str, Any]:
        """将错误对象转换为字典"""
        return {
            "type": error.type.value,
            "message": error.message,
            "line_number": error.line_number,
            "suggestions": error.suggestions,
        }

    def _warning_to_dict(self, warning) -> dict[str, Any]:
        """将警告对象转换为字典"""
        return {
            "message": warning.message,
            "line_number": warning.line_number,
            "context": warning.context
        }

    def _generate_validation_summary(self, result: dict[str, Any]) -> str:
        """生成验证摘要"""
        if result["success"] and len(result["errors"]) == 0:
            return f"Valid JSONL with {len(result['blocks'])} blocks"
        else:
            return f"Invalid JSONL: {len(result['errors'])} errors, {len(result['warnings'])} warnings"

# 便捷函数
def create_service(config: ServiceConfig | None = None) -> JsonlService:
    """创建服务实例"""
    return JsonlService(config)

async def process_jsonl_content(content: str,
                              format_type: str = "compact") -> dict[str, Any]:
    """便捷的异步处理函数"""
    service = create_service()
    return await service.process_content(content, format_type=format_type)

def process_jsonl_content_sync(content: str,
                             format_type: str = "compact") -> dict[str, Any]:
    """便捷的同步处理函数"""
    service = create_service()
    return service.process_content_sync(content, format_type=format_type)

# 导出的公共接口
__all__ = [
    'JsonlService',
    'ServiceConfig',
    'ProcessingStats',
    'create_service',
    'process_jsonl_content',
    'process_jsonl_content_sync'
]
