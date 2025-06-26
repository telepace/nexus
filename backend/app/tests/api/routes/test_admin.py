"""
测试管理员路由
"""

from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException

from app.api.routes.admin import router
from app.models import User


class TestAdminRoutes:
    """测试管理员路由"""

    @pytest.fixture
    def mock_user(self):
        """创建模拟用户"""
        user = MagicMock(spec=User)
        user.is_superuser = True
        return user

    @pytest.fixture
    def mock_non_admin_user(self):
        """创建模拟非管理员用户"""
        user = MagicMock(spec=User)
        user.is_superuser = False
        return user

    @pytest.mark.asyncio
    async def test_get_processors_status_success(self, mock_user):
        """测试成功获取处理器状态"""
        from app.api.routes.admin import get_processors_status

        mock_diagnosis = {
            "overall_status": "healthy",
            "processors": {
                "jina": {"status": "available", "error": None},
                "readability": {"status": "available", "error": None},
            },
        }

        with patch("app.api.routes.admin.ProcessorDiagnostic") as mock_diagnostic:
            mock_instance = MagicMock()
            mock_instance.diagnose_all.return_value = mock_diagnosis
            mock_diagnostic.return_value = mock_instance

            result = await get_processors_status(current_user=mock_user)

            # 验证结果
            assert result == mock_diagnosis
            mock_instance.diagnose_all.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_processors_status_non_admin(self, mock_non_admin_user):
        """测试非管理员用户访问处理器状态"""
        from app.api.routes.admin import get_processors_status

        with pytest.raises(HTTPException) as exc_info:
            await get_processors_status(current_user=mock_non_admin_user)

        assert exc_info.value.status_code == 403
        assert "Only superusers" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_get_processors_status_error(self, mock_user):
        """测试获取处理器状态时发生错误"""
        from app.api.routes.admin import get_processors_status

        with patch("app.api.routes.admin.ProcessorDiagnostic") as mock_diagnostic:
            mock_instance = MagicMock()
            mock_instance.diagnose_all.side_effect = Exception("Diagnostic failed")
            mock_diagnostic.return_value = mock_instance

            with pytest.raises(HTTPException) as exc_info:
                await get_processors_status(current_user=mock_user)

            assert exc_info.value.status_code == 500
            assert "Failed to get processor status" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_test_processor_jina_success(self, mock_user):
        """测试成功测试Jina处理器"""
        from app.api.routes.admin import test_processor

        mock_test_result = {"status": "available", "response_time": 0.5, "error": None}

        with patch("app.api.routes.admin.ProcessorDiagnostic") as mock_diagnostic:
            mock_instance = MagicMock()
            mock_instance._diagnose_jina.return_value = mock_test_result
            mock_diagnostic.return_value = mock_instance

            result = await test_processor("jina", current_user=mock_user)

            # 验证结果包含测试时间
            assert "tested_at" in result
            assert result["status"] == "available"

    @pytest.mark.asyncio
    async def test_test_processor_firecrawl_success(self, mock_user):
        """测试成功测试Firecrawl处理器"""
        from app.api.routes.admin import test_processor

        mock_test_result = {"status": "unavailable", "error": "API key not configured"}

        with patch("app.api.routes.admin.ProcessorDiagnostic") as mock_diagnostic:
            mock_instance = MagicMock()
            mock_instance._diagnose_firecrawl.return_value = mock_test_result
            mock_diagnostic.return_value = mock_instance

            result = await test_processor("firecrawl", current_user=mock_user)

            assert result["status"] == "unavailable"
            assert "tested_at" in result

    @pytest.mark.asyncio
    async def test_test_processor_unsupported(self, mock_user):
        """测试不支持的处理器"""
        from app.api.routes.admin import test_processor

        with pytest.raises(HTTPException) as exc_info:
            await test_processor("unsupported_processor", current_user=mock_user)

        assert exc_info.value.status_code == 404
        assert "not found" in str(exc_info.value.detail)
        assert "Supported processors" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_test_processor_non_admin(self, mock_non_admin_user):
        """测试非管理员用户测试处理器"""
        from app.api.routes.admin import test_processor

        with pytest.raises(HTTPException) as exc_info:
            await test_processor("jina", current_user=mock_non_admin_user)

        assert exc_info.value.status_code == 403
        assert "Only superusers" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_test_processor_creation_error(self, mock_user):
        """测试处理器创建错误"""
        from app.api.routes.admin import test_processor

        with patch("app.api.routes.admin.ProcessorDiagnostic") as mock_diagnostic:
            mock_instance = MagicMock()
            mock_instance._diagnose_jina.side_effect = Exception(
                "Failed to create processor"
            )
            mock_diagnostic.return_value = mock_instance

            with pytest.raises(HTTPException) as exc_info:
                await test_processor("jina", current_user=mock_user)

            assert exc_info.value.status_code == 500
            assert "Failed to test processor" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_test_all_supported_processors(self, mock_user):
        """测试所有支持的处理器"""
        from app.api.routes.admin import test_processor

        supported_processors = [
            "jina",
            "firecrawl",
            "scrapingbee",
            "readability",
            "markitdown",
        ]

        for processor_name in supported_processors:
            mock_test_result = {"status": "available", "processor": processor_name}

            with patch("app.api.routes.admin.ProcessorDiagnostic") as mock_diagnostic:
                mock_instance = MagicMock()
                # 根据处理器名称设置对应的方法
                method_name = f"_diagnose_{processor_name}"
                setattr(
                    mock_instance, method_name, MagicMock(return_value=mock_test_result)
                )
                mock_diagnostic.return_value = mock_instance

                result = await test_processor(processor_name, current_user=mock_user)

                assert "tested_at" in result
                assert result["processor"] == processor_name

    @pytest.mark.asyncio
    async def test_reorder_processors_success(self, mock_user):
        """测试成功重新排序处理器"""
        from app.api.routes.admin import reorder_processors

        new_order = ["jina", "readability", "markitdown", "firecrawl"]

        result = await reorder_processors(new_order, current_user=mock_user)

        # 验证返回结果
        assert "message" in result
        assert "new_order" in result
        assert result["new_order"] == new_order
        assert "note" in result  # 演示端点的说明

    @pytest.mark.asyncio
    async def test_reorder_processors_non_admin(self, mock_non_admin_user):
        """测试非管理员用户重新排序处理器"""
        from app.api.routes.admin import reorder_processors

        new_order = ["jina", "readability"]

        with pytest.raises(HTTPException) as exc_info:
            await reorder_processors(new_order, current_user=mock_non_admin_user)

        assert exc_info.value.status_code == 403
        assert "Only superusers" in str(exc_info.value.detail)

    def test_router_configuration(self):
        """测试路由器配置"""
        # 验证路由器的基本配置
        assert router.prefix == "/admin"
        assert "admin" in router.tags

    @pytest.mark.asyncio
    async def test_processor_import_errors(self, mock_user):
        """测试处理器导入错误的处理"""
        from app.api.routes.admin import test_processor

        # 模拟导入错误
        with patch("app.api.routes.admin.ProcessorDiagnostic") as mock_diagnostic:
            mock_instance = MagicMock()
            mock_instance._diagnose_jina.side_effect = ImportError("Module not found")
            mock_diagnostic.return_value = mock_instance

            with pytest.raises(HTTPException) as exc_info:
                await test_processor("jina", current_user=mock_user)

            assert exc_info.value.status_code == 500

    @pytest.mark.asyncio
    async def test_empty_processor_order(self, mock_user):
        """测试空的处理器顺序"""
        from app.api.routes.admin import reorder_processors

        result = await reorder_processors([], current_user=mock_user)

        assert result["new_order"] == []
        assert "message" in result

    @pytest.mark.asyncio
    async def test_processor_status_logging(self, mock_user):
        """测试处理器状态日志记录"""
        from app.api.routes.admin import get_processors_status

        with patch("app.api.routes.admin.ProcessorDiagnostic") as mock_diagnostic:
            mock_instance = MagicMock()
            mock_instance.diagnose_all.side_effect = Exception("Test error")
            mock_diagnostic.return_value = mock_instance

            # 捕获日志
            with patch("app.api.routes.admin.logger") as mock_logger:
                try:
                    await get_processors_status(current_user=mock_user)
                except HTTPException:
                    pass

                # 验证错误被记录
                mock_logger.error.assert_called_once()

    @pytest.mark.asyncio
    async def test_processor_test_logging(self, mock_user):
        """测试处理器测试日志记录"""
        from app.api.routes.admin import test_processor

        with patch("app.api.routes.admin.ProcessorDiagnostic") as mock_diagnostic:
            mock_instance = MagicMock()
            mock_instance._diagnose_jina.side_effect = Exception("Test error")
            mock_diagnostic.return_value = mock_instance

            # 捕获日志
            with patch("app.api.routes.admin.logger") as mock_logger:
                try:
                    await test_processor("jina", current_user=mock_user)
                except HTTPException:
                    pass

                # 验证错误被记录
                mock_logger.error.assert_called_once()
                error_call = mock_logger.error.call_args[0][0]
                assert "Failed to test processor jina" in error_call
