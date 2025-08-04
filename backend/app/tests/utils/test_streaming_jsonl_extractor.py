"""
流式JSONL提取器测试
"""

from app.utils.streaming_jsonl_extractor import (
    ExtractionState,
    StreamingJSONLExtractor,
    create_streaming_jsonl_extractor,
)


class TestStreamingJSONLExtractor:
    """流式JSONL提取器测试类"""

    def test_create_extractor(self):
        """测试创建提取器"""
        extractor = create_streaming_jsonl_extractor()
        assert isinstance(extractor, StreamingJSONLExtractor)
        assert extractor.state == ExtractionState.WAITING_FOR_JSON
        assert extractor.pure_jsonl_content == ""

    def test_basic_jsonl_extraction(self):
        """测试基本JSONL提取"""
        extractor = StreamingJSONLExtractor()

        # 模拟接收到的数据块
        chunks = ['{"t": "h2", "c": "标题"}', '\n{"t": "p", "c": "段落内容"}']

        for chunk in chunks:
            increment, has_new = extractor.process_chunk(chunk)
            if has_new:
                assert increment in chunk

        result = extractor.get_current_jsonl()
        assert '{"t": "h2", "c": "标题"}' in result
        assert '{"t": "p", "c": "段落内容"}' in result

    def test_code_block_extraction(self):
        """测试从代码块中提取JSONL"""
        extractor = StreamingJSONLExtractor()

        # 模拟LLM输出包含代码块的情况
        chunks = [
            "```jsonl\n",
            '{"t": "h2", "c": "核心观点"}\n',
            '{"t": "insight", "c": "重要观点", "ref": "1"}\n',
            "```",
        ]

        all_content = ""
        for chunk in chunks:
            increment, has_new = extractor.process_chunk(chunk)
            if has_new:
                all_content += increment

        result = extractor.get_current_jsonl()
        assert '{"t": "h2", "c": "核心观点"}' in result
        assert '{"t": "insight", "c": "重要观点", "ref": "1"}' in result
        assert "```" not in result  # 确保代码块标记被移除

    def test_mixed_content_extraction(self):
        """测试从混合内容中提取JSONL"""
        extractor = StreamingJSONLExtractor()

        # 模拟包含干扰文本的情况
        chunks = [
            "这是一些说明文字\n",
            "```json\n",
            '{"t": "h2", "c": "标题"}\n',
            '{"t": "p", "c": "内容"}\n',
            "```\n",
            "还有一些结束文字",
        ]

        for chunk in chunks:
            extractor.process_chunk(chunk)

        result = extractor.get_current_jsonl()
        assert '{"t": "h2", "c": "标题"}' in result
        assert '{"t": "p", "c": "内容"}' in result
        assert "说明文字" not in result
        assert "结束文字" not in result

    def test_invalid_json_handling(self):
        """测试无效JSON的处理"""
        extractor = StreamingJSONLExtractor()

        chunks = [
            '{"t": "h2", "c": "valid"}',
            '\n{"invalid": json}',  # 无效JSON
            '\n{"t": "p", "c": "valid again"}',
        ]

        for chunk in chunks:
            extractor.process_chunk(chunk)

        result = extractor.get_current_jsonl()
        assert '{"t": "h2", "c": "valid"}' in result
        assert '{"t": "p", "c": "valid again"}' in result
        assert "invalid" not in result

    def test_incremental_processing(self):
        """测试增量处理"""
        extractor = StreamingJSONLExtractor()

        # 第一块数据
        increment1, has_new1 = extractor.process_chunk('{"t": "h2", "c": "标题"}')
        assert has_new1
        assert '{"t": "h2", "c": "标题"}' in increment1

        # 第二块数据
        increment2, has_new2 = extractor.process_chunk('\n{"t": "p", "c": "段落"}')
        assert has_new2
        assert '{"t": "p", "c": "段落"}' in increment2

        # 完整内容应该包含两个JSON对象
        result = extractor.get_current_jsonl()
        lines = result.strip().split("\n")
        assert len(lines) == 2

    def test_state_transitions(self):
        """测试状态转换"""
        extractor = StreamingJSONLExtractor()

        # 初始状态
        assert extractor.state == ExtractionState.WAITING_FOR_JSON

        # 接收JSON后应该转换状态
        extractor.process_chunk('{"t": "h2", "c": "标题"}')
        assert extractor.state == ExtractionState.EXTRACTING_JSON

        # 接收结束标记后应该完成
        extractor.process_chunk("\n```")
        assert extractor.state == ExtractionState.COMPLETED

    def test_reset_functionality(self):
        """测试重置功能"""
        extractor = StreamingJSONLExtractor()

        # 处理一些数据
        extractor.process_chunk('{"t": "h2", "c": "标题"}')
        assert extractor.has_jsonl_content()

        # 重置
        extractor.reset()
        assert extractor.state == ExtractionState.WAITING_FOR_JSON
        assert extractor.pure_jsonl_content == ""
        assert not extractor.has_jsonl_content()

    def test_real_world_scenario(self):
        """测试真实世界场景"""
        extractor = StreamingJSONLExtractor()

        # 模拟真实的LLM流式输出
        real_chunks = [
            "我来",
            "分析这",
            "个内容：\n\n",
            "```jsonl\n",
            '{"t"',
            ': "h2"',
            ', "c": "核心观点"}\n',
            '{"t": "insight"',
            ', "c": "这是重要的观点"',
            ', "ref": "1,2"}\n',
            '{"t": "h2", "c": "主要内容"}\n',
            '{"t": "p", "c": "详细说明内容"}\n',
            "```\n",
            "分析完成。",
        ]

        accumulated_jsonl = ""
        for chunk in real_chunks:
            increment, has_new = extractor.process_chunk(chunk)
            if has_new:
                accumulated_jsonl += increment

        # 验证最终结果
        result = extractor.get_current_jsonl()
        assert '{"t": "h2", "c": "核心观点"}' in result
        assert '{"t": "insight", "c": "这是重要的观点", "ref": "1,2"}' in result
        assert '{"t": "h2", "c": "主要内容"}' in result
        assert '{"t": "p", "c": "详细说明内容"}' in result

        # 确保不包含干扰内容
        assert "我来分析" not in result
        assert "分析完成" not in result
        assert "```" not in result

    def test_empty_chunk_handling(self):
        """测试空数据块处理"""
        extractor = StreamingJSONLExtractor()

        increment, has_new = extractor.process_chunk("")
        assert not has_new
        assert increment == ""

        increment, has_new = extractor.process_chunk(None)
        assert not has_new
        assert increment == ""

    def test_non_jsonl_content(self):
        """测试非JSONL内容的处理"""
        extractor = StreamingJSONLExtractor()

        # 纯文本内容，不包含JSON
        chunks = ["这是普通的文本内容\n", "没有任何JSON结构\n", "只是普通的说明文字"]

        for chunk in chunks:
            increment, has_new = extractor.process_chunk(chunk)
            assert not has_new

        assert not extractor.has_jsonl_content()
        assert extractor.get_current_jsonl() == ""
