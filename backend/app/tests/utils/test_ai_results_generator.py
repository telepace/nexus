"""
测试AI结果生成器模块
"""

import pytest
import warnings
from unittest.mock import AsyncMock, MagicMock, patch
from sqlmodel import Session

from app.models.content import AIResult, ContentItem
from app.utils.ai_results_generator import generate_and_store_basic_ai_results


class TestAIResultsGenerator:
    """测试AI结果生成器"""

    @pytest.fixture
    def mock_session(self):
        """模拟数据库会话"""
        session = MagicMock(spec=Session)
        session.exec.return_value.first.return_value = None
        return session

    @pytest.fixture
    def sample_content_item(self):
        """创建示例内容项"""
        return ContentItem(
            id="test-content-id",
            user_id="test-user-id",
            type="text",
            source_uri="test://content",
            title="测试内容",
            content_text="这是一段测试内容"
        )

    @pytest.mark.asyncio
    async def test_generate_and_store_basic_ai_results_deprecation_warning(
        self, mock_session, sample_content_item
    ):
        """测试生成基本AI结果时的弃用警告"""
        markdown_content = "# 测试标题\n这是一段测试内容。"
        
        # 模拟ChatService
        with patch('app.utils.ai_results_generator.ChatService') as mock_chat_service:
            mock_service = AsyncMock()
            mock_chat_service.return_value = mock_service
            
            # 设置模拟返回值
            mock_service.generate_with_template.side_effect = [
                {"summary": {"text": "测试摘要"}},
                {"key_points": {"points": ["要点1", "要点2"]}},
                {"tags": ["标签1", "标签2"], "reading_time_minutes": 5}
            ]
            
            # 测试弃用警告
            with warnings.catch_warnings(record=True) as w:
                warnings.simplefilter("always")
                
                await generate_and_store_basic_ai_results(
                    mock_session, sample_content_item, markdown_content
                )
                
                # 验证弃用警告被触发
                assert len(w) == 1
                assert issubclass(w[0].category, DeprecationWarning)
                assert "deprecated" in str(w[0].message)

    @pytest.mark.asyncio
    async def test_generate_and_store_basic_ai_results_empty_content(
        self, mock_session, sample_content_item
    ):
        """测试空内容的处理"""
        empty_content = ""
        
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", DeprecationWarning)
            
            await generate_and_store_basic_ai_results(
                mock_session, sample_content_item, empty_content
            )
            
            # 空内容应该被跳过，不添加到会话
            mock_session.add.assert_not_called()

    @pytest.mark.asyncio
    async def test_generate_and_store_basic_ai_results_whitespace_content(
        self, mock_session, sample_content_item
    ):
        """测试仅包含空白字符的内容"""
        whitespace_content = "   \n\t  \n   "
        
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", DeprecationWarning)
            
            await generate_and_store_basic_ai_results(
                mock_session, sample_content_item, whitespace_content
            )
            
            # 空白内容应该被跳过
            mock_session.add.assert_not_called()

    @pytest.mark.asyncio
    async def test_generate_and_store_basic_ai_results_new_record(
        self, mock_session, sample_content_item
    ):
        """测试创建新的AI结果记录"""
        markdown_content = "# 测试标题\n这是一段测试内容，包含```代码块```。"
        
        # 确保没有现有记录
        mock_session.exec.return_value.first.return_value = None
        
        with patch('app.utils.ai_results_generator.ChatService') as mock_chat_service:
            mock_service = AsyncMock()
            mock_chat_service.return_value = mock_service
            
            # 设置模拟返回值
            mock_service.generate_with_template.side_effect = [
                {"summary": {"text": "测试摘要"}},
                {"key_points": {"points": ["要点1", "要点2"]}},
                {"tags": ["标签1", "标签2"], "reading_time_minutes": 3}
            ]
            
            with warnings.catch_warnings():
                warnings.simplefilter("ignore", DeprecationWarning)
                
                await generate_and_store_basic_ai_results(
                    mock_session, sample_content_item, markdown_content
                )
                
                # 验证新记录被创建
                mock_session.add.assert_called_once()
                added_record = mock_session.add.call_args[0][0]
                assert isinstance(added_record, AIResult)
                assert added_record.content_item_id == sample_content_item.id

    @pytest.mark.asyncio
    async def test_generate_and_store_basic_ai_results_update_existing(
        self, mock_session, sample_content_item
    ):
        """测试更新现有的AI结果记录"""
        markdown_content = "# 更新内容\n这是更新后的内容。"
        
        # 创建现有记录
        existing_result = AIResult(
            id="existing-id",
            content_item_id=sample_content_item.id,
            summary={"text": "旧摘要"},
            key_points={"points": ["旧要点"]},
            labels=["旧标签"],
            reading_time_minutes=1,
            difficulty_level="beginner",
            content_quality_score=3.0,
            content_analysis={}
        )
        mock_session.exec.return_value.first.return_value = existing_result
        
        with patch('app.utils.ai_results_generator.ChatService') as mock_chat_service:
            mock_service = AsyncMock()
            mock_chat_service.return_value = mock_service
            
            # 设置模拟返回值
            mock_service.generate_with_template.side_effect = [
                {"summary": {"text": "新摘要"}},
                {"key_points": {"points": ["新要点1", "新要点2"]}},
                {"tags": ["新标签1", "新标签2"]}
            ]
            
            with warnings.catch_warnings():
                warnings.simplefilter("ignore", DeprecationWarning)
                
                await generate_and_store_basic_ai_results(
                    mock_session, sample_content_item, markdown_content
                )
                
                # 验证现有记录被更新
                mock_session.add.assert_called_once_with(existing_result)
                assert existing_result.summary == {"text": "新摘要"}

    @pytest.mark.asyncio
    async def test_ai_reading_time_fallback(self, mock_session, sample_content_item):
        """测试AI阅读时间回退到算法估算"""
        # 创建长内容以测试阅读时间计算
        words = ["这是测试词"] * 500  # 大约500个词
        markdown_content = " ".join(words)
        
        with patch('app.utils.ai_results_generator.ChatService') as mock_chat_service:
            mock_service = AsyncMock()
            mock_chat_service.return_value = mock_service
            
            # AI没有返回有效的阅读时间
            mock_service.generate_with_template.side_effect = [
                {"summary": {"text": "摘要"}},
                {"key_points": {"points": ["要点"]}},
                {"tags": ["标签"]}  # 没有reading_time_minutes
            ]
            
            with warnings.catch_warnings():
                warnings.simplefilter("ignore", DeprecationWarning)
                
                await generate_and_store_basic_ai_results(
                    mock_session, sample_content_item, markdown_content
                )
                
                # 验证使用算法估算的阅读时间
                added_record = mock_session.add.call_args[0][0]
                # 500词 / 200词每分钟 = 2.5，向上取整为3分钟
                assert added_record.reading_time_minutes >= 2

    @pytest.mark.asyncio
    async def test_content_analysis_generation(self, mock_session, sample_content_item):
        """测试内容分析生成"""
        markdown_content = "# 标题\n这是包含```代码```的测试内容。独特的 词汇 在此。"
        
        with patch('app.utils.ai_results_generator.ChatService') as mock_chat_service:
            mock_service = AsyncMock()
            mock_chat_service.return_value = mock_service
            
            mock_service.generate_with_template.side_effect = [
                {"summary": {"text": "摘要"}},
                {"key_points": {"points": ["要点"]}},
                {"tags": ["标签"]}
            ]
            
            with warnings.catch_warnings():
                warnings.simplefilter("ignore", DeprecationWarning)
                
                await generate_and_store_basic_ai_results(
                    mock_session, sample_content_item, markdown_content
                )
                
                added_record = mock_session.add.call_args[0][0]
                analysis = added_record.content_analysis
                
                # 验证分析字段
                assert "word_count" in analysis
                assert "char_count" in analysis
                assert "unique_words" in analysis
                assert "contains_code" in analysis
                assert analysis["contains_code"] is True  # 因为有```代码```

    @pytest.mark.asyncio
    async def test_heuristic_fallback_for_failed_ai(
        self, mock_session, sample_content_item
    ):
        """测试AI失败时的启发式回退"""
        markdown_content = "这是测试内容。包含一些测试 测试 重复 重复 重复 词汇。"
        
        with patch('app.utils.ai_results_generator.ChatService') as mock_chat_service:
            mock_service = AsyncMock()
            mock_chat_service.return_value = mock_service
            
            # AI返回空结果或失败
            mock_service.generate_with_template.side_effect = [
                {},  # 空摘要
                {},  # 空要点
                []   # 空标签
            ]
            
            with warnings.catch_warnings():
                warnings.simplefilter("ignore", DeprecationWarning)
                
                await generate_and_store_basic_ai_results(
                    mock_session, sample_content_item, markdown_content
                )
                
                added_record = mock_session.add.call_args[0][0]
                
                # 验证启发式回退
                assert "text" in added_record.summary
                assert len(added_record.summary["text"]) <= 120
                assert "points" in added_record.key_points

    @pytest.mark.asyncio
    async def test_normalize_response_function(self, mock_session, sample_content_item):
        """测试响应标准化函数"""
        markdown_content = "测试内容"
        
        with patch('app.utils.ai_results_generator.ChatService') as mock_chat_service:
            mock_service = AsyncMock()
            mock_chat_service.return_value = mock_service
            
            # 测试不同类型的AI响应
            mock_service.generate_with_template.side_effect = [
                "字符串摘要",  # 字符串响应
                {"text": "要点文本"},  # 包含text的字典
                {"custom_field": "自定义"}  # 其他字典格式
            ]
            
            with warnings.catch_warnings():
                warnings.simplefilter("ignore", DeprecationWarning)
                
                await generate_and_store_basic_ai_results(
                    mock_session, sample_content_item, markdown_content
                )
                
                added_record = mock_session.add.call_args[0][0]
                
                # 验证不同响应类型的标准化
                assert isinstance(added_record.summary, dict)
                assert isinstance(added_record.key_points, dict)

    @pytest.mark.asyncio
    async def test_quality_score_calculation(self, mock_session, sample_content_item):
        """测试质量分数计算"""
        # 创建具有不同独特词比例的内容
        markdown_content = "独特 词汇 每个 都是 不同的 内容"  # 高独特性
        
        with patch('app.utils.ai_results_generator.ChatService') as mock_chat_service:
            mock_service = AsyncMock()
            mock_chat_service.return_value = mock_service
            
            mock_service.generate_with_template.side_effect = [
                {"summary": {"text": "摘要"}},
                {"key_points": {"points": ["要点"]}},
                {"tags": ["标签"]}
            ]
            
            with warnings.catch_warnings():
                warnings.simplefilter("ignore", DeprecationWarning)
                
                await generate_and_store_basic_ai_results(
                    mock_session, sample_content_item, markdown_content
                )
                
                added_record = mock_session.add.call_args[0][0]
                
                # 验证质量分数范围
                assert 0 <= added_record.content_quality_score <= 5
                assert isinstance(added_record.content_quality_score, float)

    @pytest.mark.asyncio
    async def test_labels_response_formats(self, mock_session, sample_content_item):
        """测试不同标签响应格式的处理"""
        markdown_content = "测试内容"
        
        test_cases = [
            # 不同的标签响应格式
            ({"tags": ["标签1", "标签2"]}, ["标签1", "标签2"]),
            (["直接", "列表"], ["直接", "列表"]),
            ("字符串响应", []),
            ({}, [])
        ]
        
        for labels_response, expected_labels in test_cases:
            mock_session.reset_mock()
            mock_session.exec.return_value.first.return_value = None
            
            with patch('app.utils.ai_results_generator.ChatService') as mock_chat_service:
                mock_service = AsyncMock()
                mock_chat_service.return_value = mock_service
                
                mock_service.generate_with_template.side_effect = [
                    {"summary": {"text": "摘要"}},
                    {"key_points": {"points": ["要点"]}},
                    labels_response
                ]
                
                with warnings.catch_warnings():
                    warnings.simplefilter("ignore", DeprecationWarning)
                    
                    await generate_and_store_basic_ai_results(
                        mock_session, sample_content_item, markdown_content
                    )
                    
                    added_record = mock_session.add.call_args[0][0]
                    assert added_record.labels == expected_labels 