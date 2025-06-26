"""
测试文本智能分段服务
"""

from unittest.mock import patch

import pytest

from app.utils.text_segmentation import SegmentationType, TextSegmentationService


class TestSegmentationType:
    """测试分段类型枚举"""

    def test_segmentation_type_values(self):
        """测试分段类型的值"""
        assert SegmentationType.PARAGRAPH.value == "paragraph"
        assert SegmentationType.SECTION.value == "section"
        assert SegmentationType.SEMANTIC.value == "semantic"
        assert SegmentationType.LENGTH_BASED.value == "length_based"


class TestTextSegmentationService:
    """测试文本智能分段服务"""

    @pytest.fixture
    def service(self):
        """创建分段服务实例"""
        return TextSegmentationService()

    def test_initialization(self, service):
        """测试服务初始化"""
        assert service.min_segment_length == 500
        assert service.max_segment_length == 4000
        assert service.overlap_length == 200

    @pytest.mark.asyncio
    async def test_segment_content_short_content(self, service):
        """测试短内容的分段"""
        short_content = "这是一段很短的内容。"

        result = await service.segment_content(
            short_content, "text", max_segment_length=4000
        )

        # 短内容应该返回单个分段
        assert len(result) == 1
        assert result[0]["content"] == short_content.strip()
        assert result[0]["type"] == "full_content"
        assert result[0]["order"] == 1

    @pytest.mark.asyncio
    async def test_segment_content_with_custom_max_length(self, service):
        """测试自定义最大长度的分段"""
        content = "测试内容。" * 100  # 创建较长内容
        custom_max_length = 100

        result = await service.segment_content(
            content, "text", max_segment_length=custom_max_length
        )

        # 验证max_segment_length被更新
        assert service.max_segment_length == custom_max_length

        # 长内容应该被分段
        if len(content) > custom_max_length:
            assert len(result) > 1

    @pytest.mark.asyncio
    async def test_segment_by_sections_with_markdown_headers(self, service):
        """测试基于Markdown标题的章节分段"""
        content = """# 第一章
这是第一章的内容。

## 1.1 小节
这是小节的内容。

# 第二章
这是第二章的内容。

### 深入探讨
更多内容在这里。"""

        result = await service._segment_by_sections(content)

        # 应该根据标题创建多个分段
        assert len(result) >= 2

        # 验证分段结构
        for segment in result:
            assert "content" in segment
            assert "order" in segment
            assert "type" in segment
            assert segment["type"] == "section"

    @pytest.mark.asyncio
    async def test_segment_by_sections_with_numbered_headers(self, service):
        """测试基于数字编号的章节分段"""
        content = """1. 第一部分
这是第一部分的详细内容。包含很多信息。

2. 第二部分
这是第二部分的内容。
也有很多重要信息。

3) 第三部分
这是另一种编号格式。"""

        result = await service._segment_by_sections(content)

        # 应该识别数字编号的章节
        assert len(result) >= 2

    @pytest.mark.asyncio
    async def test_segment_by_paragraphs(self, service):
        """测试基于段落的分段"""
        content = """这是第一段内容。包含一些信息。

这是第二段内容。包含更多信息。

这是第三段内容。继续添加内容使其足够长以测试分段功能。

这是第四段内容。最后一段内容。"""

        result = await service._segment_by_paragraphs(content)

        # 应该基于段落创建分段
        assert len(result) >= 1

        # 验证分段类型
        for segment in result:
            assert segment["type"] == "paragraph"

    @pytest.mark.asyncio
    async def test_segment_by_semantics_fallback_to_sections(self, service):
        """测试语义分段回退到章节分段"""
        content = """# 标题一
内容一

# 标题二
内容二"""

        with patch.object(service, "_segment_by_sections") as mock_sections:
            # 确保分段内容足够长，避免被优化算法合并
            long_content_1 = (
                "分段1内容" + "这是一个足够长的内容段落，用于测试语义分段功能。" * 20
            )
            long_content_2 = (
                "分段2内容" + "这是另一个足够长的内容段落，用于测试语义分段功能。" * 20
            )

            mock_sections.return_value = [
                {
                    "content": long_content_1,
                    "order": 1,
                    "type": "section",
                    "word_count": len(long_content_1.split()),
                    "char_count": len(long_content_1),
                    "summary": "分段1内容",
                    "metadata": {"segmentation_method": "section", "is_complete": True},
                    "id": "segment_1",
                },
                {
                    "content": long_content_2,
                    "order": 2,
                    "type": "section",
                    "word_count": len(long_content_2.split()),
                    "char_count": len(long_content_2),
                    "summary": "分段2内容",
                    "metadata": {"segmentation_method": "section", "is_complete": True},
                    "id": "segment_2",
                },
            ]

            result = await service._segment_by_semantics(content)

            # 应该调用章节分段
            mock_sections.assert_called_once_with(content)
            assert len(result) == 2

    @pytest.mark.asyncio
    async def test_segment_by_semantics_fallback_to_paragraphs(self, service):
        """测试语义分段回退到段落分段"""
        content = """段落一内容。

段落二内容。

段落三内容。"""

        with (
            patch.object(service, "_segment_by_sections") as mock_sections,
            patch.object(service, "_segment_by_paragraphs") as mock_paragraphs,
        ):
            # 章节分段只返回一个分段（效果不好）
            mock_sections.return_value = [
                {
                    "content": content,
                    "order": 1,
                    "type": "section",
                    "word_count": len(content.split()),
                    "char_count": len(content),
                    "summary": "段落一内容",
                    "metadata": {"segmentation_method": "section", "is_complete": True},
                    "id": "segment_1",
                }
            ]

            # 确保段落分段返回的内容足够长
            long_paragraph_1 = (
                "段落1内容" + "这是第一个足够长的段落内容，用于测试段落分段功能。" * 20
            )
            long_paragraph_2 = (
                "段落2内容" + "这是第二个足够长的段落内容，用于测试段落分段功能。" * 20
            )

            mock_paragraphs.return_value = [
                {
                    "content": long_paragraph_1,
                    "order": 1,
                    "type": "paragraph",
                    "word_count": len(long_paragraph_1.split()),
                    "char_count": len(long_paragraph_1),
                    "summary": "段落1内容",
                    "metadata": {
                        "segmentation_method": "paragraph",
                        "is_complete": True,
                    },
                    "id": "segment_1",
                },
                {
                    "content": long_paragraph_2,
                    "order": 2,
                    "type": "paragraph",
                    "word_count": len(long_paragraph_2.split()),
                    "char_count": len(long_paragraph_2),
                    "summary": "段落2内容",
                    "metadata": {
                        "segmentation_method": "paragraph",
                        "is_complete": True,
                    },
                    "id": "segment_2",
                },
            ]

            result = await service._segment_by_semantics(content)

            # 应该回退到段落分段
            mock_paragraphs.assert_called_once_with(content)
            assert len(result) == 2

    @pytest.mark.asyncio
    async def test_segment_by_length(self, service):
        """测试基于长度的分段"""
        # 创建超过最大长度的内容
        content = "这是测试内容。" * 1000
        service.max_segment_length = 1000

        result = await service._segment_by_length(content)

        # 应该创建多个分段
        assert len(result) > 1

        # 验证每个分段的长度不超过最大限制
        for segment in result:
            assert (
                len(segment["content"])
                <= service.max_segment_length + service.overlap_length
            )

    def test_find_split_point_sentence_boundary(self, service):
        """测试在句子边界找到分割点"""
        content = "第一句话。第二句话。第三句话。第四句话。"

        split_point = service._find_split_point(content)

        # 应该在句号后找到分割点
        assert split_point > 0
        assert content[split_point - 1] in ["。", ".", "!", "?"]

    def test_find_split_point_no_sentence_boundary(self, service):
        """测试没有句子边界时的分割点"""
        content = "一段没有标点符号的很长内容" * 50

        split_point = service._find_split_point(content)

        # 应该在空格处分割，或者使用默认分割点
        assert split_point > 0

    def test_create_segment(self, service):
        """测试创建分段"""
        content = "测试分段内容"
        order = 1
        segment_type = "test"
        metadata = {"key": "value"}

        segment = service._create_segment(content, order, segment_type, metadata)

        # 验证分段结构
        assert segment["content"] == content
        assert segment["order"] == order
        assert segment["type"] == segment_type
        assert segment["metadata"]["key"] == "value"
        assert "word_count" in segment
        assert "char_count" in segment
        assert "summary" in segment

    def test_extract_first_sentence(self, service):
        """测试提取第一句话"""
        content = "这是第一句话。这是第二句话。这是第三句话。"

        first_sentence = service._extract_first_sentence(content)

        assert "第一句话" in first_sentence
        assert len(first_sentence) <= 100  # 应该被截断

    def test_extract_first_sentence_long_content(self, service):
        """测试从长内容中提取第一句话"""
        content = "这是一个非常非常长的句子" * 20 + "。后面还有内容。"

        first_sentence = service._extract_first_sentence(content)

        # 应该被截断到100字符
        assert len(first_sentence) <= 100

    def test_post_process_segments_with_structure(self, service):
        """测试保持结构的后处理"""
        segments = [
            {"content": "分段1", "order": 1, "type": "section"},
            {"content": "分段2", "order": 2, "type": "section"},
        ]

        result = service._post_process_segments(segments, preserve_structure=True)

        # 保持结构时应该返回原分段
        assert len(result) == 2
        assert result == segments

    def test_post_process_segments_without_structure(self, service):
        """测试不保持结构的后处理"""
        segments = [
            {"content": "分段1", "order": 1, "type": "section"},
            {"content": "分段2", "order": 2, "type": "section"},
        ]

        result = service._post_process_segments(segments, preserve_structure=False)

        # 不保持结构时也应该返回分段（可能会有优化）
        assert len(result) >= 1

    @pytest.mark.asyncio
    async def test_segment_content_with_different_types(self, service):
        """测试不同分段类型的处理"""
        content = "测试内容。" * 100

        # 测试所有分段类型
        types_to_test = [
            SegmentationType.SECTION,
            SegmentationType.PARAGRAPH,
            SegmentationType.SEMANTIC,
            SegmentationType.LENGTH_BASED,
        ]

        for seg_type in types_to_test:
            result = await service.segment_content(
                content, "text", segmentation_type=seg_type
            )

            # 所有类型都应该返回分段结果
            assert len(result) >= 1
            assert isinstance(result, list)

    @pytest.mark.asyncio
    async def test_segment_content_error_handling(self, service):
        """测试分段过程中的错误处理"""
        content = "测试内容。" * 100

        # 模拟分段过程中的错误
        with patch.object(
            service, "_segment_by_sections", side_effect=Exception("Test error")
        ):
            result = await service.segment_content(
                content, "text", segmentation_type=SegmentationType.SECTION
            )

            # 应该回退到基于长度的分段
            assert len(result) >= 1

    @pytest.mark.asyncio
    async def test_segment_empty_content(self, service):
        """测试空内容的分段"""
        empty_content = ""

        result = await service.segment_content(empty_content, "text")

        # 空内容应该返回单个空分段
        assert len(result) == 1
        assert result[0]["content"] == ""

    @pytest.mark.asyncio
    async def test_segment_whitespace_content(self, service):
        """测试仅包含空白字符的内容"""
        whitespace_content = "   \n\t  \n   "

        result = await service.segment_content(whitespace_content, "text")

        # 应该正确处理空白内容
        assert len(result) == 1

    @pytest.mark.asyncio
    async def test_segment_content_max_length_boundary(self, service):
        """测试最大长度边界情况"""
        # 创建恰好等于最大长度的内容
        max_length = 100
        content = "x" * max_length

        result = await service.segment_content(
            content, "text", max_segment_length=max_length
        )

        # 应该返回单个分段
        assert len(result) == 1
        assert result[0]["content"] == content

    def test_create_single_segment_metadata(self, service):
        """测试单个分段的元数据"""
        content = "简短内容"

        result = service._create_single_segment(content)

        # 验证元数据
        assert len(result) == 1
        segment = result[0]
        assert segment["metadata"]["is_complete"] is True
        assert segment["metadata"]["segmentation_method"] == "no_segmentation"

    @pytest.mark.asyncio
    async def test_segment_by_sections_max_length_handling(self, service):
        """测试章节分段中的最大长度处理"""
        # 创建一个包含很长章节的内容
        long_section = "这是一个很长的章节内容。" * 200
        content = f"# 第一章\n{long_section}\n\n# 第二章\n短内容"

        service.max_segment_length = 500  # 设置较小的最大长度

        result = await service._segment_by_sections(content)

        # 应该处理超长章节
        assert len(result) >= 2

    @pytest.mark.asyncio
    async def test_segment_chinese_content(self, service):
        """测试中文内容的分段"""
        chinese_content = """第一段：这是中文内容的测试。包含中文标点符号。

第二段：继续测试中文分段功能。这里有更多的中文文本内容。

第三段：最后一段中文内容。验证中文分段的正确性。"""

        result = await service.segment_content(chinese_content, "text")

        # 应该正确处理中文内容
        assert len(result) >= 1

        # 验证中文内容被正确保存
        for segment in result:
            assert len(segment["content"]) > 0
            assert "第" in segment["content"] or "段" in segment["content"]
