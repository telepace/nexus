"""
测试AI模型选择功能
验证不同AI任务使用不同模型的功能
"""

import pytest
from unittest.mock import AsyncMock, patch, ANY, MagicMock

from app.services.ai.chat_service import ChatService, TEMPLATE_MODEL_MAPPING
from app.core.config import settings


class TestAIModelSelection:
    """测试AI模型选择功能"""

    @pytest.fixture
    def chat_service(self):
        """创建ChatService实例"""
        return ChatService()

    def test_template_model_mapping_configuration(self):
        """测试模板-模板映射配置"""
        # 验证映射配置存在且正确
        assert "summary.j2" in TEMPLATE_MODEL_MAPPING
        assert "key_points.j2" in TEMPLATE_MODEL_MAPPING
        assert "labels.j2" in TEMPLATE_MODEL_MAPPING
        
        # 验证映射的模型名称
        assert TEMPLATE_MODEL_MAPPING["summary.j2"] == "or-deepseek-r1"
        assert TEMPLATE_MODEL_MAPPING["key_points.j2"] == "or-deepseek-r1"
        assert TEMPLATE_MODEL_MAPPING["labels.j2"] == "deepseek-v3-ensemble"

    @pytest.mark.asyncio
    async def test_model_selection_logic(self, chat_service):
        """测试模型选择逻辑（不依赖模板渲染）"""
        
        # 模拟模板环境和渲染
        mock_template = MagicMock()
        mock_template.render.return_value = "mocked prompt"
        
        with patch.object(chat_service.template_env, 'get_template', return_value=mock_template):
            with patch.object(chat_service, '_call_litellm_proxy', new_callable=AsyncMock) as mock_call:
                with patch('app.services.ai.chat_service.tag_manager') as mock_tag_manager:
                    # 设置mock返回值
                    mock_call.return_value = "测试响应"
                    mock_tag_manager.get_preset_tag_names.return_value = []
                    mock_tag_manager.filter_and_match_preset_tags.return_value = []
                    
                    # 测试1: summary模板应该使用or-deepseek-r1
                    await chat_service.generate_with_template("summary.j2", {"content": "test"})
                    mock_call.assert_called_with("test", "mocked prompt", "or-deepseek-r1")
                    
                    # 重置mock
                    mock_call.reset_mock()
                    
                    # 测试2: labels模板应该使用deepseek-v3-ensemble
                    await chat_service.generate_with_template("labels.j2", {"content": "test"})
                    mock_call.assert_called_with("test", "mocked prompt", "deepseek-v3-ensemble")
                    
                    # 重置mock
                    mock_call.reset_mock()
                    
                    # 测试3: 显式model参数应该覆盖映射
                    await chat_service.generate_with_template("summary.j2", {"content": "test"}, model="custom-model")
                    mock_call.assert_called_with("test", "mocked prompt", "custom-model")
                    
                    # 重置mock
                    mock_call.reset_mock()
                    
                    # 测试4: 未映射的模板应该使用默认模型
                    await chat_service.generate_with_template("unknown.j2", {"content": "test"})
                    mock_call.assert_called_with("test", "mocked prompt", settings.DEFAULT_LLM_MODEL)

    def test_model_selection_priority(self):
        """测试模型选择优先级逻辑"""
        
        # 测试选择逻辑函数（模拟ChatService内部逻辑）
        def select_model(template_name: str, explicit_model: str = None):
            return (
                explicit_model 
                or TEMPLATE_MODEL_MAPPING.get(template_name) 
                or settings.DEFAULT_LLM_MODEL
            )
        
        # 测试各种情况的优先级
        assert select_model("summary.j2") == "or-deepseek-r1"
        assert select_model("labels.j2") == "deepseek-v3-ensemble"
        assert select_model("unknown.j2") == settings.DEFAULT_LLM_MODEL
        assert select_model("summary.j2", "custom-model") == "custom-model"
        assert select_model("unknown.j2", "custom-model") == "custom-model"

    @pytest.mark.asyncio
    async def test_different_templates_different_models(self, chat_service):
        """测试不同模板确实使用不同模型"""
        
        mock_template = MagicMock()
        mock_template.render.return_value = "mocked prompt"
        
        calls_made = []
        
        async def track_calls(system_content, user_prompt, model):
            calls_made.append(model)
            return "test response"
        
        with patch.object(chat_service.template_env, 'get_template', return_value=mock_template):
            with patch.object(chat_service, '_call_litellm_proxy', side_effect=track_calls):
                with patch('app.services.ai.chat_service.tag_manager') as mock_tag_manager:
                    mock_tag_manager.get_preset_tag_names.return_value = []
                    mock_tag_manager.filter_and_match_preset_tags.return_value = []
                    
                    # 调用不同模板
                    await chat_service.generate_with_template("summary.j2", {"content": "test"})
                    await chat_service.generate_with_template("key_points.j2", {"content": "test"})
                    await chat_service.generate_with_template("labels.j2", {"content": "test"})
                    
                    # 验证使用了正确的模型
                    assert len(calls_made) == 3
                    assert calls_made[0] == "or-deepseek-r1"  # summary
                    assert calls_made[1] == "or-deepseek-r1"  # key_points
                    assert calls_made[2] == "deepseek-v3-ensemble"  # labels
                    
                    # 验证summary和labels使用了不同的模型
                    assert calls_made[0] != calls_made[2] 