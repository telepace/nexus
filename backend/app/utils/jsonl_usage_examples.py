"""
JSONL 解析器使用示例和最佳实践

本文件展示了如何使用新的 JSONL 解析器系统，包括：
- 基础使用方法
- 高级配置选项
- 自定义扩展
- 错误处理
- 性能优化
"""

import asyncio
import logging
from typing import List, Any, Dict

from .jsonl_parser import (
    create_parser, ParseOptions, PreprocessorConfig,
    DefaultBlockTypeDefinition, LengthValidator, RegexValidator
)
from .jsonl_formatter import (
    create_compact_formatter, create_pretty_formatter, 
    FormatterConfig, FieldMapping, OutputFormat
)
from .jsonl_service import create_service, ServiceConfig

logger = logging.getLogger(__name__)


class JsonlUsageExamples:
    """JSONL 使用示例集合"""

    @staticmethod
    async def basic_parsing_example():
        """基础解析示例"""
        print("=== 基础 JSONL 解析示例 ===")
        
        # 创建解析器
        parser = create_parser()
        
        # 样本 JSONL 数据
        content = '''{"t": "h1", "c": "人工智能发展报告"}
{"t": "p", "c": "人工智能技术在近年来取得了显著进展。"}
{"t": "insight", "c": "深度学习是推动AI发展的关键技术", "expandable": "详细技术分析"}
{"t": "action", "c": "建议加大AI研发投入"}'''
        
        # 解析内容
        result = await parser.parse(content)
        
        print(f"解析成功: {result.success}")
        print(f"块数量: {len(result.blocks)}")
        print(f"错误数量: {len(result.errors)}")
        
        # 输出解析结果
        for i, block in enumerate(result.blocks):
            print(f"块 {i+1}: {block.type} - {block.content[:50]}...")
        
        return result

    @staticmethod
    async def advanced_parsing_with_options():
        """高级解析配置示例"""
        print("\n=== 高级解析配置示例 ===")
        
        parser = create_parser()
        
        # 配置预处理器
        preprocessor_config = PreprocessorConfig(
            remove_code_blocks=True,
            fix_common_errors=True,
            normalize_quotes=True,
            max_line_length=5000
        )
        
        # 配置解析选项
        parse_options = ParseOptions(
            strict_mode=False,
            max_errors=10,
            auto_generate_mapping=True,
            preprocessor=preprocessor_config
        )
        
        # 包含错误的内容
        malformed_content = '''```json
{"t": "h1", "c": "标题"}
{t: "p", c: "缺少引号的内容"}
{"t": "insight", "c": "正常的洞察",}
```'''
        
        result = await parser.parse(malformed_content, parse_options)
        
        print(f"处理结果: 成功={result.success}, 块={len(result.blocks)}, 错误={len(result.errors)}")
        
        for error in result.errors:
            print(f"错误: {error.message} (行 {error.line_number})")
        
        return result

    @staticmethod
    async def custom_block_types_example():
        """自定义块类型示例"""
        print("\n=== 自定义块类型示例 ===")
        
        parser = create_parser()
        
        # 定义自定义块类型
        task_definition = DefaultBlockTypeDefinition(
            "task",
            required_attrs={"t", "c", "priority", "assignee"},
            optional_attrs={"due_date", "tags"}
        )
        
        meeting_definition = DefaultBlockTypeDefinition(
            "meeting",
            required_attrs={"t", "c", "participants"},
            optional_attrs={"location", "agenda"}
        )
        
        # 注册自定义类型
        parser.register_block_type("task", task_definition)
        parser.register_block_type("meeting", meeting_definition)
        
        # 使用自定义类型的内容
        content = '''{"t": "task", "c": "完成JSONL解析器", "priority": "high", "assignee": "开发团队", "tags": ["urgent", "api"]}
{"t": "meeting", "c": "项目评审会议", "participants": ["PM", "开发", "测试"], "location": "会议室A"}'''
        
        result = await parser.parse(content)
        
        print(f"自定义类型解析: {len(result.blocks)} 个块")
        for block in result.blocks:
            print(f"- {block.type}: {block.content}")
            print(f"  属性: {block.attributes}")
        
        return result

    @staticmethod
    async def custom_validators_example():
        """自定义验证器示例"""
        print("\n=== 自定义验证器示例 ===")
        
        parser = create_parser()
        
        # 邮箱验证器
        email_validator = RegexValidator(
            r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$',
            "必须是有效的邮箱地址"
        )
        
        # 优先级验证器
        priority_validator = RegexValidator(
            r'^(low|medium|high|urgent)$',
            "优先级必须是: low, medium, high, urgent"
        )
        
        parser.register_attribute_validator("email", email_validator)
        parser.register_attribute_validator("priority", priority_validator)
        
        # 测试验证
        content = '''{"t": "task", "c": "发送通知", "email": "invalid-email", "priority": "超高"}
{"t": "task", "c": "正常任务", "email": "user@example.com", "priority": "high"}'''
        
        result = await parser.parse(content)
        
        print(f"验证结果: {len(result.blocks)} 个块, {len(result.errors)} 个错误")
        for error in result.errors:
            print(f"验证错误: {error.message}")
        
        return result

    @staticmethod
    async def formatting_examples():
        """格式化示例"""
        print("\n=== 格式化示例 ===")
        
        # 创建测试数据
        parser = create_parser()
        content = '''{"t": "h1", "c": "格式化测试"}
{"t": "p", "c": "这是一个段落", "ref": "p1"}
{"t": "insight", "c": "重要洞察", "priority": "high"}'''
        
        result = await parser.parse(content)
        
        # 紧凑格式
        compact_formatter = create_compact_formatter()
        compact_output = compact_formatter.format_blocks(result.blocks)
        print("紧凑格式:")
        print(compact_output)
        
        # 美化格式
        pretty_formatter = create_pretty_formatter()
        pretty_output = pretty_formatter.format_blocks(result.blocks)
        print("\n美化格式:")
        print(pretty_output)
        
        return compact_output, pretty_output

    @staticmethod
    async def service_integration_example():
        """服务集成示例"""
        print("\n=== 服务集成示例 ===")
        
        # 配置服务
        config = ServiceConfig(
            enable_caching=True,
            cache_size=100,
            enable_stats=True,
            auto_recovery=True
        )
        
        service = create_service(config)
        
        # 注册自定义处理器
        def quality_enhancer(blocks):
            """质量增强处理器"""
            for block in blocks:
                if block.type == "insight" and not block.get_attribute("confidence"):
                    block.attributes["confidence"] = "high"
                elif block.type == "action" and not block.get_attribute("priority"):
                    block.attributes["priority"] = "medium"
            return blocks
        
        service.register_custom_processor(quality_enhancer)
        
        # 处理内容
        content = '''{"t": "h1", "c": "业务分析报告"}
{"t": "insight", "c": "市场趋势向好"}
{"t": "action", "c": "制定营销策略"}'''
        
        result = await service.process_content(content, format_type="pretty")
        
        print(f"服务处理结果: 成功={result['success']}")
        print(f"输入格式: {result['input_format']}")
        print(f"输出格式: {result['output_format']}")
        print(f"处理统计: {result['stats']}")
        
        # 获取处理统计
        stats = service.get_processing_stats()
        print(f"服务统计: 缓存命中率={stats['cache_hit_rate']:.2%}")
        
        return result

    @staticmethod
    async def error_handling_best_practices():
        """错误处理最佳实践"""
        print("\n=== 错误处理最佳实践 ===")
        
        service = create_service()
        
        # 测试各种错误情况
        test_cases = [
            ("空内容", ""),
            ("无效JSON", "这不是JSON"),
            ("部分有效", '{"t": "h1", "c": "正确"}\n无效行\n{"t": "p", "c": "也正确"}'),
            ("编码问题", '{"t": "p", "c": "包含特殊字符"}'),
        ]
        
        for case_name, content in test_cases:
            print(f"\n测试案例: {case_name}")
            try:
                result = await service.process_content(content)
                print(f"  处理结果: 成功={result['success']}")
                print(f"  块数量: {len(result['blocks'])}")
                print(f"  错误数量: {len(result['errors'])}")
                
                if result['errors']:
                    print("  错误详情:")
                    for error in result['errors'][:3]:  # 只显示前3个错误
                        print(f"    - {error['message']}")
                        
            except Exception as e:
                print(f"  异常: {str(e)}")

    @staticmethod
    async def performance_optimization_example():
        """性能优化示例"""
        print("\n=== 性能优化示例 ===")
        
        import time
        
        # 生成大量测试数据
        lines = []
        for i in range(1000):  # 减少数据量以便快速演示
            lines.append(f'{{"t": "p", "c": "段落内容 {i}", "id": {i}}}')
        
        large_content = '\n'.join(lines)
        print(f"生成测试数据: {len(lines)} 行")
        
        # 配置高性能选项
        high_perf_config = ServiceConfig(
            enable_caching=True,
            cache_size=5000,
            enable_stats=True,
            auto_recovery=False,  # 对于已知格式良好的数据，禁用自动恢复
            max_retry_attempts=1
        )
        
        service = create_service(high_perf_config)
        
        # 测试处理时间
        start_time = time.time()
        result = await service.process_content(large_content, format_type="compact")
        processing_time = time.time() - start_time
        
        print(f"处理时间: {processing_time:.2f} 秒")
        print(f"处理速度: {len(lines)/processing_time:.0f} 行/秒")
        print(f"成功率: {result['stats']['successful_blocks']/result['stats']['total_lines']:.2%}")
        
        return result

    @staticmethod
    async def run_all_examples():
        """运行所有示例"""
        print("🚀 JSONL 解析器使用示例")
        print("=" * 50)
        
        examples = [
            JsonlUsageExamples.basic_parsing_example,
            JsonlUsageExamples.advanced_parsing_with_options,
            JsonlUsageExamples.custom_block_types_example,
            JsonlUsageExamples.custom_validators_example,
            JsonlUsageExamples.formatting_examples,
            JsonlUsageExamples.service_integration_example,
            JsonlUsageExamples.error_handling_best_practices,
            JsonlUsageExamples.performance_optimization_example,
        ]
        
        results = []
        for example in examples:
            try:
                result = await example()
                results.append(result)
            except Exception as e:
                print(f"示例执行失败: {e}")
                results.append(None)
        
        print("\n✅ 所有示例执行完成!")
        return results


# 便捷函数
async def quick_parse_example():
    """快速解析示例"""
    from .jsonl_parser import parse_jsonl
    
    content = '{"t": "h1", "c": "快速测试"}'
    result = await parse_jsonl(content)
    
    print(f"快速解析: {result.success}, 块数量: {len(result.blocks)}")
    return result


async def quick_service_example():
    """快速服务示例"""
    from .jsonl_service import process_jsonl_content
    
    content = '''{"t": "h1", "c": "服务测试"}
{"t": "p", "c": "使用便捷函数处理"}'''
    
    result = await process_jsonl_content(content, format_type="pretty")
    
    print(f"服务处理: {result['success']}")
    print(f"格式化输出:\n{result['content']}")
    return result


if __name__ == "__main__":
    # 运行示例
    asyncio.run(JsonlUsageExamples.run_all_examples()) 