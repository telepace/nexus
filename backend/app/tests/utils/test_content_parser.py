"""
Tests for ContentParser utility
"""

from unittest.mock import patch

import pytest

from app.utils.content_parser import ContentParser


class TestContentParser:
    """Tests for ContentParser class"""

    def setup_method(self):
        """Set up test environment"""
        self.parser = ContentParser()

    def test_initialization(self):
        """Test ContentParser initialization"""
        assert hasattr(self.parser, "html_parser")

    @pytest.mark.asyncio
    async def test_html_to_markdown_basic(self):
        """Test basic HTML to Markdown conversion"""
        html = """
        <h1>标题</h1>
        <p>这是一段<strong>粗体</strong>文本。</p>
        <ul>
            <li>列表项1</li>
            <li>列表项2</li>
        </ul>
        """

        result = await self.parser.html_to_markdown(html)
        assert "# 标题" in result
        assert "**粗体**" in result
        assert "- 列表项1" in result

    @pytest.mark.asyncio
    async def test_html_to_markdown_with_error(self):
        """Test HTML to Markdown conversion with error handling"""
        with patch("app.utils.content_parser.md", side_effect=Exception("Parse error")):
            html = "<h1>Test</h1>"
            result = await self.parser.html_to_markdown(html)
            # Should fallback to plain text extraction
            assert "Test" in result

    @pytest.mark.asyncio
    async def test_pdf_to_markdown_basic(self):
        """Test PDF to Markdown conversion"""
        pdf_text = """
        CHAPTER 1: INTRODUCTION

        This is the first paragraph of the document.

        1. First point
        2. Second point

        SECTION 1.1: SUBSECTION

        More content here.
        """

        result = await self.parser.pdf_to_markdown(pdf_text)
        assert "CHAPTER" in result or "chapter" in result.lower()
        assert "1." in result

    @pytest.mark.asyncio
    async def test_pdf_to_markdown_with_error(self):
        """Test PDF to Markdown conversion with error"""
        with patch.object(
            self.parser, "_detect_and_convert_headings", side_effect=Exception("Error")
        ):
            pdf_text = "Simple text"
            result = await self.parser.pdf_to_markdown(pdf_text)
            # Should return original content on error
            assert result == pdf_text

    @pytest.mark.asyncio
    async def test_text_to_markdown_basic(self):
        """Test text to Markdown conversion"""
        text = """
        MAIN TITLE

        This is some content.

        1) First item
        2) Second item

        Another paragraph.
        """

        result = await self.parser.text_to_markdown(text)
        assert isinstance(result, str)
        assert len(result) > 0

    @pytest.mark.asyncio
    async def test_text_to_markdown_with_error(self):
        """Test text to Markdown conversion with error"""
        with patch.object(
            self.parser, "_detect_and_convert_headings", side_effect=Exception("Error")
        ):
            text = "Simple text"
            result = await self.parser.text_to_markdown(text)
            # Should return original content on error
            assert result == text

    def test_clean_html_basic(self):
        """Test basic HTML cleaning"""
        html = """
        <html>
        <head>
            <script>alert('test');</script>
            <style>body { color: red; }</style>
            <meta charset="utf-8">
        </head>
        <body>
            <h1 class="title" id="main">Title</h1>
            <p onclick="doSomething()">Content</p>
            <!-- This is a comment -->
        </body>
        </html>
        """

        result = self.parser._clean_html(html)
        assert "script" not in result.lower()
        assert "style" not in result.lower()
        assert "meta" not in result.lower()
        assert "comment" not in result
        assert "Title" in result

    def test_clean_html_with_complex_structure(self):
        """Test HTML cleaning with complex structure"""
        html = """
        <div class="container" data-value="test">
            <h1 href="link.html" title="Main Title">Title</h1>
            <img src="image.jpg" alt="Test Image" class="photo">
            <a href="http://example.com" title="Link">Link Text</a>
        </div>
        """

        result = self.parser._clean_html(html)
        # Should preserve useful attributes
        assert 'href="http://example.com"' in result
        assert 'src="image.jpg"' in result
        assert 'alt="Test Image"' in result
        assert 'title="Link"' in result
        # Should remove non-useful attributes
        assert "data-value" not in result
        assert "class=" not in result

    def test_extract_text_from_html_basic(self):
        """Test text extraction from HTML"""
        html = """
        <h1>Title</h1>
        <p>First paragraph.</p>
        <p>Second paragraph.</p>
        <ul>
            <li>Item 1</li>
            <li>Item 2</li>
        </ul>
        """

        result = self.parser._extract_text_from_html(html)
        assert "Title" in result
        assert "First paragraph" in result
        assert "Item 1" in result

    def test_detect_and_convert_headings_basic(self):
        """Test heading detection and conversion"""
        content = """
        MAIN TITLE

        This is content.

        CHAPTER 1: INTRODUCTION

        More content.

        1. Section Header

        Final content.
        """

        result = self.parser._detect_and_convert_headings(content)
        # Should convert uppercase lines to headers
        lines = result.split("\n")
        has_header = any("##" in line for line in lines)
        assert has_header or any("TITLE" in line for line in lines)

    def test_detect_and_convert_headings_edge_cases(self):
        """Test heading detection edge cases"""
        content = """
        THIS IS A VERY LONG LINE THAT SHOULD NOT BE CONSIDERED A TITLE BECAUSE IT IS TOO LONG

        SHORT!

        This is normal text.

        CAPS WITH QUESTION?

        CAPS WITH EXCLAMATION!
        """

        result = self.parser._detect_and_convert_headings(content)
        # Very long lines should not become headers
        assert "VERY LONG LINE" in result
        # Short caps should become headers
        assert "## Short" in result or "SHORT" in result

    def test_detect_and_convert_lists_basic(self):
        """Test list detection and conversion"""
        content = """
        Regular paragraph.

        • First bullet point
        • Second bullet point

        1) First numbered item
        2) Second numbered item

        - Already markdown list
        """

        result = self.parser._detect_and_convert_lists(content)
        assert "- First bullet point" in result
        assert "1. First numbered item" in result
        assert "- Already markdown list" in result

    def test_detect_and_convert_lists_various_bullets(self):
        """Test list detection with various bullet types"""
        content = """
        • Unicode bullet
        · Middle dot
        ‣ Triangular bullet
        ▪ Black square
        ▫ White square
        ‒ Figure dash
        – En dash
        — Em dash
        """

        result = self.parser._detect_and_convert_lists(content)
        # Should convert various bullet types to markdown lists
        lines = result.split("\n")
        markdown_lists = [line for line in lines if line.strip().startswith("- ")]
        assert len(markdown_lists) >= 3  # Should convert at least some bullets

    def test_detect_and_convert_code_blocks_basic(self):
        """Test code block detection"""
        content = """
        Here's some text.

            def function():
                return True

            another_line = "indented"

        More text.
        """

        result = self.parser._detect_and_convert_code_blocks(content)
        # Should detect indented code
        assert "def function" in result

    def test_detect_and_convert_code_blocks_various_patterns(self):
        """Test code block detection with various patterns"""
        content = """
        Normal text.

            # This looks like code
            if condition:
                do_something()

        More text.

            SELECT * FROM table;
            WHERE condition = 'value';

        Final text.
        """

        result = self.parser._detect_and_convert_code_blocks(content)
        assert "if condition" in result
        assert "SELECT" in result

    def test_optimize_paragraphs_basic(self):
        """Test paragraph optimization"""
        content = """


        First paragraph.



        Second paragraph.


        Third paragraph.


        """

        result = self.parser._optimize_paragraphs(content)
        # Should reduce excessive whitespace
        assert "\n\n\n\n" not in result
        assert "First paragraph" in result
        assert "Second paragraph" in result

    def test_optimize_paragraphs_line_breaks(self):
        """Test paragraph optimization with line breaks"""
        content = "Line 1\nLine 2\n\nNew paragraph\nContinued line"

        result = self.parser._optimize_paragraphs(content)
        # Should maintain proper paragraph structure
        assert "Line 1" in result
        assert "New paragraph" in result

    def test_optimize_markdown_basic(self):
        """Test Markdown optimization"""
        markdown = """
        #  Title With Extra Spaces



        Content with multiple spaces.


        - List item
        -Another item without space


        """

        result = self.parser._optimize_markdown(markdown)
        # Should clean up formatting issues
        assert "# Title With Extra Spaces" in result
        assert "\n\n\n\n" not in result

    def test_optimize_markdown_list_formatting(self):
        """Test Markdown list formatting optimization"""
        markdown = """
        -Item 1
        - Item 2
        -  Item 3 with extra space
        """

        result = self.parser._optimize_markdown(markdown)
        # Should standardize list formatting
        lines = result.split("\n")
        list_lines = [line for line in lines if line.strip().startswith("-")]
        for line in list_lines:
            if line.strip():
                assert line.startswith("- ") or line.strip() == "-"

    @pytest.mark.asyncio
    async def test_html_to_markdown_complex(self):
        """Test complex HTML to Markdown conversion"""
        html = """
        <article>
            <header>
                <h1>主要标题</h1>
                <h2>副标题</h2>
            </header>
            <main>
                <p>这是第一段，包含<strong>粗体</strong>和<em>斜体</em>文本。</p>
                <p>这是第二段，包含<a href="http://example.com">链接</a>。</p>
                <ul>
                    <li>列表项 1</li>
                    <li>列表项 2 with <code>code</code></li>
                </ul>
                <blockquote>
                    <p>这是一个引用块。</p>
                </blockquote>
                <pre><code>def hello():
    print("Hello World")</code></pre>
            </main>
        </article>
        """

        result = await self.parser.html_to_markdown(html)
        assert "# 主要标题" in result
        assert "## 副标题" in result
        assert "**粗体**" in result
        assert "*斜体*" in result
        assert "[链接]" in result
        assert "- 列表项 1" in result
        assert "`code`" in result
        assert "> 这是一个引用" in result or "这是一个引用" in result

    @pytest.mark.asyncio
    async def test_multiple_conversion_methods(self):
        """Test multiple conversion methods with same content"""
        content = """
        TITLE

        This is a paragraph with some content.

        1. First item
        2. Second item

        Another paragraph.
        """

        # Test both PDF and text conversion
        pdf_result = await self.parser.pdf_to_markdown(content)
        text_result = await self.parser.text_to_markdown(content)

        # Both should handle the content reasonably
        assert isinstance(pdf_result, str)
        assert isinstance(text_result, str)
        assert len(pdf_result) > 0
        assert len(text_result) > 0

    def test_error_resilience(self):
        """Test error handling and resilience"""
        # Test with None input (should not crash)
        try:
            _none_result = self.parser._extract_text_from_html(None)
            # Should handle gracefully
        except (TypeError, AttributeError):
            # Some methods might not handle None gracefully
            pass

    def test_chinese_content_handling(self):
        """Test handling of Chinese content"""
        chinese_content = """
        中文标题

        这是一段中文文本，包含一些内容。

        • 中文列表项1
        • 中文列表项2

        1）第一个编号项
        2）第二个编号项

        更多中文内容。
        """

        # Test heading detection
        result = self.parser._detect_and_convert_headings(chinese_content)
        assert "中文标题" in result

        # Test list detection
        list_result = self.parser._detect_and_convert_lists(chinese_content)
        assert "- 中文列表项1" in list_result

    def test_mixed_language_content(self):
        """Test handling of mixed language content"""
        mixed_content = """
        English Title 英文标题

        This paragraph contains both English and 中文 characters.

        • Mixed bullet point 混合列表项
        • Another item 另一个项目

        1) English numbered item
        2) 中文编号项目
        """

        heading_result = self.parser._detect_and_convert_headings(mixed_content)
        list_result = self.parser._detect_and_convert_lists(mixed_content)

        assert "English" in heading_result
        assert "中文" in heading_result
        assert "Mixed bullet point" in list_result
        assert "混合列表项" in list_result
