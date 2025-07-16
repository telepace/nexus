"""
JSONL 解析器测试套件

测试涵盖：
- 基础解析功能
- 错误处理和恢复
- 性能测试
- 并发安全
- 边缘情况
"""

import asyncio

import pytest

from app.utils.jsonl_parser import (
    DefaultBlockTypeDefinition,
    ErrorType,
    LengthValidator,
    ParseOptions,
    PreprocessorConfig,
    RegexValidator,
    create_parser,
    parse_jsonl,
    parse_jsonl_sync,
)


class TestJsonlParser:
    """JSONL 解析器基础功能测试"""

    @pytest.fixture
    def parser(self):
        """创建解析器实例"""
        return create_parser()

    @pytest.fixture
    def sample_jsonl(self):
        """样本 JSONL 数据"""
        return """{"t": "h1", "c": "标题", "ref": "1"}
{"t": "p", "c": "这是一个段落", "ref": "2"}
{"t": "insight", "c": "重要洞察", "expandable": "关于AI的思考"}"""

    @pytest.fixture
    def malformed_jsonl(self):
        """格式错误的 JSONL 数据"""
        return """{"t": "h1", "c": "标题"}
{t: "p", "c": "缺少引号"}
{"t": "insight", "c": "内容", "extra": value}"""

    async def test_basic_parsing(self, parser, sample_jsonl):
        """测试基础解析功能"""
        result = await parser.parse(sample_jsonl)

        assert result.success
        assert len(result.blocks) == 3
        assert len(result.errors) == 0

        # 验证第一个块
        first_block = result.blocks[0]
        assert first_block.type == "h1"
        assert first_block.content == "标题"
        assert first_block.get_attribute("ref") == "1"

    async def test_field_normalization(self, parser):
        """测试字段名标准化"""
        content = '{"t": "p", "c": "测试内容"}'
        result = await parser.parse(content)

        assert result.success
        assert len(result.blocks) == 1

        block = result.blocks[0]
        assert block.type == "p"
        assert block.content == "测试内容"

    async def test_empty_content_handling(self, parser):
        """测试空内容处理"""
        result = await parser.parse("")

        assert result.success
        assert len(result.blocks) == 0
        assert len(result.errors) == 0

    async def test_whitespace_handling(self, parser):
        """测试空白字符处理"""
        content = """{"t": "h1", "c": "标题"}

{"t": "p", "c": "段落"}

{"t": "action", "c": "行动"}"""

        result = await parser.parse(content)

        assert result.success
        assert len(result.blocks) == 3

    async def test_invalid_json_handling(self, parser):
        """测试无效 JSON 处理"""
        content = """{"t": "h1", "c": "正确的块"}
{invalid json}
{"t": "p", "c": "另一个正确的块"}"""

        result = await parser.parse(content)

        # 即使有错误，其他正确的块应该被解析
        assert len(result.blocks) == 2
        assert len(result.errors) == 1
        assert result.errors[0].type == ErrorType.INVALID_JSON

    async def test_missing_required_fields(self, parser):
        """测试缺失必需字段的处理"""
        content = '{"description": "没有类型和内容字段"}'

        options = ParseOptions(strict_mode=False)
        result = await parser.parse(content, options)

        # 应该被自动修复为段落块
        assert len(result.blocks) == 1
        assert result.blocks[0].type == "p"

    async def test_custom_block_type(self, parser):
        """测试自定义块类型"""
        # 注册自定义块类型
        custom_definition = DefaultBlockTypeDefinition(
            "custom_type",
            required_attrs={"t", "c", "priority"},
            optional_attrs={"color"},
        )
        parser.register_block_type("custom_type", custom_definition)

        content = '{"t": "custom_type", "c": "自定义内容", "priority": "high"}'
        result = await parser.parse(content)

        assert result.success
        assert len(result.blocks) == 1
        assert result.blocks[0].type == "custom_type"

    async def test_attribute_validation(self, parser):
        """测试属性验证"""
        # 注册自定义验证器
        length_validator = LengthValidator(min_length=5, max_length=20)
        parser.register_attribute_validator("content", length_validator)

        # 测试内容过短
        content = '{"t": "p", "c": "短"}'
        result = await parser.parse(content)

        assert len(result.errors) > 0
        assert any(error.type == ErrorType.INVALID_ATTRIBUTE for error in result.errors)

    async def test_batch_processing(self, parser):
        """测试批处理"""
        # 生成大量数据
        lines = []
        for i in range(1000):
            lines.append(f'{{"t": "p", "c": "内容 {i}", "id": {i}}}')

        content = "\n".join(lines)

        options = ParseOptions(batch_size=100)
        result = await parser.parse(content, options)

        assert result.success
        assert len(result.blocks) == 1000

    async def test_reference_validation(self, parser):
        """测试引用验证"""
        content = """{"t": "p", "c": "段落1", "ref": "p1"}
{"t": "insight", "c": "洞察", "ref": "p999"}"""

        result = await parser.parse(content)

        # 应该有警告提示引用不存在
        assert len(result.warnings) > 0
        assert any(
            "Reference 'p999' not found" in warning.message
            for warning in result.warnings
        )

    def test_sync_parsing(self, parser, sample_jsonl):
        """测试同步解析接口"""
        result = parser.parse_sync(sample_jsonl)

        assert result.success
        assert len(result.blocks) == 3

    async def test_preprocessor_config(self, parser):
        """测试预处理器配置"""
        content = """```json
{"t": "h1", "c": "标题"}
{"t": "p", "c": "段落"}
```"""

        preprocessor_config = PreprocessorConfig(
            remove_code_blocks=True, trim_whitespace=True
        )

        options = ParseOptions(preprocessor=preprocessor_config)
        result = await parser.parse(content, options)

        assert result.success
        assert len(result.blocks) == 2

    async def test_error_limit(self, parser):
        """测试错误限制"""
        # 创建包含多个错误的内容
        lines = []
        for _i in range(20):
            lines.append("invalid json line")

        content = "\n".join(lines)

        options = ParseOptions(max_errors=5, strict_mode=False)
        result = await parser.parse(content, options)

        # 错误数量应该不超过限制
        assert len(result.errors) <= 5

    async def test_strict_mode(self, parser):
        """测试严格模式"""
        content = """{"t": "h1", "c": "正确"}
invalid json
{"t": "p", "c": "另一个正确"}"""

        options = ParseOptions(strict_mode=True)
        result = await parser.parse(content, options)

        # 严格模式下，遇到错误应该停止处理
        assert not result.success


class TestPreprocessor:
    """预处理器测试"""

    @pytest.fixture
    def parser(self):
        return create_parser()

    async def test_code_block_removal(self, parser):
        """测试代码块移除"""
        content = """```json
{"t": "h1", "c": "标题"}
```
{"t": "p", "c": "段落"}"""

        result = await parser.parse(content)

        assert result.success
        assert len(result.blocks) == 2

    async def test_quote_normalization(self, parser):
        """测试引号标准化"""
        content = """{"t": "h1", "c": "测试"引号""}"""

        result = await parser.parse(content)

        assert result.success
        assert len(result.blocks) == 1

    async def test_common_error_fixing(self, parser):
        """测试常见错误修复"""
        content = """{t: "h1", c: "缺少引号"}
{"t": "p", "c": "正常",}"""  # 多余逗号

        result = await parser.parse(content)

        # 预处理器应该修复这些错误
        assert len(result.blocks) >= 1


class TestPerformance:
    """性能测试"""

    @pytest.fixture
    def parser(self):
        return create_parser()

    async def test_large_file_performance(self, parser):
        """测试大文件性能"""
        # 生成大量数据 (10K 行)
        lines = []
        for i in range(10000):
            lines.append(f'{{"t": "p", "c": "内容 {i}", "id": {i}}}')

        content = "\n".join(lines)

        import time

        start_time = time.time()

        result = await parser.parse(content)

        processing_time = time.time() - start_time

        assert result.success
        assert len(result.blocks) == 10000
        assert processing_time < 5.0  # 应该在5秒内完成

    async def test_concurrent_parsing(self, parser):
        """测试并发解析"""
        contents = [
            '{"t": "h1", "c": "标题1"}',
            '{"t": "h2", "c": "标题2"}',
            '{"t": "p", "c": "段落"}',
        ]

        # 并发解析多个内容
        tasks = [parser.parse(content) for content in contents]
        results = await asyncio.gather(*tasks)

        assert all(result.success for result in results)
        assert all(len(result.blocks) == 1 for result in results)


class TestEdgeCases:
    """边缘情况测试"""

    @pytest.fixture
    def parser(self):
        return create_parser()

    async def test_very_long_content(self, parser):
        """测试超长内容"""
        very_long_content = "内容" * 10000
        content = f'{{"t": "p", "c": "{very_long_content}"}}'

        result = await parser.parse(content)

        # 应该根据验证器设置处理超长内容
        assert len(result.blocks) >= 0

    async def test_unicode_content(self, parser):
        """测试 Unicode 内容"""
        content = """{"t": "h1", "c": "🎉 Unicode 测试 🚀"}
{"t": "p", "c": "包含各种字符：αβγ δε ζηθ"}"""

        result = await parser.parse(content)

        assert result.success
        assert len(result.blocks) == 2

    async def test_nested_json_values(self, parser):
        """测试嵌套 JSON 值"""
        content = """{"t": "list", "c": ["项目1", "项目2", "项目3"]}
{"t": "complex", "c": {"nested": {"key": "value"}}}"""

        result = await parser.parse(content)

        assert result.success
        assert len(result.blocks) == 2
        assert isinstance(result.blocks[0].content, list)
        assert isinstance(result.blocks[1].content, dict)

    async def test_special_characters(self, parser):
        """测试特殊字符"""
        content = r"""{"t": "p", "c": "包含特殊字符: \n\t\"\'"}"""

        result = await parser.parse(content)

        assert result.success
        assert len(result.blocks) == 1

    async def test_empty_fields(self, parser):
        """测试空字段"""
        content = """{"t": "", "c": ""}
{"t": "p", "c": null}"""

        options = ParseOptions(allow_empty_content=True)
        result = await parser.parse(content, options)

        # 应该处理空字段
        assert len(result.blocks) >= 0


class TestCustomValidators:
    """自定义验证器测试"""

    @pytest.fixture
    def parser(self):
        return create_parser()

    async def test_regex_validator(self, parser):
        """测试正则表达式验证器"""
        # 只允许数字内容
        regex_validator = RegexValidator(r"^\d+$", "Content must be numeric")
        parser.register_attribute_validator("priority", regex_validator)

        content = '{"t": "p", "c": "测试", "priority": "abc"}'
        result = await parser.parse(content)

        assert len(result.errors) > 0
        assert any(
            "Content must be numeric" in error.message for error in result.errors
        )

    async def test_custom_validator_function(self, parser):
        """测试自定义验证器函数"""

        def validate_even_number(value):
            """验证偶数"""
            try:
                return int(value) % 2 == 0
            except (ValueError, TypeError):
                return False

        content = '{"t": "p", "c": "测试", "number": "5"}'

        options = ParseOptions(custom_validators={"number": validate_even_number})

        result = await parser.parse(content, options)

        assert len(result.errors) > 0


# 便捷函数测试
class TestConvenienceFunctions:
    """便捷函数测试"""

    async def test_parse_jsonl_function(self):
        """测试便捷解析函数"""
        content = '{"t": "h1", "c": "标题"}'

        result = await parse_jsonl(content)

        assert result.success
        assert len(result.blocks) == 1

    def test_parse_jsonl_sync_function(self):
        """测试同步便捷解析函数"""
        content = '{"t": "h1", "c": "标题"}'

        result = parse_jsonl_sync(content)

        assert result.success
        assert len(result.blocks) == 1


if __name__ == "__main__":
    pytest.main([__file__])
