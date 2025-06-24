"""
Tests for content processors that convert various input types to Markdown format.
"""

import uuid
from unittest.mock import Mock, patch

import requests
from sqlmodel import Session

from app.models.content import ContentItem
from app.utils.content_processors import (
    ContentProcessorFactory,
    JinaProcessor,
    MarkItDownProcessor,
    ModernProcessor,
    ProcessingContext,
    ProcessingPipeline,
    ProcessingResult,
    ProcessingStep,
    ProcessorBase,
)


class TestProcessorBase:
    """Test the base processor class functionality."""

    def test_base_processor_interface(self):
        """Test that base processor defines required interface."""

        class TestProcessor(ProcessorBase):
            def process_content(
                self, content_item: ContentItem, session: Session
            ) -> ProcessingResult:
                return ProcessingResult(
                    success=True, markdown_content="# Test", metadata={"test": True}
                )

        processor = TestProcessor()
        assert hasattr(processor, "process_content")
        # Note: supported_types is no longer required in the new architecture

    def test_modern_processor_uses_pipeline(self):
        """Test that ModernProcessor uses the new pipeline system."""
        processor = ModernProcessor()
        assert hasattr(processor, "pipeline")
        assert isinstance(processor.pipeline, ProcessingPipeline)


class TestProcessingStep:
    """Test the processing step interface."""

    def test_processing_step_interface(self):
        """Test that processing step interface is properly defined."""

        class TestStep(ProcessingStep):
            def can_handle(self, content_type: str) -> bool:
                return content_type == "test"

            def process(
                self, context: ProcessingContext, result: ProcessingResult
            ) -> ProcessingResult:
                result.success = True
                result.markdown_content = "# Test content"
                return result

        step = TestStep()
        assert hasattr(step, "can_handle")
        assert hasattr(step, "process")
        assert step.can_handle("test")
        assert not step.can_handle("other")


class TestMarkItDownProcessor:
    """Test the MarkItDown processor functionality."""

    def test_markitdown_processor_can_handle_types(self):
        """Test MarkItDownProcessor can handle various content types."""
        processor = MarkItDownProcessor()

        # Test supported types
        assert processor.can_handle("text")
        assert processor.can_handle("url")
        assert processor.can_handle("pdf")
        assert processor.can_handle("docx")

        # Test unsupported types (not in the supported list)
        assert not processor.can_handle("unknown")

    @patch("app.utils.content_processors.get_storage_service")
    def test_markitdown_processor_text_processing(self, mock_storage_service):
        """Test MarkItDownProcessor text processing."""
        # Mock storage service
        mock_storage = Mock()
        mock_storage_service.return_value = mock_storage

        processor = MarkItDownProcessor()
        mock_session = Mock(spec=Session)

        content_item = ContentItem(
            id=uuid.uuid4(),
            user_id=uuid.uuid4(),
            type="text",
            title="Test Text",
            content_text="This is test content for MarkItDown processor.",
            processing_status="pending",
        )

        context = ProcessingContext(
            content_item=content_item,
            session=mock_session,
            user_id=content_item.user_id,
            storage_service=mock_storage,
        )

        result = ProcessingResult(success=False)
        result = processor.process(context, result)

        # Should process successfully
        assert result.success is True
        assert result.markdown_content is not None
        assert "test content" in result.markdown_content


class TestProcessingPipeline:
    """Test the processing pipeline functionality."""

    def test_pipeline_initialization(self):
        """Test ProcessingPipeline initializes correctly."""
        pipeline = ProcessingPipeline()
        assert hasattr(pipeline, "steps")
        assert hasattr(pipeline, "ai_steps")

    def test_pipeline_add_step(self):
        """Test adding steps to pipeline."""
        pipeline = ProcessingPipeline()

        class CustomStep(ProcessingStep):
            def can_handle(self, content_type: str) -> bool:
                return content_type == "custom"

            def process(
                self, context: ProcessingContext, result: ProcessingResult
            ) -> ProcessingResult:
                result.success = True
                result.markdown_content = "# Custom content"
                return result

        step = CustomStep()
        pipeline.add_step(step)
        assert step in pipeline.steps

    @patch("app.utils.content_processors.get_storage_service")
    @patch("app.utils.content_processors.ProcessingPipeline._register_default_steps")
    def test_pipeline_process_content(self, mock_register_steps, mock_storage_service):
        """Test ProcessingPipeline processes content successfully."""
        # Mock storage service
        mock_storage = Mock()
        mock_storage_service.return_value = mock_storage

        # Create pipeline with mock registration
        pipeline = ProcessingPipeline()

        # Manually add a working MarkItDown processor for testing
        mock_markitdown_processor = Mock(spec=MarkItDownProcessor)
        mock_markitdown_processor.can_handle.return_value = True
        mock_markitdown_processor.process.return_value = ProcessingResult(
            success=True,
            markdown_content="# Test content for pipeline",
            metadata={"processor": "markitdown", "test": True},
        )
        mock_markitdown_processor.__class__.__name__ = "MarkItDownProcessor"

        pipeline.steps = [mock_markitdown_processor]

        mock_session = Mock(spec=Session)

        content_item = ContentItem(
            id=uuid.uuid4(),
            user_id=uuid.uuid4(),
            type="text",
            title="Pipeline Test",
            content_text="Test content for pipeline processing.",
            processing_status="pending",
        )

        result = pipeline.process(content_item, mock_session)

        # Verify processing result
        assert hasattr(result, "success")
        assert isinstance(result, ProcessingResult)
        # For text content, MarkItDown processor should handle it successfully
        assert result.success is True
        assert result.markdown_content is not None
        assert "Test content for pipeline" in result.markdown_content


class TestContentProcessorFactory:
    """Test the processor factory functionality."""

    def test_factory_returns_modern_processor(self):
        """Test factory returns ModernProcessor for all types."""
        processor = ContentProcessorFactory.get_processor("text")
        assert isinstance(processor, ModernProcessor)

        processor = ContentProcessorFactory.get_processor("url")
        assert isinstance(processor, ModernProcessor)

    def test_factory_register_processor(self):
        """Test factory can register new processor types."""

        class CustomProcessor(ProcessorBase):
            def process_content(
                self, content_item: ContentItem, session: Session
            ) -> ProcessingResult:
                return ProcessingResult(success=True, markdown_content="# Custom")

        ContentProcessorFactory.register_processor("custom", CustomProcessor)
        # Note: The factory now returns ModernProcessor for all types
        processor = ContentProcessorFactory.get_processor("custom")
        assert isinstance(processor, ModernProcessor)


class TestLegacyCompatibility:
    """Test backward compatibility with legacy processors."""

    @patch("app.utils.content_processors.get_storage_service")
    def test_text_processor_legacy_compatibility(self, mock_storage_service):
        """Test legacy TextProcessor still works."""
        from app.utils.content_processors import TextProcessor

        # Mock storage service
        mock_storage = Mock()
        mock_storage_service.return_value = mock_storage

        processor = TextProcessor()
        mock_session = Mock(spec=Session)

        content_item = ContentItem(
            id=uuid.uuid4(),
            user_id=uuid.uuid4(),
            type="text",
            title="Legacy Test",
            content_text="Legacy test content.",
            processing_status="pending",
        )

        result = processor.process_content(content_item, mock_session)

        # Should work through the modern processor
        assert hasattr(result, "success")

    @patch("app.utils.content_processors.get_storage_service")
    def test_url_processor_legacy_compatibility(self, mock_storage_service):
        """Test legacy URLProcessor still works."""
        from app.utils.content_processors import URLProcessor

        # Mock storage service
        mock_storage = Mock()
        mock_storage_service.return_value = mock_storage

        processor = URLProcessor()
        mock_session = Mock(spec=Session)

        content_item = ContentItem(
            id=uuid.uuid4(),
            user_id=uuid.uuid4(),
            type="url",
            source_uri="https://example.com",
            processing_status="pending",
        )

        result = processor.process_content(content_item, mock_session)

        # Should work through the modern processor
        assert hasattr(result, "success")


class TestProcessingResult:
    """Test the ProcessingResult data class."""

    def test_processing_result_success(self):
        """Test ProcessingResult for successful processing."""
        result = ProcessingResult(
            success=True,
            markdown_content="# Success",
            metadata={"words": 1},
            assets_created=["path/to/file.md"],
        )

        assert result.success is True
        assert result.markdown_content == "# Success"
        assert result.metadata == {"words": 1}
        assert result.error_message is None
        assert result.assets_created == ["path/to/file.md"]

    def test_processing_result_failure(self):
        """Test ProcessingResult for failed processing."""
        result = ProcessingResult(success=False, error_message="Processing failed")

        assert result.success is False
        assert result.error_message == "Processing failed"
        assert result.markdown_content is None
        assert result.metadata is None
        assert result.assets_created is None


# Integration test for the complete processing workflow
class TestContentProcessingWorkflow:
    """Test the complete content processing workflow."""

    @patch("app.utils.content_processors.get_storage_service")
    def test_complete_text_processing_workflow(self, mock_storage_service):
        """Test complete workflow from content creation to Markdown conversion."""
        # Mock storage service
        mock_storage = Mock()
        mock_storage_service.return_value = mock_storage

        mock_session = Mock(spec=Session)

        # Create content item
        content_item = ContentItem(
            id=uuid.uuid4(),
            user_id=uuid.uuid4(),
            type="text",
            title="Integration Test",
            content_text="# Original Heading\n\nThis is test content for integration testing.",
            processing_status="pending",
        )

        # Get processor from factory and ensure it has working processors
        processor = ContentProcessorFactory.get_processor("text")

        # Mock the pipeline to have a working processor
        mock_markitdown_processor = Mock(spec=MarkItDownProcessor)
        mock_markitdown_processor.can_handle.return_value = True
        mock_markitdown_processor.process.return_value = ProcessingResult(
            success=True,
            markdown_content="# Original Heading\n\nThis is test content for integration testing.",
            metadata={"processor": "markitdown", "test": True},
        )
        mock_markitdown_processor.__class__.__name__ = "MarkItDownProcessor"

        # Replace the pipeline steps with our mock
        processor.pipeline.steps = [mock_markitdown_processor]

        # Process content
        result = processor.process_content(content_item, mock_session)

        # Verify workflow
        assert hasattr(result, "success")
        assert isinstance(result, ProcessingResult)
        # For text content, MarkItDown processor should handle it successfully
        assert result.success is True
        assert result.markdown_content is not None
        assert "Original Heading" in result.markdown_content
        assert "integration testing" in result.markdown_content


class TestJinaProcessor:
    """Test the Jina processor functionality."""

    def test_jina_processor_can_handle_url_with_api_key(self):
        """Test JinaProcessor can handle URL when API key is configured."""
        # Mock settings to have API key
        with patch("app.utils.content_processors.settings") as mock_settings:
            mock_settings.JINA_API_KEY = "test_api_key"

            processor = JinaProcessor()

            # Test supported type with API key
            assert processor.can_handle("url")

            # Test unsupported types
            assert not processor.can_handle("text")
            assert not processor.can_handle("pdf")

    def test_jina_processor_cannot_handle_without_api_key(self):
        """Test JinaProcessor cannot handle URL when API key is not configured."""
        # Mock settings to have no API key
        with patch("app.utils.content_processors.settings") as mock_settings:
            mock_settings.JINA_API_KEY = None

            processor = JinaProcessor()

            # Should not handle any type without API key
            assert not processor.can_handle("url")
            assert not processor.can_handle("text")

    @patch("app.utils.content_processors.requests.get")
    @patch("app.utils.content_processors.get_storage_service")
    def test_jina_processor_url_processing_success(
        self, mock_storage_service, mock_requests_get
    ):
        """Test JinaProcessor successfully processes URL content."""
        # Mock settings
        with patch("app.utils.content_processors.settings") as mock_settings:
            mock_settings.JINA_API_KEY = "test_api_key"
            mock_settings.R2_BUCKET = "test-bucket"

            # Mock storage service
            mock_storage = Mock()
            mock_storage_service.return_value = mock_storage

            # Mock successful Jina API response
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.text = (
                "# Test Article\n\n"
                "This is a comprehensive test article from Jina AI that contains enough content to pass quality checks. "
                "It demonstrates how web scraping can extract meaningful content from various sources. "
                "The article covers multiple topics and provides detailed explanations.\n\n"
                "## Key Features\n\n"
                "- Content extraction from web pages\n"
                "- Quality assessment algorithms\n"
                "- Markdown conversion capabilities\n\n"
                "For more information, visit [our documentation](https://example.com/docs).\n\n"
                "This article contains sufficient content to meet the minimum quality requirements."
            )
            mock_response.raise_for_status.return_value = None
            mock_requests_get.return_value = mock_response

            processor = JinaProcessor()
            mock_session = Mock(spec=Session)

            content_item = ContentItem(
                id=uuid.uuid4(),
                user_id=uuid.uuid4(),
                type="url",
                source_uri="https://example.com",
                title="Test URL",
                processing_status="pending",
            )

            context = ProcessingContext(
                content_item=content_item,
                session=mock_session,
                user_id=content_item.user_id,
                storage_service=mock_storage,
            )

            result = ProcessingResult(success=False)
            result = processor.process(context, result)

            # Verify success
            assert result.success is True
            assert result.markdown_content is not None
            assert "# Test Article" in result.markdown_content
            assert result.metadata is not None
            assert result.metadata["processor"] == "jina"
            assert result.metadata["content_type"] == "url"
            assert result.metadata["selectors_removed"] is True

            # Verify Jina API was called correctly with GET request
            mock_requests_get.assert_called_once()
            call_args = mock_requests_get.call_args
            assert call_args[0][0] == "https://r.jina.ai/https://example.com"
            assert "Bearer test_api_key" in call_args[1]["headers"]["Authorization"]
            assert "X-Remove-Selector" in call_args[1]["headers"]
            # Verify X-Remove-Selector contains key selectors
            remove_selector = call_args[1]["headers"]["X-Remove-Selector"]
            assert "header" in remove_selector
            assert "nav" in remove_selector
            assert "footer" in remove_selector
            assert ".sidebar" in remove_selector

    @patch("app.utils.content_processors.requests.get")
    def test_jina_processor_api_failure(self, mock_requests_get):
        """Test JinaProcessor handles API failures gracefully."""
        # Mock settings
        with patch("app.utils.content_processors.settings") as mock_settings:
            mock_settings.JINA_API_KEY = "test_api_key"

            # Mock failed Jina API response
            mock_response = Mock()
            mock_response.status_code = 401
            mock_response.raise_for_status.side_effect = requests.exceptions.HTTPError(
                "401 Unauthorized"
            )
            mock_requests_get.return_value = mock_response

            processor = JinaProcessor()
            mock_session = Mock(spec=Session)
            mock_storage = Mock()

            content_item = ContentItem(
                id=uuid.uuid4(),
                user_id=uuid.uuid4(),
                type="url",
                source_uri="https://example.com",
                processing_status="pending",
            )

            context = ProcessingContext(
                content_item=content_item,
                session=mock_session,
                user_id=content_item.user_id,
                storage_service=mock_storage,
            )

            result = ProcessingResult(success=False)
            result = processor.process(context, result)

            # Verify failure handling
            assert result.success is False
            assert result.error_message is not None
            assert "Jina API 认证失败" in result.error_message

    def test_jina_processor_no_api_key_error(self):
        """Test JinaProcessor returns error when no API key is configured."""
        # Mock settings to have no API key
        with patch("app.utils.content_processors.settings") as mock_settings:
            mock_settings.JINA_API_KEY = None

            processor = JinaProcessor()
            mock_session = Mock(spec=Session)
            mock_storage = Mock()

            content_item = ContentItem(
                id=uuid.uuid4(),
                user_id=uuid.uuid4(),
                type="url",
                source_uri="https://example.com",
                processing_status="pending",
            )

            context = ProcessingContext(
                content_item=content_item,
                session=mock_session,
                user_id=content_item.user_id,
                storage_service=mock_storage,
            )

            result = ProcessingResult(success=False)
            result = processor.process(context, result)

            # Verify error handling
            assert result.success is False
            assert result.error_message is not None
            assert "Jina API key not configured" in result.error_message
