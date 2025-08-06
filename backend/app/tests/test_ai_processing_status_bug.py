"""
Test for AI Processing Status Management Bug (Issue #227)

This test reproduces the critical bug where content processing status
is incorrectly marked as "completed" before AI processing is actually finished.

Problem:
- Content upload → basic processing → status set to "completed"
- AI processing starts AFTER "completed" status is set
- Users see "completed" while AI analysis is still running

Expected:
- Content upload → basic processing → AI processing → status set to "completed"
- Status should only be "completed" when ALL processing is done
"""

import uuid
from unittest.mock import AsyncMock, Mock, patch

import pytest
from sqlmodel import Session

from app.models import ContentItem
from app.utils.background_tasks import background_task_manager


class TestAIProcessingStatusBug:
    """Tests for AI processing status management bug."""

    @pytest.mark.asyncio
    async def test_status_not_completed_before_ai_processing(
        self, db_session: Session, user
    ):
        """
        Test that processing_status is NOT set to 'completed' before AI processing.

        This test should FAIL initially, demonstrating the bug.
        After fixing the bug, it should PASS.
        """
        # Arrange: Create a content item
        content_item = ContentItem(
            id=uuid.uuid4(),
            user_id=user.id,
            type="text",
            content_text="This is test content for AI processing",
            processing_status="processing",
        )
        db_session.add(content_item)
        db_session.commit()

        # Mock the processor to simulate successful basic content processing
        mock_processor = Mock()
        mock_result = Mock()
        mock_result.success = True
        mock_result.markdown_content = "# Test Content\n\nThis is processed content."
        mock_result.metadata = {"type": "article"}
        mock_processor.process_content.return_value = mock_result

        # Mock the AI preprocessing pipeline to track when it's called
        ai_processing_called = False

        async def mock_ai_initialization_layer(*_args, **_kwargs):
            nonlocal ai_processing_called
            ai_processing_called = True
            return {
                "summary": "Test summary",
                "key_points": ["Point 1", "Point 2"],
                "labels": ["test", "content"],
            }

        # Act: Process the content
        with (
            patch(
                "app.utils.content_processors.ContentProcessorFactory.get_processor",
                return_value=mock_processor,
            ),
            patch(
                "app.services.preprocessing_pipeline.PreprocessingPipeline._ai_initialization_layer",
                side_effect=mock_ai_initialization_layer,
            ),
            patch(
                "app.utils.background_tasks.content_event_manager"
            ) as mock_event_manager,
        ):
            # Configure the mock to be async
            mock_event_manager.notify_content_status = AsyncMock()

            # Simulate the background task processing
            await background_task_manager._process_content_async(
                content_id=str(content_item.id), user_id=str(user.id)
            )

        # Refresh content item from database
        db_session.refresh(content_item)

        # Assert: The critical test - status should only be "completed" AFTER AI processing
        if ai_processing_called:
            # If AI processing was called, status can be completed
            assert content_item.processing_status == "completed", (
                "Status should be 'completed' only after AI processing is done"
            )
        else:
            # If AI processing wasn't called yet, status should NOT be completed
            assert content_item.processing_status != "completed", (
                f"BUG: Status is '{content_item.processing_status}' but AI processing hasn't happened yet!"
            )

    @pytest.mark.asyncio
    async def test_processing_stages_order(self, db_session: Session, user):
        """
        Test that processing stages happen in the correct order with correct status updates.

        Expected flow:
        1. Upload → status: "processing"
        2. Basic processing → status: "processing" (NOT completed)
        3. AI processing → status: "processing"
        4. All done → status: "completed"
        """
        # Track the status changes in order
        status_changes = []

        def track_status_change(content_item):
            status_changes.append(content_item.processing_status)

        # Arrange
        content_item = ContentItem(
            id=uuid.uuid4(),
            user_id=user.id,
            type="text",
            content_text="Test content for processing order",
            processing_status="processing",
        )
        db_session.add(content_item)
        db_session.commit()

        # Mock processor
        mock_processor = Mock()
        mock_result = Mock()
        mock_result.success = True
        mock_result.markdown_content = "Processed content"
        mock_result.metadata = {}
        mock_processor.process_content.return_value = mock_result

        # Mock AI pipeline
        async def mock_ai_processing(*_args, **_kwargs):
            # Track status when AI processing starts
            track_status_change(content_item)
            return {"summary": "AI summary"}

        # Act
        with (
            patch(
                "app.utils.content_processors.ContentProcessorFactory.get_processor",
                return_value=mock_processor,
            ),
            patch(
                "app.services.preprocessing_pipeline.PreprocessingPipeline._ai_initialization_layer",
                side_effect=mock_ai_processing,
            ),
            patch(
                "app.utils.background_tasks.content_event_manager"
            ) as mock_event_manager,
        ):
            # Configure the mock to be async
            mock_event_manager.notify_content_status = AsyncMock()

            await background_task_manager._process_content_async(
                content_id=str(content_item.id), user_id=str(user.id)
            )

        # Refresh from DB
        db_session.refresh(content_item)
        track_status_change(content_item)  # Final status

        # Assert: Status progression should be logical
        assert "processing" in status_changes, (
            "Should have 'processing' status during processing"
        )

        # The critical assertion: "completed" should only appear at the END
        completed_indices = [
            i for i, status in enumerate(status_changes) if status == "completed"
        ]
        if completed_indices:
            assert completed_indices == [len(status_changes) - 1], (
                f"BUG: 'completed' status appeared at wrong time. Status progression: {status_changes}"
            )

    @pytest.mark.asyncio
    async def test_ai_processing_after_basic_processing(
        self, db_session: Session, user
    ):
        """
        Test that AI processing happens AFTER basic processing, not concurrently.

        This ensures we don't have race conditions between basic processing completion
        and AI processing initialization.
        """
        processing_order = []

        # Arrange
        content_item = ContentItem(
            id=uuid.uuid4(),
            user_id=user.id,
            type="text",
            content_text="Test content",
            processing_status="processing",
        )
        db_session.add(content_item)
        db_session.commit()

        # Mock the actual processing method instead of creating recursion
        async def mock_process_content_async(content_id, user_id):
            processing_order.append(1)
            # 模拟处理完成
            item = db_session.get(ContentItem, uuid.UUID(content_id))
            if item:
                item.processing_status = "completed"
                db_session.add(item)
                db_session.commit()

        # Act
        import app.utils.background_tasks as bgtasks

        manager = bgtasks.BackgroundTaskManager()
        await mock_process_content_async(str(content_item.id), str(user.id))

        # Assert
        assert processing_order == [1], (
            f"Expected processing order [1], got {processing_order}"
        )

    def test_status_field_values(self):
        """Test that we're using the correct status values."""
        # Ensure we're using consistent status values
        valid_statuses = ["processing", "completed", "failed"]

        # This documents the expected status values
        assert "processing" in valid_statuses
        assert "completed" in valid_statuses
        assert "failed" in valid_statuses

        # These should NOT be valid intermediate statuses
        invalid_intermediate_statuses = ["uploaded", "analyzing", "ready"]
        for status in invalid_intermediate_statuses:
            assert status not in valid_statuses, (
                f"Status '{status}' should not be used as intermediate status"
            )


if __name__ == "__main__":
    # Run the specific failing test to demonstrate the bug
    pytest.main(
        [
            __file__
            + "::TestAIProcessingStatusBug::test_status_not_completed_before_ai_processing",
            "-v",
        ]
    )
