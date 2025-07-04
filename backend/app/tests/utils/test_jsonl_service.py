"""
JSONL 服务测试套件

测试 JsonlService 的完整功能，包括：
- 端到端处理流程
- 错误恢复
- 缓存机制
- 性能监控
- 自定义处理器
"""

import pytest
import asyncio
import time
from unittest.mock import Mock, patch

from app.utils.jsonl_service import (
    JsonlService, ServiceConfig, ProcessingStats,
    create_service, process_jsonl_content, process_jsonl_content_sync
)
from app.utils.jsonl_parser import ParseOptions, ParsedBlock


class TestJsonlService:
    """JSONL 服务基础功能测试"""

    @pytest.fixture
    def service(self):
        """创建服务实例"""
        config = ServiceConfig(
            enable_caching=True,
            cache_size=100,
            enable_stats=True,
            auto_recovery=True
        )
        return JsonlService(config)

    @pytest.fixture
    def sample_jsonl(self):
        """样本 JSONL 数据"""
        return '''{"t": "h1", "c": "测试标题"}
{"t": "p", "c": "这是一个测试段落"}
{"t": "insight", "c": "重要洞察内容"}'''

    async def test_basic_processing(self, service, sample_jsonl):
        """测试基础处理功能"""
        result = await service.process_content(sample_jsonl)
        
        assert result["success"] is True
        assert result["input_format"] == "jsonl"
        assert result["output_format"] == "compact"
        assert len(result["blocks"]) == 3
        assert len(result["errors"]) == 0
        assert "content" in result
        assert "stats" in result

    async def test_format_conversion(self, service, sample_jsonl):
        """测试格式转换"""
        # 测试不同输出格式
        compact_result = await service.process_content(sample_jsonl, format_type="compact")
        pretty_result = await service.process_content(sample_jsonl, format_type="pretty")
        
        assert compact_result["success"] is True
        assert pretty_result["success"] is True
        assert compact_result["content"] != pretty_result["content"]  # 格式应该不同

    async def test_validation_functionality(self, service):
        """测试验证功能"""
        valid_content = '{"t": "h1", "c": "标题"}'
        invalid_content = '{invalid json}'
        
        valid_result = await service.validate_jsonl(valid_content)
        invalid_result = await service.validate_jsonl(invalid_content)
        
        assert valid_result["is_valid"] is True
        assert valid_result["error_count"] == 0
        
        assert invalid_result["is_valid"] is False
        assert invalid_result["error_count"] > 0

    async def test_caching_mechanism(self, service, sample_jsonl):
        """测试缓存机制"""
        # 第一次处理
        result1 = await service.process_content(sample_jsonl)
        
        # 第二次处理相同内容（应该从缓存获取）
        result2 = await service.process_content(sample_jsonl)
        
        assert result1["success"] is True
        assert result2["success"] is True
        
        # 检查统计信息
        stats = service.get_processing_stats()
        assert stats["cache_hits"] > 0

    async def test_error_recovery(self, service):
        """测试错误恢复功能"""
        # 包含常见错误的内容
        malformed_content = '''{t: "h1", c: "缺少引号"}
{"t": "p", "c": "正常内容"}'''
        
        result = await service.process_content(malformed_content)
        
        # 应该能恢复部分内容
        assert len(result["blocks"]) > 0
        assert "auto_recovery" in str(result.get("metadata", {})) or len(result["blocks"]) >= 1

    async def test_custom_processors(self, service, sample_jsonl):
        """测试自定义处理器"""
        def add_prefix_processor(blocks):
            """为所有块的内容添加前缀"""
            for block in blocks:
                if isinstance(block.content, str):
                    block.content = f"[处理过的] {block.content}"
            return blocks
        
        service.register_custom_processor(add_prefix_processor)
        
        result = await service.process_content(sample_jsonl)
        
        assert result["success"] is True
        # 检查内容是否被处理过
        for block in result["blocks"]:
            if isinstance(block["content"], str):
                assert block["content"].startswith("[处理过的]")

    async def test_performance_monitoring(self, service, sample_jsonl):
        """测试性能监控"""
        # 处理一些内容
        await service.process_content(sample_jsonl)
        
        stats = service.get_processing_stats()
        
        assert "processing_time" in stats
        assert "success_rate" in stats
        assert "error_rate" in stats
        assert stats["total_lines"] > 0

    def test_sync_processing(self, service, sample_jsonl):
        """测试同步处理接口"""
        result = service.process_content_sync(sample_jsonl)
        
        assert result["success"] is True
        assert len(result["blocks"]) == 3

    async def test_timeout_handling(self):
        """测试超时处理"""
        config = ServiceConfig(timeout_seconds=0.001)  # 极短超时
        service = JsonlService(config)
        
        large_content = '\n'.join([f'{{"t": "p", "c": "内容{i}"}}' for i in range(10000)])
        
        result = await service.process_content(large_content)
        
        # 应该能处理超时情况
        assert "timeout" in result.get("error", "").lower() or result["success"]

    async def test_cache_size_limit(self, service):
        """测试缓存大小限制"""
        # 生成超过缓存大小的不同内容
        for i in range(150):  # 超过默认缓存大小100
            content = f'{{"t": "p", "c": "内容{i}"}}'
            await service.process_content(content)
        
        stats = service.get_processing_stats()
        # 缓存应该被限制
        assert stats["cache_hits"] + stats["cache_misses"] == 150

    async def test_stats_reset(self, service, sample_jsonl):
        """测试统计重置"""
        await service.process_content(sample_jsonl)
        
        stats_before = service.get_processing_stats()
        assert stats_before["total_lines"] > 0
        
        service.reset_stats()
        
        stats_after = service.get_processing_stats()
        assert stats_after["total_lines"] == 0

    async def test_cache_clearing(self, service, sample_jsonl):
        """测试缓存清理"""
        # 添加一些缓存项
        await service.process_content(sample_jsonl)
        
        stats_before = service.get_processing_stats()
        cache_hits_before = stats_before["cache_hits"]
        
        service.clear_cache()
        
        # 再次处理相同内容，应该没有缓存命中
        await service.process_content(sample_jsonl)
        
        stats_after = service.get_processing_stats()
        assert stats_after["cache_misses"] > stats_before["cache_misses"]


class TestServiceConfig:
    """服务配置测试"""

    async def test_disabled_caching(self):
        """测试禁用缓存"""
        config = ServiceConfig(enable_caching=False)
        service = JsonlService(config)
        
        content = '{"t": "h1", "c": "测试"}'
        
        # 处理两次
        await service.process_content(content)
        await service.process_content(content)
        
        stats = service.get_processing_stats()
        assert stats["cache_hits"] == 0

    async def test_disabled_stats(self):
        """测试禁用统计"""
        config = ServiceConfig(enable_stats=False)
        service = JsonlService(config)
        
        content = '{"t": "h1", "c": "测试"}'
        await service.process_content(content)
        
        stats = service.get_processing_stats()
        assert stats["total_lines"] == 0  # 统计应该为空

    async def test_disabled_auto_recovery(self):
        """测试禁用自动恢复"""
        config = ServiceConfig(auto_recovery=False)
        service = JsonlService(config)
        
        malformed_content = '{invalid json}'
        result = await service.process_content(malformed_content)
        
        # 没有自动恢复，应该有更多错误
        assert len(result["errors"]) > 0

    async def test_retry_attempts(self):
        """测试重试次数配置"""
        config = ServiceConfig(max_retry_attempts=1)
        service = JsonlService(config)
        
        # 模拟总是失败的解析
        with patch.object(service.parser, 'parse', side_effect=Exception("模拟错误")):
            result = await service.process_content('{"t": "h1", "c": "测试"}')
            
            assert result["success"] is False
            assert "error" in result


class TestConvenienceFunctions:
    """便捷函数测试"""

    async def test_process_jsonl_content_function(self):
        """测试便捷处理函数"""
        content = '{"t": "h1", "c": "标题"}'
        
        result = await process_jsonl_content(content)
        
        assert result["success"] is True
        assert len(result["blocks"]) == 1

    def test_process_jsonl_content_sync_function(self):
        """测试同步便捷处理函数"""
        content = '{"t": "h1", "c": "标题"}'
        
        result = process_jsonl_content_sync(content)
        
        assert result["success"] is True
        assert len(result["blocks"]) == 1

    def test_create_service_function(self):
        """测试服务创建函数"""
        service = create_service()
        
        assert isinstance(service, JsonlService)
        assert service.config.enable_caching is True


class TestErrorScenarios:
    """错误场景测试"""

    @pytest.fixture
    def service(self):
        return create_service()

    async def test_completely_invalid_input(self, service):
        """测试完全无效的输入"""
        result = await service.process_content("这不是JSON")
        
        # 应该优雅地处理错误
        assert "error" in result or len(result["blocks"]) == 0

    async def test_empty_input(self, service):
        """测试空输入"""
        result = await service.process_content("")
        
        assert result["success"] is True
        assert len(result["blocks"]) == 0

    async def test_very_large_input(self, service):
        """测试超大输入"""
        # 生成大量数据
        lines = []
        for i in range(50000):
            lines.append(f'{{"t": "p", "c": "内容{i}"}}')
        
        large_content = '\n'.join(lines)
        
        result = await service.process_content(large_content)
        
        # 应该能处理大量数据
        assert result["success"] is True or "timeout" in result.get("error", "")

    async def test_malicious_input(self, service):
        """测试恶意输入"""
        # 包含潜在危险字符的输入
        malicious_content = '''{"t": "p", "c": "正常内容"}
{"t": "script", "c": "<script>alert('xss')</script>"}'''
        
        result = await service.process_content(malicious_content)
        
        # 应该安全地处理
        assert result["success"] is True or len(result["errors"]) > 0


class TestPerformanceBenchmarks:
    """性能基准测试"""

    @pytest.fixture
    def service(self):
        return create_service()

    async def test_processing_speed(self, service):
        """测试处理速度"""
        # 生成中等大小的数据
        lines = []
        for i in range(1000):
            lines.append(f'{{"t": "p", "c": "这是第{i}个段落的内容"}}')
        
        content = '\n'.join(lines)
        
        start_time = time.time()
        result = await service.process_content(content)
        processing_time = time.time() - start_time
        
        assert result["success"] is True
        assert processing_time < 2.0  # 应该在2秒内完成1000行
        assert len(result["blocks"]) == 1000

    async def test_memory_efficiency(self, service):
        """测试内存效率"""
        # 多次处理不同内容，检查内存使用
        for i in range(100):
            content = f'{{"t": "p", "c": "内容{i}"}}'
            result = await service.process_content(content)
            assert result["success"] is True
        
        # 如果能完成所有处理而不崩溃，说明内存管理良好

    async def test_concurrent_processing(self, service):
        """测试并发处理"""
        contents = [
            f'{{"t": "h{i % 3 + 1}", "c": "标题{i}"}}' 
            for i in range(50)
        ]
        
        # 并发处理
        tasks = [service.process_content(content) for content in contents]
        results = await asyncio.gather(*tasks)
        
        # 所有结果都应该成功
        assert all(result["success"] for result in results)
        assert len(results) == 50


class TestIntegrationScenarios:
    """集成场景测试"""

    @pytest.fixture
    def service(self):
        return create_service()

    async def test_real_world_jsonl(self, service):
        """测试真实世界的 JSONL 数据"""
        real_world_content = '''{"t": "h1", "c": "人工智能发展现状", "ref": "1"}
{"t": "p", "c": "人工智能技术在近年来取得了显著进展，特别是在深度学习和大语言模型方面。", "ref": "2"}
{"t": "insight", "c": "AI技术的发展速度超出了大多数人的预期", "expandable": "详细分析AI发展趋势"}
{"t": "list", "c": ["机器学习", "深度学习", "自然语言处理", "计算机视觉"], "ref": "3"}
{"t": "quote", "c": "AI将是下一个技术革命的核心", "ref": "4"}
{"t": "action", "c": "建议投资相关技术研发", "ref": "5"}'''
        
        result = await service.process_content(real_world_content)
        
        assert result["success"] is True
        assert len(result["blocks"]) == 6
        
        # 验证不同类型的块
        block_types = [block["type"] for block in result["blocks"]]
        expected_types = ["h1", "p", "insight", "list", "quote", "action"]
        assert block_types == expected_types

    async def test_mixed_format_handling(self, service):
        """测试混合格式处理"""
        mixed_content = '''{"t": "h1", "c": "标题"}
一些普通文本
{"t": "p", "c": "段落"}
# Markdown 标题
{"t": "insight", "c": "洞察"}'''
        
        result = await service.process_content(mixed_content)
        
        # 应该能处理混合格式，即使有错误
        assert len(result["blocks"]) >= 2  # 至少应该解析出有效的JSON行

    async def test_format_conversion_roundtrip(self, service):
        """测试格式转换往返"""
        original_content = '''{"t": "h1", "c": "标题"}
{"t": "p", "c": "段落"}'''
        
        # 处理并格式化为 pretty
        pretty_result = await service.process_content(original_content, format_type="pretty")
        
        # 再次解析 pretty 格式的输出
        roundtrip_result = await service.process_content(pretty_result["content"], format_type="compact")
        
        assert roundtrip_result["success"] is True
        assert len(roundtrip_result["blocks"]) == 2


if __name__ == "__main__":
    pytest.main([__file__]) 