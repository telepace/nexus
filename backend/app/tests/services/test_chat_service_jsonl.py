"""
Tests for ChatService JSONL functionality
"""

import json
from unittest.mock import patch

import pytest

from app.services.ai.chat_service import ChatService


@pytest.fixture
def chat_service():
    """Create a ChatService instance for testing"""
    return ChatService()


class TestJsonlDetection:
    """Tests for JSONL content detection"""

    def test_is_jsonl_content_valid_jsonl(self, chat_service):
        """Test detection of valid JSONL content"""
        content = '{"type": "h1", "content": "Title", "mapping": "h1-1"}'
        assert chat_service._is_jsonl_content(content) is True

    def test_is_jsonl_content_multiple_lines(self, chat_service):
        """Test detection of multi-line JSONL content"""
        content = '''{"type": "h1", "content": "Title", "mapping": "h1-1"}
{"type": "p", "content": "Paragraph", "mapping": "p1"}'''
        assert chat_service._is_jsonl_content(content) is True

    def test_is_jsonl_content_short_field_names(self, chat_service):
        """Test detection with short field names (t, c)"""
        content = '{"t": "h1", "c": "Title", "mapping": "h1-1"}'
        assert chat_service._is_jsonl_content(content) is True

    def test_is_jsonl_content_empty_string(self, chat_service):
        """Test detection with empty string"""
        assert chat_service._is_jsonl_content("") is False

    def test_is_jsonl_content_none(self, chat_service):
        """Test detection with None input"""
        assert chat_service._is_jsonl_content(None) is False

    def test_is_jsonl_content_whitespace_only(self, chat_service):
        """Test detection with whitespace only"""
        assert chat_service._is_jsonl_content("   \n\t  ") is False

    def test_is_jsonl_content_invalid_json(self, chat_service):
        """Test detection with invalid JSON"""
        content = '{"type": "h1", "content": "Title"'  # Missing closing brace
        assert chat_service._is_jsonl_content(content) is False

    def test_is_jsonl_content_markdown(self, chat_service):
        """Test detection with markdown content"""
        content = "# This is a markdown title\n\nThis is a paragraph."
        assert chat_service._is_jsonl_content(content) is False

    def test_is_jsonl_content_missing_required_fields(self, chat_service):
        """Test detection with missing required fields"""
        content = '{"description": "Not a valid JSONL block"}'
        assert chat_service._is_jsonl_content(content) is False

    def test_is_jsonl_content_array_instead_of_object(self, chat_service):
        """Test detection with array instead of object"""
        content = '["not", "an", "object"]'
        assert chat_service._is_jsonl_content(content) is False


class TestJsonlParsing:
    """Tests for JSONL content parsing"""

    def test_parse_jsonl_content_single_block(self, chat_service):
        """Test parsing a single JSONL block"""
        content = '{"type": "h1", "content": "Title", "mapping": "h1-1"}'
        blocks = chat_service._parse_jsonl_content(content)

        assert len(blocks) == 1
        assert blocks[0]["type"] == "h1"
        assert blocks[0]["content"] == "Title"
        assert blocks[0]["mapping"] == "h1-1"

    def test_parse_jsonl_content_multiple_blocks(self, chat_service):
        """Test parsing multiple JSONL blocks"""
        content = '''{"type": "h1", "content": "Title", "mapping": "h1-1"}
{"type": "p", "content": "Paragraph", "mapping": "p1"}
{"type": "list", "content": ["Item 1", "Item 2"], "mapping": "l1"}'''

        blocks = chat_service._parse_jsonl_content(content)

        assert len(blocks) == 3
        assert blocks[0]["type"] == "h1"
        assert blocks[1]["type"] == "p"
        assert blocks[2]["type"] == "list"
        assert blocks[2]["content"] == ["Item 1", "Item 2"]

    def test_parse_jsonl_content_short_field_names(self, chat_service):
        """Test parsing with short field names"""
        content = '{"t": "h2", "c": "Section", "mapping": "h2-1"}'
        blocks = chat_service._parse_jsonl_content(content)

        assert len(blocks) == 1
        assert blocks[0]["t"] == "h2"
        assert blocks[0]["c"] == "Section"

    def test_parse_jsonl_content_empty_string(self, chat_service):
        """Test parsing empty string"""
        blocks = chat_service._parse_jsonl_content("")
        assert blocks == []

    def test_parse_jsonl_content_whitespace_lines(self, chat_service):
        """Test parsing with whitespace lines"""
        content = '''{"type": "h1", "content": "Title"}

{"type": "p", "content": "Paragraph"}

{"type": "action", "content": "Take action"}'''

        blocks = chat_service._parse_jsonl_content(content)
        assert len(blocks) == 3

    def test_parse_jsonl_content_invalid_json_line(self, chat_service):
        """Test parsing with invalid JSON line"""
        content = '''{"type": "h1", "content": "Title"}
invalid json line
{"type": "p", "content": "Valid paragraph"}'''

        blocks = chat_service._parse_jsonl_content(content)

        assert len(blocks) == 3
        assert blocks[0]["type"] == "h1"
        assert blocks[1]["type"] == "p"
        assert blocks[1]["content"] == "invalid json line"
        assert blocks[1]["mapping"] == "error_2"
        assert blocks[2]["type"] == "p"
        assert blocks[2]["content"] == "Valid paragraph"

    def test_parse_jsonl_content_missing_type_field(self, chat_service):
        """Test parsing with missing type field"""
        content = '{"content": "Content without type", "mapping": "test"}'
        blocks = chat_service._parse_jsonl_content(content)

        assert len(blocks) == 1
        assert blocks[0]["type"] == "p"  # Should default to paragraph
        assert blocks[0]["content"] == "Content without type"

    def test_parse_jsonl_content_missing_content_field(self, chat_service):
        """Test parsing with missing content field"""
        content = '{"type": "h1", "mapping": "test"}'
        blocks = chat_service._parse_jsonl_content(content)

        assert len(blocks) == 1
        assert blocks[0]["type"] == "h1"
        assert blocks[0]["content"] == ""  # Should default to empty string

    def test_parse_jsonl_content_missing_mapping_field(self, chat_service):
        """Test parsing with missing mapping field"""
        content = '{"type": "p", "content": "Test content"}'
        blocks = chat_service._parse_jsonl_content(content)

        assert len(blocks) == 1
        assert blocks[0]["type"] == "p"
        assert blocks[0]["content"] == "Test content"
        assert blocks[0]["mapping"] == "auto_1"  # Should generate auto mapping

    def test_parse_jsonl_content_non_dict_json(self, chat_service):
        """Test parsing with non-dictionary JSON"""
        content = '"this is a string"'
        blocks = chat_service._parse_jsonl_content(content)

        assert len(blocks) == 1
        assert blocks[0]["type"] == "p"
        assert blocks[0]["content"] == "this is a string"
        assert blocks[0]["mapping"] == "auto_1"


class TestJsonlFormatting:
    """Tests for JSONL content formatting"""

    def test_format_jsonl_output_single_block(self, chat_service):
        """Test formatting a single block to JSONL"""
        blocks = [{"type": "h1", "content": "Title", "mapping": "h1-1"}]
        result = chat_service._format_jsonl_output(blocks)

        expected = '{"type":"h1","content":"Title","mapping":"h1-1"}'
        assert result == expected

    def test_format_jsonl_output_multiple_blocks(self, chat_service):
        """Test formatting multiple blocks to JSONL"""
        blocks = [
            {"type": "h1", "content": "Title", "mapping": "h1-1"},
            {"type": "p", "content": "Paragraph", "mapping": "p1"},
            {"type": "list", "content": ["Item 1", "Item 2"], "mapping": "l1"}
        ]
        result = chat_service._format_jsonl_output(blocks)

        lines = result.split('\n')
        assert len(lines) == 3

        # Verify each line is valid JSON
        for line in lines:
            assert json.loads(line)  # Should not raise exception

        # Verify content
        first_block = json.loads(lines[0])
        assert first_block["type"] == "h1"
        assert first_block["content"] == "Title"

    def test_format_jsonl_output_empty_list(self, chat_service):
        """Test formatting empty block list"""
        result = chat_service._format_jsonl_output([])
        assert result == ""

    def test_format_jsonl_output_unicode_content(self, chat_service):
        """Test formatting with unicode content"""
        blocks = [{"type": "p", "content": "中文内容测试", "mapping": "p1"}]
        result = chat_service._format_jsonl_output(blocks)

        parsed = json.loads(result)
        assert parsed["content"] == "中文内容测试"

    def test_format_jsonl_output_invalid_block(self, chat_service):
        """Test formatting with unserializable block"""
        # Create a block with unserializable content
        class UnserializableClass:
            pass

        blocks = [{"type": "p", "content": UnserializableClass(), "mapping": "p1"}]
        result = chat_service._format_jsonl_output(blocks)

        # Should fallback to string representation
        parsed = json.loads(result)
        assert parsed["type"] == "p"
        assert "UnserializableClass" in parsed["content"]
        assert parsed["mapping"] == "p1"


class TestJsonlIntegration:
    """Integration tests for JSONL functionality in generate_with_template"""

    @pytest.mark.asyncio
    @patch('app.services.ai.chat_service.ChatService._call_litellm_proxy')
    async def test_generate_with_template_jsonl_output(self, mock_llm_call, chat_service):
        """Test generate_with_template with JSONL output from LLM"""
        # Mock LLM to return JSONL content
        mock_jsonl_content = '''{"type": "h1", "content": "分析结果", "mapping": "h1-1"}
{"type": "insight", "content": "这是一个重要洞察", "priority": "high", "mapping": "i1"}
{"type": "p", "content": "这是详细说明", "mapping": "p1"}'''

        mock_llm_call.return_value = mock_jsonl_content

        context = {
            "content": "Test content for analysis",
            "document_metadata": {"title": "Test Document"}
        }
        result = await chat_service.generate_with_template("summary.j2", context)

        # Should detect and parse JSONL
        assert result["format"] == "jsonl"
        assert len(result["blocks"]) == 3
        assert result["blocks"][0]["type"] == "h1"
        assert result["blocks"][1]["type"] == "insight"
        assert result["blocks"][1]["priority"] == "high"
        assert result["raw_content"] == mock_jsonl_content

    @pytest.mark.asyncio
    @patch('app.services.ai.chat_service.ChatService._call_litellm_proxy')
    async def test_generate_with_template_markdown_fallback(self, mock_llm_call, chat_service):
        """Test generate_with_template falls back to markdown processing"""
        # Mock LLM to return markdown content
        mock_markdown_content = "# Analysis Result\n\nThis is markdown content."
        mock_llm_call.return_value = mock_markdown_content

        context = {
            "content": "Test content for analysis",
            "document_metadata": {"title": "Test Document"}
        }
        result = await chat_service.generate_with_template("summary.j2", context)

        # Should not detect as JSONL, fall back to original logic
        assert "format" not in result or result.get("format") != "jsonl"
        assert result["summary"]["text"] == mock_markdown_content

    @pytest.mark.asyncio
    @patch('app.services.ai.chat_service.ChatService._call_litellm_proxy')
    async def test_generate_with_template_jsonl_parse_error(self, mock_llm_call, chat_service):
        """Test generate_with_template handles JSONL parse errors gracefully"""
        # Mock LLM to return malformed JSONL
        mock_malformed_jsonl = '{"type": "h1", "content": "Title"'  # Missing closing brace
        mock_llm_call.return_value = mock_malformed_jsonl

        context = {
            "content": "Test content",
            "document_metadata": {"title": "Test Document"}
        }
        result = await chat_service.generate_with_template("summary.j2", context)

        # Should fall back to original processing logic
        assert result["summary"]["text"] == mock_malformed_jsonl

    @pytest.mark.asyncio
    @patch('app.services.ai.chat_service.ChatService._call_litellm_proxy')
    async def test_summary_template_with_jsonl_code_block(self, mock_llm_call, chat_service):
        """Test summary.j2 template with JSONL content wrapped in code blocks"""
        # Mock LLM to return JSONL content wrapped in ```jsonl code block
        mock_jsonl_content = '''```jsonl
{"t": "h2", "c": "核心观点"}
{"t": "insight", "c": "这是一个重要的观点", "ref": "1"}
{"t": "h2", "c": "主要内容"}
{"t": "p", "c": "详细内容描述", "ref": "2"}
```'''

        mock_llm_call.return_value = mock_jsonl_content

        context = {
            "content": "Test content for summary analysis",
            "document_metadata": {"title": "Test Document"}
        }
        result = await chat_service.generate_with_template("summary.j2", context)

        # Should detect and parse JSONL from code block
        assert result["format"] == "jsonl"
        assert len(result["blocks"]) == 4
        assert result["blocks"][0]["t"] == "h2"
        assert result["blocks"][0]["c"] == "核心观点"
        assert result["blocks"][1]["t"] == "insight"
        assert result["raw_content"] == '''{"t": "h2", "c": "核心观点"}
{"t": "insight", "c": "这是一个重要的观点", "ref": "1"}
{"t": "h2", "c": "主要内容"}
{"t": "p", "c": "详细内容描述", "ref": "2"}'''

    @pytest.mark.asyncio
    @patch('app.services.ai.chat_service.ChatService._call_litellm_proxy')
    async def test_key_points_template_with_json_code_block(self, mock_llm_call, chat_service):
        """Test key_points.j2 template with JSONL content wrapped in ```json code block"""
        # Mock LLM to return JSONL content wrapped in ```json code block
        mock_jsonl_content = '''```json
{"t": "h2", "c": "关键要点"}
{"t": "p", "c": "要点1：重要信息", "ref": "1"}
{"t": "p", "c": "要点2：关键数据", "ref": "3"}
```'''

        mock_llm_call.return_value = mock_jsonl_content

        context = {
            "content": "Test content for key points analysis",
            "document_metadata": {"title": "Test Document"}
        }
        result = await chat_service.generate_with_template("key_points.j2", context)

        # Should detect and parse JSONL from code block
        assert result["format"] == "jsonl"
        assert len(result["blocks"]) == 3
        assert result["blocks"][0]["t"] == "h2"
        assert result["blocks"][0]["c"] == "关键要点"
        assert result["blocks"][1]["t"] == "p"
        assert result["raw_content"] == '''{"t": "h2", "c": "关键要点"}
{"t": "p", "c": "要点1：重要信息", "ref": "1"}
{"t": "p", "c": "要点2：关键数据", "ref": "3"}'''

    @pytest.mark.asyncio
    @patch('app.services.ai.chat_service.ChatService._call_litellm_proxy')
    async def test_summary_template_fallback_to_text(self, mock_llm_call, chat_service):
        """Test summary.j2 template fallback to text format when not JSONL"""
        # Mock LLM to return plain text content
        mock_text_content = '''这是一个普通的文本摘要，不是JSONL格式。
包含多行内容和一些要点。'''

        mock_llm_call.return_value = mock_text_content

        context = {
            "content": "Test content for summary analysis",
            "document_metadata": {"title": "Test Document"}
        }
        result = await chat_service.generate_with_template("summary.j2", context)

        # Should fallback to text format
        assert "format" not in result or result.get("format") != "jsonl"
        assert result["summary"]["text"] == mock_text_content
