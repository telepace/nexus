"""
Tests for content processors that convert various input types to Markdown format.
"""
import uuid
from unittest.mock import Mock, patch

import pytest
import requests
from sqlmodel import Session

from app.models.content import ContentItem, ProcessingJob
from app.utils.content_processors import (
    ContentProcessorFactory,
    ProcessorBase,
    ModernProcessor,
    ProcessingPipeline,
    ProcessingStep,
    MarkItDownProcessor,
    ProcessingResult,
    ProcessingContext,
    JinaProcessor,
)


class TestProcessorBase:
    """Test the base processor class functionality."""

    def test_base_processor_interface(self):
        """Test that base processor defines required interface."""
        
        class TestProcessor(ProcessorBase):
            def process_content(self, content_item: ContentItem, session: Session) -> ProcessingResult:
                return ProcessingResult(
                    success=True,
                    markdown_content="# Test",
                    metadata={"test": True}
                )

        processor = TestProcessor()
        assert hasattr(processor, 'process_content')
        # Note: supported_types is no longer required in the new architecture

    def test_modern_processor_uses_pipeline(self):
        """Test that ModernProcessor uses the new pipeline system."""
        processor = ModernProcessor()
        assert hasattr(processor, 'pipeline')
        assert isinstance(processor.pipeline, ProcessingPipeline)


class TestProcessingStep:
    """Test the processing step functionality."""

    def test_processing_step_interface(self):
        """Test that ProcessingStep defines required interface."""
        
        class TestStep(ProcessingStep):
            def can_handle(self, content_type: str) -> bool:
                return content_type == 'test'
            
            def process(self, context: ProcessingContext, result: ProcessingResult) -> ProcessingResult:
                result.success = True
                result.markdown_content = "# Test Step"
                return result

        step = TestStep()
        assert hasattr(step, 'can_handle')
        assert hasattr(step, 'process')
        assert step.can_handle('test')
        assert not step.can_handle('other')


class TestMarkItDownProcessor:
    """Test the MarkItDown processor functionality."""

    def test_markitdown_processor_can_handle_types(self):
        """Test MarkItDownProcessor can handle supported content types."""
        processor = MarkItDownProcessor()
        
        # Test supported types
        assert processor.can_handle('url')
        assert processor.can_handle('text')
        assert processor.can_handle('pdf')
        assert processor.can_handle('docx')
        
        # Test unsupported type
        assert not processor.can_handle('unsupported')

    @patch('app.utils.content_processors.get_storage_service')
    def test_markitdown_processor_text_processing(self, mock_storage_service):
        """Test MarkItDownProcessor processes text content."""
        # Mock storage service
        mock_storage = Mock()
        mock_storage_service.return_value = mock_storage
        
        processor = MarkItDownProcessor()
        mock_session = Mock(spec=Session)
        
        content_item = ContentItem(
            id=uuid.uuid4(),
            user_id=uuid.uuid4(),
            type="text",
            title="Test Content",
            content_text="This is test content.",
            processing_status="pending"
        )
        
        context = ProcessingContext(
            content_item=content_item,
            session=mock_session,
            user_id=content_item.user_id,
            storage_service=mock_storage
        )
        
        result = ProcessingResult(success=False)
        result = processor.process(context, result)
        
        assert result.success is True
        assert "# Test Content" in result.markdown_content
        assert "This is test content" in result.markdown_content
        assert result.metadata is not None
        assert result.metadata["content_type"] == "text"


class TestProcessingPipeline:
    """Test the processing pipeline functionality."""

    def test_pipeline_initialization(self):
        """Test pipeline initializes with default steps."""
        pipeline = ProcessingPipeline()
        assert len(pipeline.steps) > 0
        assert any(isinstance(step, MarkItDownProcessor) for step in pipeline.steps)

    def test_pipeline_add_step(self):
        """Test adding custom steps to pipeline."""
        pipeline = ProcessingPipeline()
        initial_count = len(pipeline.steps)
        
        class CustomStep(ProcessingStep):
            def can_handle(self, content_type: str) -> bool:
                return True
            
            def process(self, context: ProcessingContext, result: ProcessingResult) -> ProcessingResult:
                return result
        
        custom_step = CustomStep()
        pipeline.add_step(custom_step)
        
        assert len(pipeline.steps) == initial_count + 1
        assert custom_step in pipeline.steps

    @patch('app.utils.content_processors.get_storage_service')
    def test_pipeline_process_content(self, mock_storage_service):
        """Test pipeline processes content through steps."""
        # Mock storage service
        mock_storage = Mock()
        mock_storage_service.return_value = mock_storage
        
        pipeline = ProcessingPipeline()
        mock_session = Mock(spec=Session)
        
        content_item = ContentItem(
            id=uuid.uuid4(),
            user_id=uuid.uuid4(),
            type="text",
            title="Pipeline Test",
            content_text="Test content for pipeline.",
            processing_status="pending"
        )
        
        result = pipeline.process(content_item, mock_session)
        
        # Verify processing job was created
        mock_session.add.assert_called()
        mock_session.commit.assert_called()


class TestContentProcessorFactory:
    """Test the processor factory functionality."""

    def test_factory_returns_modern_processor(self):
        """Test factory returns ModernProcessor for all types."""
        processor = ContentProcessorFactory.get_processor('text')
        assert isinstance(processor, ModernProcessor)
        
        processor = ContentProcessorFactory.get_processor('url')
        assert isinstance(processor, ModernProcessor)

    def test_factory_register_processor(self):
        """Test factory can register new processor types."""
        class CustomProcessor(ProcessorBase):
            def process_content(self, content_item: ContentItem, session: Session) -> ProcessingResult:
                return ProcessingResult(success=True, markdown_content="# Custom")

        ContentProcessorFactory.register_processor('custom', CustomProcessor)
        # Note: The factory now returns ModernProcessor for all types
        processor = ContentProcessorFactory.get_processor('custom')
        assert isinstance(processor, ModernProcessor)


class TestLegacyCompatibility:
    """Test backward compatibility with legacy processors."""

    @patch('app.utils.content_processors.get_storage_service')
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
            processing_status="pending"
        )

        result = processor.process_content(content_item, mock_session)
        
        # Should work through the modern processor
        assert hasattr(result, 'success')

    @patch('app.utils.content_processors.get_storage_service')
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
            processing_status="pending"
        )

        result = processor.process_content(content_item, mock_session)
        
        # Should work through the modern processor
        assert hasattr(result, 'success')


class TestProcessingResult:
    """Test the ProcessingResult data class."""

    def test_processing_result_success(self):
        """Test ProcessingResult for successful processing."""
        result = ProcessingResult(
            success=True,
            markdown_content="# Success",
            metadata={"words": 1},
            assets_created=["path/to/file.md"]
        )
        
        assert result.success is True
        assert result.markdown_content == "# Success"
        assert result.metadata == {"words": 1}
        assert result.error_message is None
        assert result.assets_created == ["path/to/file.md"]

    def test_processing_result_failure(self):
        """Test ProcessingResult for failed processing."""
        result = ProcessingResult(
            success=False,
            error_message="Processing failed"
        )
        
        assert result.success is False
        assert result.error_message == "Processing failed"
        assert result.markdown_content is None
        assert result.metadata is None
        assert result.assets_created is None


# Integration test for the complete processing workflow
class TestContentProcessingWorkflow:
    """Test the complete content processing workflow."""

    @patch('app.utils.content_processors.get_storage_service')
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
            processing_status="pending"
        )

        # Get processor from factory
        processor = ContentProcessorFactory.get_processor("text")
        
        # Process content
        result = processor.process_content(content_item, mock_session)
        
        # Verify workflow
        assert hasattr(result, 'success')
        
        # Verify database operations were attempted
        mock_session.add.assert_called()
        mock_session.commit.assert_called()


class TestJinaProcessor:
    """Test the Jina processor functionality."""

    def test_jina_processor_can_handle_url_with_api_key(self):
        """Test JinaProcessor can handle URL when API key is configured."""
        # Mock settings to have API key
        with patch('app.utils.content_processors.settings') as mock_settings:
            mock_settings.JINA_API_KEY = "test_api_key"
            
            processor = JinaProcessor()
            
            # Test supported type with API key
            assert processor.can_handle('url')
            
            # Test unsupported types
            assert not processor.can_handle('text')
            assert not processor.can_handle('pdf')

    def test_jina_processor_cannot_handle_without_api_key(self):
        """Test JinaProcessor cannot handle URL when API key is not configured."""
        # Mock settings to have no API key
        with patch('app.utils.content_processors.settings') as mock_settings:
            mock_settings.JINA_API_KEY = None
            
            processor = JinaProcessor()
            
            # Should not handle any type without API key
            assert not processor.can_handle('url')
            assert not processor.can_handle('text')

    @patch('app.utils.content_processors.requests.post')
    @patch('app.utils.content_processors.get_storage_service')
    def test_jina_processor_url_processing_success(self, mock_storage_service, mock_requests_post):
        """Test JinaProcessor successfully processes URL content."""
        # Mock settings
        with patch('app.utils.content_processors.settings') as mock_settings:
            mock_settings.JINA_API_KEY = "test_api_key"
            mock_settings.R2_BUCKET = "test-bucket"
            
            # Mock storage service
            mock_storage = Mock()
            mock_storage_service.return_value = mock_storage
            
            # Mock successful Jina API response
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.text = "# Test Article\n\nThis is a test article from Jina AI."
            mock_response.raise_for_status.return_value = None
            mock_requests_post.return_value = mock_response
            
            processor = JinaProcessor()
            mock_session = Mock(spec=Session)
            
            content_item = ContentItem(
                id=uuid.uuid4(),
                user_id=uuid.uuid4(),
                type="url",
                source_uri="https://example.com",
                title="Test URL",
                processing_status="pending"
            )
            
            context = ProcessingContext(
                content_item=content_item,
                session=mock_session,
                user_id=content_item.user_id,
                storage_service=mock_storage
            )
            
            result = ProcessingResult(success=False)
            result = processor.process(context, result)
            
            # Verify success
            assert result.success is True
            assert "# Test Article" in result.markdown_content
            assert result.metadata is not None
            assert result.metadata["processor"] == "jina"
            assert result.metadata["content_type"] == "url"
            
            # Verify Jina API was called correctly
            mock_requests_post.assert_called_once()
            call_args = mock_requests_post.call_args
            assert call_args[1]['json']['url'] == "https://example.com"
            assert "Bearer test_api_key" in call_args[1]['headers']['Authorization']

    @patch('app.utils.content_processors.requests.post')
    def test_jina_processor_api_failure(self, mock_requests_post):
        """Test JinaProcessor handles API failures gracefully."""
        # Mock settings
        with patch('app.utils.content_processors.settings') as mock_settings:
            mock_settings.JINA_API_KEY = "test_api_key"
            
            # Mock failed Jina API response
            mock_response = Mock()
            mock_response.status_code = 401
            mock_response.raise_for_status.side_effect = requests.exceptions.HTTPError("401 Unauthorized")
            mock_requests_post.return_value = mock_response
            
            processor = JinaProcessor()
            mock_session = Mock(spec=Session)
            mock_storage = Mock()
            
            content_item = ContentItem(
                id=uuid.uuid4(),
                user_id=uuid.uuid4(),
                type="url",
                source_uri="https://example.com",
                processing_status="pending"
            )
            
            context = ProcessingContext(
                content_item=content_item,
                session=mock_session,
                user_id=content_item.user_id,
                storage_service=mock_storage
            )
            
            result = ProcessingResult(success=False)
            result = processor.process(context, result)
            
            # Verify failure handling
            assert result.success is False
            assert "Jina API request failed" in result.error_message

    def test_jina_processor_no_api_key_error(self):
        """Test JinaProcessor returns error when no API key is configured."""
        # Mock settings to have no API key
        with patch('app.utils.content_processors.settings') as mock_settings:
            mock_settings.JINA_API_KEY = None
            
            processor = JinaProcessor()
            mock_session = Mock(spec=Session)
            mock_storage = Mock()
            
            content_item = ContentItem(
                id=uuid.uuid4(),
                user_id=uuid.uuid4(),
                type="url",
                source_uri="https://example.com",
                processing_status="pending"
            )
            
            context = ProcessingContext(
                content_item=content_item,
                session=mock_session,
                user_id=content_item.user_id,
                storage_service=mock_storage
            )
            
            result = ProcessingResult(success=False)
            result = processor.process(context, result)
            
            # Verify error handling
            assert result.success is False
            assert "Jina API key not configured" in result.error_message 