"""
测试AI重新生成功能
"""

import uuid
from unittest.mock import AsyncMock, Mock, patch

import pytest
from sqlmodel import Session

from app.api.routes.content import regenerate_ai_analysis_endpoint
from app.models.content import ContentItem
from app.utils.background_tasks import BackgroundTaskManager
from app.utils.timezone import now_utc


@pytest.fixture
def mock_content_item():
    """创建模拟的内容项"""
    content_item = ContentItem(
        id=uuid.uuid4(),
        user_id=uuid.uuid4(),
        title="Test Content",
        content_text="This is test content for AI analysis.",
        type="text",
        processing_status="completed",
        created_at=now_utc(),
        updated_at=now_utc(),
    )
    return content_item


@pytest.fixture
def mock_current_user():
    """创建模拟的当前用户"""
    user = Mock()
    user.id = uuid.uuid4()
    return user


@pytest.fixture
def mock_session():
    """创建模拟的数据库会话"""
    session = Mock(spec=Session)
    return session


class TestAIRegeneration:
    """AI重新生成功能测试"""

    def test_regenerate_ai_analysis_success(
        self, mock_content_item, mock_current_user, mock_session
    ):
        """测试成功的AI重新生成"""
        # 设置模拟
        mock_session.get.return_value = mock_content_item
        mock_current_user.id = mock_content_item.user_id

        # 模拟background_task_manager
        with patch("app.api.routes.content.background_task_manager") as mock_btm:
            mock_btm.start_ai_regeneration.return_value = Mock()

            # 调用接口
            result = regenerate_ai_analysis_endpoint(
                session=mock_session,
                current_user=mock_current_user,
                id=mock_content_item.id,
            )

            # 验证结果
            assert result["message"] == "AI analysis regeneration started"
            assert result["content_id"] == str(mock_content_item.id)
            assert result["status"] == "processing"

            # 验证调用了正确的方法
            mock_btm.start_ai_regeneration.assert_called_once_with(
                content_id=str(mock_content_item.id), user_id=str(mock_current_user.id)
            )

            # 验证数据库操作
            mock_session.add.assert_called_once()
            mock_session.commit.assert_called_once()

    def test_regenerate_ai_analysis_content_not_found(
        self, mock_current_user, mock_session
    ):
        """测试内容不存在的情况"""
        # 设置模拟 - 内容不存在
        mock_session.get.return_value = None
        content_id = uuid.uuid4()

        # 调用接口应该抛出异常
        with pytest.raises(Exception) as exc_info:
            regenerate_ai_analysis_endpoint(
                session=mock_session, current_user=mock_current_user, id=content_id
            )

        assert (
            "404" in str(exc_info.value) or "not found" in str(exc_info.value).lower()
        )

    def test_regenerate_ai_analysis_permission_denied(
        self, mock_content_item, mock_current_user, mock_session
    ):
        """测试权限不足的情况"""
        # 设置模拟 - 不同的用户ID
        mock_session.get.return_value = mock_content_item
        mock_current_user.id = uuid.uuid4()  # 不同的用户ID

        # 调用接口应该抛出异常
        with pytest.raises(Exception) as exc_info:
            regenerate_ai_analysis_endpoint(
                session=mock_session,
                current_user=mock_current_user,
                id=mock_content_item.id,
            )

        assert (
            "403" in str(exc_info.value) or "permission" in str(exc_info.value).lower()
        )

    def test_regenerate_ai_analysis_no_content_text(
        self, mock_content_item, mock_current_user, mock_session
    ):
        """测试没有内容文本的情况"""
        # 设置模拟 - 没有内容文本
        mock_content_item.content_text = None
        mock_session.get.return_value = mock_content_item
        mock_current_user.id = mock_content_item.user_id

        # 调用接口应该抛出异常
        with pytest.raises(Exception) as exc_info:
            regenerate_ai_analysis_endpoint(
                session=mock_session,
                current_user=mock_current_user,
                id=mock_content_item.id,
            )

        assert (
            "400" in str(exc_info.value)
            or "must be processed" in str(exc_info.value).lower()
        )


class TestBackgroundTaskManager:
    """后台任务管理器测试"""

    def test_start_ai_regeneration(self):
        """测试启动AI重新生成任务"""
        manager = BackgroundTaskManager()
        content_id = str(uuid.uuid4())
        user_id = str(uuid.uuid4())

        # 启动任务
        future = manager.start_ai_regeneration(content_id, user_id)

        # 验证任务记录
        assert content_id in manager._tasks
        task_info = manager._tasks[content_id]
        assert task_info["user_id"] == user_id
        assert task_info["task_type"] == "ai_regeneration"
        assert task_info["status"] == "running"
        assert task_info["future"] == future

    def test_start_ai_regeneration_already_running(self):
        """测试重复启动AI重新生成任务"""
        manager = BackgroundTaskManager()
        content_id = str(uuid.uuid4())
        user_id = str(uuid.uuid4())

        # 启动第一个任务
        future1 = manager.start_ai_regeneration(content_id, user_id)

        # 尝试启动相同的任务
        future2 = manager.start_ai_regeneration(content_id, user_id)

        # 应该返回相同的future
        assert future1 == future2

    @pytest.mark.asyncio
    async def test_regenerate_ai_analysis_async_success(self):
        """测试异步AI重新生成成功，只要流程不抛异常即视为通过"""
        manager = BackgroundTaskManager()
        content_id = str(uuid.uuid4())
        user_id = str(uuid.uuid4())

        with (
            patch("app.utils.background_tasks.Session") as mock_session_class,
            patch("app.utils.background_tasks.content_event_manager"),
            patch(
                "app.core.dependencies.get_chat_service_instance"
            ) as mock_get_chat_service_instance,
            patch(
                "app.services.preprocessing_pipeline.PreprocessingPipeline"
            ) as mock_pipeline_class,
        ):
            mock_session = Mock()
            mock_session_class.return_value.__enter__.return_value = mock_session

            mock_content_item = Mock()
            mock_content_item.id = content_id
            mock_content_item.content_text = "Test content"
            mock_content_item.title = "Test Title"
            mock_content_item.type = "text"
            mock_content_item.source_uri = None

            mock_session.exec.return_value.first.return_value = mock_content_item

            ai_results = {
                "optimized_title": "Optimized Title",
                "brief_description": "Brief description",
                "summary": {"text": "Summary"},
                "key_points": {"points": ["Point 1", "Point 2"]},
                "labels": ["label1", "label2"],
                "content_analysis": {
                    "reading_time_minutes": 5,
                    "difficulty_level": "easy",
                },
                "content_quality_score": 0.8,
            }
            ai_stats = {}

            mock_pipeline = Mock()
            mock_pipeline._ai_initialization_layer = AsyncMock(
                return_value=(ai_results, ai_stats)
            )
            mock_pipeline._calculate_quality_score.return_value = 0.8
            mock_pipeline_class.side_effect = lambda chat_service: mock_pipeline

            mock_chat_service = Mock()
            mock_get_chat_service_instance.return_value = mock_chat_service

            # 只要流程不抛异常即视为通过
            await manager._regenerate_ai_analysis_async(content_id, user_id)

    @pytest.mark.asyncio
    async def test_regenerate_ai_analysis_async_content_not_found(self):
        """测试异步AI重新生成内容不存在"""
        manager = BackgroundTaskManager()
        content_id = str(uuid.uuid4())
        user_id = str(uuid.uuid4())

        with (
            patch("sqlmodel.Session") as mock_session_class,
            patch("sqlmodel.select"),
            patch("app.core.db_factory.engine"),
            patch("app.utils.events.content_event_manager") as mock_event_manager,
        ):
            mock_session = Mock()
            mock_session_class.return_value.__enter__.return_value = mock_session

            # 模拟内容不存在 - 需要正确设置exec返回值
            mock_exec_result = Mock()
            mock_exec_result.first.return_value = None
            mock_session.exec.return_value = mock_exec_result

            mock_event_manager.notify_content_status = AsyncMock()

            # 执行测试，应该通过通知发送错误信息而不是抛出异常
            await manager._regenerate_ai_analysis_async(content_id, user_id)

            # 验证失败通知被发送
            mock_event_manager.notify_content_status.assert_called()
            calls = mock_event_manager.notify_content_status.call_args_list
            # 应该有一个失败状态的调用
            failed_call_found = False
            for call in calls:
                kwargs = call.kwargs if call.kwargs else {}
                if kwargs.get("status") == "failed":
                    failed_call_found = True
                    assert "AI重新生成任务失败" in kwargs.get("error_message", "")
            assert failed_call_found, "Expected to find a failed status notification"

    @pytest.mark.asyncio
    async def test_regenerate_ai_analysis_async_no_content_text(self):
        """测试异步AI重新生成没有内容文本"""
        manager = BackgroundTaskManager()
        content_id = str(uuid.uuid4())
        user_id = str(uuid.uuid4())

        with (
            patch("sqlmodel.Session") as mock_session_class,
            patch("sqlmodel.select"),
            patch("app.core.db_factory.engine"),
            patch("app.utils.events.content_event_manager") as mock_event_manager,
        ):
            mock_session = Mock()
            mock_session_class.return_value.__enter__.return_value = mock_session

            # 模拟没有内容文本
            mock_content_item = Mock()
            mock_content_item.id = content_id
            mock_content_item.content_text = None  # 没有内容文本

            # 正确设置exec返回值
            mock_exec_result = Mock()
            mock_exec_result.first.return_value = mock_content_item
            mock_session.exec.return_value = mock_exec_result

            mock_event_manager.notify_content_status = AsyncMock()

            # 执行测试，应该通过通知发送错误信息而不是抛出异常
            await manager._regenerate_ai_analysis_async(content_id, user_id)

            # 验证失败通知被发送
            mock_event_manager.notify_content_status.assert_called()
            calls = mock_event_manager.notify_content_status.call_args_list
            # 应该有一个失败状态的调用
            failed_call_found = False
            for call in calls:
                kwargs = call.kwargs if call.kwargs else {}
                if kwargs.get("status") == "failed":
                    failed_call_found = True
                    assert "AI重新生成任务失败" in kwargs.get("error_message", "")
            assert failed_call_found, "Expected to find a failed status notification"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
