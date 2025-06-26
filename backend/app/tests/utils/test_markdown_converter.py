"""
Tests for MarkdownConverter utility
"""

from app.utils.markdown_converter import MarkdownConverter


class TestMarkdownConverter:
    """Tests for MarkdownConverter class"""

    def setup_method(self):
        """Set up test environment"""
        self.converter = MarkdownConverter()

    def test_initialization(self):
        """Test MarkdownConverter initialization"""
        assert hasattr(self.converter, "patterns")
        assert "headers" in self.converter.patterns
        assert "bold" in self.converter.patterns
        assert "code_block" in self.converter.patterns

    def test_optimize_structure_basic(self):
        """Test basic structure optimization"""
        markdown = """# Title

Some content here.


## Section 1
Content for section 1.

### Subsection
More content.


## Section 2
Final content."""

        result = self.converter.optimize_structure(markdown)

        # Should have proper spacing around headers
        assert "# Title\n\nSome content" in result
        assert "## Section 1\n\nContent" in result

    def test_optimize_structure_with_code_blocks(self):
        """Test structure optimization with code blocks"""
        markdown = """# Code Example

Here's some code:
```python
def hello():
    print("Hello")
```

And more text."""

        result = self.converter.optimize_structure(markdown)
        assert "```python" in result
        assert "def hello():" in result

    def test_optimize_structure_with_lists(self):
        """Test structure optimization with lists"""
        markdown = """# Lists

- Item 1
- Item 2

1. First
2. Second"""

        result = self.converter.optimize_structure(markdown)
        assert "- Item 1" in result
        assert "1. First" in result

    def test_extract_metadata_basic(self):
        """Test basic metadata extraction"""
        markdown = """# Main Title

Some content with **bold** text and `code`.

## Section
More content with [link](http://example.com).

![image](image.png)"""

        metadata = self.converter.extract_metadata(markdown)

        assert len(metadata["headers"]) == 2
        assert metadata["headers"][0]["level"] == 1
        assert metadata["headers"][0]["text"] == "Main Title"
        assert metadata["has_code"] is True
        assert metadata["has_links"] is True
        assert metadata["has_images"] is True
        assert metadata["word_count"] > 0

    def test_extract_metadata_empty_content(self):
        """Test metadata extraction with empty content"""
        metadata = self.converter.extract_metadata("")

        assert metadata["headers"] == []
        assert metadata["word_count"] == 0
        assert metadata["has_code"] is False
        assert metadata["has_links"] is False
        assert metadata["has_images"] is False

    def test_extract_metadata_with_code_blocks(self):
        """Test metadata extraction with code blocks"""
        markdown = """# Code Example

```python
def test():
    return True
```

Some text."""

        metadata = self.converter.extract_metadata(markdown)
        assert metadata["has_code"] is True

    def test_convert_to_plain_text_basic(self):
        """Test basic Markdown to plain text conversion"""
        markdown = """# Title

**Bold text** and *italic text*.

- List item 1
- List item 2

[Link text](http://example.com)"""

        result = self.converter.convert_to_plain_text(markdown)

        assert "Title" in result
        assert "Bold text" in result
        assert "italic text" in result
        assert "List item 1" in result
        assert "Link text" in result
        assert "**" not in result
        assert "*" not in result
        assert "[" not in result
        assert "]" not in result

    def test_convert_to_plain_text_with_code(self):
        """Test plain text conversion with code blocks"""
        markdown = """# Code

```python
def hello():
    print("world")
```

And `inline code`."""

        result = self.converter.convert_to_plain_text(markdown)
        assert "def hello():" in result
        assert "inline code" in result
        assert "```" not in result
        assert "`" not in result

    def test_normalize_line_breaks(self):
        """Test line break normalization"""
        content_with_crlf = "Line 1\r\nLine 2\rLine 3\nLine 4"
        result = self.converter._normalize_line_breaks(content_with_crlf)
        assert result == "Line 1\nLine 2\nLine 3\nLine 4"

    def test_optimize_headers_spacing(self):
        """Test header spacing optimization"""
        content = """# Title
Immediate content
## Section
More content"""

        result = self.converter._optimize_headers(content)

        # Should add proper spacing around headers
        lines = result.split("\n")
        assert "# Title" in lines
        assert "## Section" in lines

    def test_clean_excessive_whitespace(self):
        """Test excessive whitespace cleaning"""
        content = "Line 1\n\n\n\nLine 2   \nLine 3"
        result = self.converter._clean_excessive_whitespace(content)

        # Should remove excessive newlines and trailing spaces
        assert "\n\n\n" not in result
        assert "Line 2   " not in result

    def test_optimize_lists_formatting(self):
        """Test list optimization"""
        content = """- Item 1
- Item 2

1. First
2. Second"""

        result = self.converter._optimize_lists(content)
        assert "- Item 1" in result
        assert "1. First" in result

    def test_optimize_code_blocks(self):
        """Test code block optimization"""
        content = """```python
def test():
    pass
```"""

        result = self.converter._optimize_code_blocks(content)
        assert "```python" in result
        assert "def test():" in result

    def test_optimize_links_and_images(self):
        """Test link and image optimization"""
        content = "[Link](http://example.com) and ![Image](image.png)"
        result = self.converter._optimize_links_and_images(content)
        assert "[Link]" in result
        assert "![Image]" in result

    def test_final_cleanup(self):
        """Test final cleanup step"""
        content = "  Content with spaces  \n\n\n  More content  "
        result = self.converter._final_cleanup(content)

        # Should clean trailing spaces and excessive newlines
        assert not result.startswith(" ")
        assert not result.endswith(" ")

    def test_extract_plain_text_comprehensive(self):
        """Test comprehensive plain text extraction"""
        markdown = """# Title

**Bold** and *italic* text.

> Quote

- List
  - Nested

`code` and [link](url)"""

        result = self.converter._extract_plain_text(markdown)
        assert "Title" in result
        assert "Bold" in result
        assert "italic" in result
        assert "Quote" in result
        assert "List" in result
        assert "Nested" in result
        assert "code" in result
        assert "link" in result

    def test_assess_structure_quality_good(self):
        """Test structure quality assessment with good content"""
        content = """# Main Title

## Section 1
Content here.

### Subsection
More content.

## Section 2
Final content."""

        metadata = {
            "headers": [
                {"level": 1, "text": "Main Title"},
                {"level": 2, "text": "Section 1"},
                {"level": 3, "text": "Subsection"},
                {"level": 2, "text": "Section 2"},
            ],
            "word_count": 10,
            "has_code": False,
            "has_images": False,
            "has_links": False,
        }

        quality = self.converter._assess_structure_quality(content, metadata)
        assert isinstance(quality, float)
        assert 0.0 <= quality <= 1.0

    def test_assess_structure_quality_poor(self):
        """Test structure quality assessment with poor content"""
        content = "Just plain text without any structure or formatting."
        metadata = {
            "headers": [],
            "word_count": 8,
            "has_code": False,
            "has_images": False,
            "has_links": False,
        }

        quality = self.converter._assess_structure_quality(content, metadata)
        assert isinstance(quality, float)
        assert 0.0 <= quality <= 1.0

    def test_error_handling_optimize_structure(self):
        """Test error handling in optimize_structure"""
        # Test with None input (should cause error but not crash)
        result = self.converter.optimize_structure(None)
        assert result is None  # Should return original content

    def test_error_handling_extract_metadata(self):
        """Test error handling in extract_metadata"""
        # Test with None input
        metadata = self.converter.extract_metadata(None)

        # Should return default metadata structure
        assert "headers" in metadata
        assert "word_count" in metadata
        assert "has_code" in metadata

    def test_error_handling_convert_to_plain_text(self):
        """Test error handling in convert_to_plain_text"""
        # Test with None input
        result = self.converter.convert_to_plain_text(None)
        assert result is None  # Should return original content

    def test_chinese_content_handling(self):
        """Test handling of Chinese content"""
        markdown = """# 中文标题

这是一段**粗体**中文文本。

- 列表项1
- 列表项2

[链接](http://example.com)"""

        # Test optimization
        optimized = self.converter.optimize_structure(markdown)
        assert "中文标题" in optimized

        # Test metadata extraction
        metadata = self.converter.extract_metadata(markdown)
        assert len(metadata["headers"]) >= 1
        assert metadata["word_count"] > 0

        # Test plain text conversion
        plain = self.converter.convert_to_plain_text(markdown)
        assert "中文标题" in plain
        assert "粗体" in plain
        assert "列表项1" in plain

    def test_complex_markdown_structure(self):
        """Test with complex Markdown structure"""
        markdown = """# Main Document

## Table of Contents
- [Section 1](#section-1)
- [Section 2](#section-2)

## Section 1

Here's some code:

```javascript
function example() {
    console.log("Hello World");
}
```

### Subsection 1.1

> This is a blockquote with **bold** text.

### Subsection 1.2

1. First item
2. Second item
   - Nested item
   - Another nested item

## Section 2

![Example Image](https://example.com/image.png)

Visit [our website](https://example.com) for more info.

---

End of document."""

        # Test all methods with complex content
        optimized = self.converter.optimize_structure(markdown)
        assert "# Main Document" in optimized
        assert "```javascript" in optimized

        metadata = self.converter.extract_metadata(markdown)
        assert len(metadata["headers"]) >= 3
        assert metadata["has_code"] is True
        assert metadata["has_images"] is True
        assert metadata["has_links"] is True
        assert metadata["word_count"] > 20

        plain = self.converter.convert_to_plain_text(markdown)
        assert "Main Document" in plain
        assert "function example()" in plain
        assert "Hello World" in plain
        assert "First item" in plain

    def test_edge_cases(self):
        """Test edge cases"""
        # Empty string
        assert self.converter.optimize_structure("") == ""
        assert self.converter.convert_to_plain_text("") == ""

        # Whitespace only
        whitespace_only = "   \n\n   \t  \n"
        result = self.converter.optimize_structure(whitespace_only)
        assert result.strip() == ""

        # Very long content
        long_content = "# Title\n\n" + "A" * 10000
        result = self.converter.optimize_structure(long_content)
        assert "# Title" in result
        assert len(result) > 5000

    def test_malformed_markdown(self):
        """Test handling of malformed Markdown"""
        malformed = """### Incomplete header

**Unclosed bold

- List item without proper spacing
1.Missing space after number

`Unclosed code

[Incomplete link]("""

        # Should not crash and should return something reasonable
        optimized = self.converter.optimize_structure(malformed)
        assert isinstance(optimized, str)

        metadata = self.converter.extract_metadata(malformed)
        assert isinstance(metadata, dict)

        plain = self.converter.convert_to_plain_text(malformed)
        assert isinstance(plain, str)
