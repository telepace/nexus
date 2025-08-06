"""
测试AI模型选择功能
验证不同AI任务使用不同模型的功能
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.core.config import settings
from app.services.ai.chat_service import ChatService


class TestAIModelSelection:
    """测试AI模型选择功能"""

    @pytest.fixture
    def chat_service(self):
        """创建ChatService实例"""
        return ChatService()

    def test_template_model_mapping_configuration(self):
        """测试模板-模型映射配置"""
        # 验证解析的模型配置存在且正确
        resolved_models = settings.resolved_ai_task_models

        assert "summary" in resolved_models
        assert "key_points" in resolved_models
        assert "labels" in resolved_models

        # 验证映射的模型名称（基于实际环境配置）
        # 注意：这些值由环境变量决定，测试应验证配置是否存在而不是硬编码特定值
        assert isinstance(resolved_models["summary"], str)
        assert isinstance(resolved_models["key_points"], str)
        assert isinstance(resolved_models["labels"], str)

    @pytest.mark.asyncio
    async def test_model_selection_logic(self, chat_service):
        """测试模型选择逻辑（不依赖模板渲染）"""
        # 模拟模板环境，避免实际文件依赖
        with patch.object(chat_service, "template_env") as mock_env:
            mock_template = MagicMock()
            mock_template.render.return_value = "mocked prompt"
            mock_env.get_template.return_value = mock_template

            # 模拟LiteLLM调用
            with patch.object(
                chat_service, "_call_litellm_proxy", new_callable=AsyncMock
            ) as mock_call:
                mock_call.return_value = "mocked response"

                # 测试1: Summary模板应该使用配置的模型
                await chat_service.generate_with_template(
                    "summary.j2", {"content": "test"}
                )
                # 获取实际配置的模型
                expected_model = settings.resolved_ai_task_models["summary"]
                mock_call.assert_called_with("test", "mocked prompt", expected_model)

                # 重置mock
                mock_call.reset_mock()

                # 测试2: KeyPoints模板应该使用配置的模型
                await chat_service.generate_with_template(
                    "key_points.j2", {"content": "test"}
                )
                expected_model = settings.resolved_ai_task_models["key_points"]
                mock_call.assert_called_with("test", "mocked prompt", expected_model)

                # 重置mock
                mock_call.reset_mock()

                # 测试3: 显式传入的模型应该有最高优先级
                await chat_service.generate_with_template(
                    "summary.j2", {"content": "test"}, model="custom-model"
                )
                mock_call.assert_called_with("test", "mocked prompt", "custom-model")

                # 重置mock
                mock_call.reset_mock()

                # 测试4: 未映射的模板应该使用默认模型
                await chat_service.generate_with_template(
                    "unknown.j2", {"content": "test"}
                )
                mock_call.assert_called_with(
                    "test", "mocked prompt", settings.DEFAULT_LLM_MODEL
                )

    def test_model_selection_priority(self):
        """测试模型选择优先级逻辑"""
        chat_service = ChatService()

        # 测试选择逻辑函数（模拟ChatService内部逻辑）
        def select_model(template_name: str, explicit_model: str = None):
            return explicit_model or chat_service.get_model_for_template(template_name)

        # 测试各种情况的优先级
        resolved_models = settings.resolved_ai_task_models
        assert select_model("summary.j2") == resolved_models["summary"]
        assert select_model("labels.j2") == resolved_models["labels"]
        assert select_model("unknown.j2") == settings.DEFAULT_LLM_MODEL
        assert select_model("summary.j2", "custom-model") == "custom-model"
        assert select_model("unknown.j2", "custom-model") == "custom-model"
