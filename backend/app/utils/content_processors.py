"""
Enhanced content processors using Microsoft MarkItDown for various content types.

This module provides a modern, extensible content processing system that:
1. Uses Microsoft MarkItDown for robust file conversion
2. Implements R2 cloud storage with organized bucket structure
3. Supports processing pipelines for future LLM integration
4. Provides extensibility for tools like jina.ai, TAVILY, etc.
"""

import json
import os
import tempfile
import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from io import BytesIO
from typing import Any

import requests
from markitdown import MarkItDown
from sqlmodel import Session

from app.core.config import settings
from app.models.content import ContentAsset, ContentItem, ProcessingJob
from app.utils.content_chunker import chunk_content_for_item
from app.utils.storage import get_storage_service


@dataclass
class ProcessingResult:
    """Result of content processing operation."""

    success: bool
    markdown_content: str | None = None
    metadata: dict[str, Any] | None = None
    error_message: str | None = None
    assets_created: list[str] | None = None  # List of R2 paths for created assets


@dataclass
class ProcessingContext:
    """Context for content processing operations."""

    content_item: ContentItem
    session: Session
    user_id: uuid.UUID
    storage_service: Any
    temp_dir: str | None = None


class ProcessingStep(ABC):
    """Abstract base class for processing steps in the pipeline."""

    @abstractmethod
    def process(
        self, context: ProcessingContext, result: ProcessingResult
    ) -> ProcessingResult:
        """Process the content and return updated result."""
        pass

    @abstractmethod
    def can_handle(self, content_type: str) -> bool:
        """Check if this step can handle the given content type."""
        pass


class JinaProcessor(ProcessingStep):
    """Processor using Jina AI for URL content extraction."""

    def __init__(self):
        """Initialize Jina processor."""
        self.api_key = settings.JINA_API_KEY
        self.api_url = "https://r.jina.ai/"

    def can_handle(self, content_type: str) -> bool:
        """Jina can handle URL content when API key is available."""
        return content_type == "url" and bool(self.api_key)

    def process(
        self, context: ProcessingContext, result: ProcessingResult
    ) -> ProcessingResult:
        """Process URL content using Jina AI."""
        if not self.api_key:
            result.success = False
            result.error_message = "Jina API key not configured"
            return result

        content_item = context.content_item

        try:
            # Prepare request to Jina AI
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            }

            payload = {"url": content_item.source_uri}

            # Make request to Jina AI
            response = requests.post(
                self.api_url,
                headers=headers,
                json=payload,
                timeout=60,  # Jina might take longer than regular requests
            )
            response.raise_for_status()

            # Jina returns markdown content directly
            # 确保响应编码正确（Jina API通常返回UTF-8，但为了保险起见）
            if response.encoding is None:
                response.encoding = "utf-8"
            markdown_content = response.text

            # Extract title from markdown if not set
            if not content_item.title:
                lines = markdown_content.split("\n")
                for line in lines:
                    if line.startswith("# "):
                        content_item.title = line[2:].strip()
                        break

                # Fallback to URL hostname if no title found
                if not content_item.title:
                    from urllib.parse import urlparse

                    parsed_url = urlparse(content_item.source_uri)
                    hostname = parsed_url.hostname
                    if hostname:
                        # Ensure hostname is a string, not bytes
                        if isinstance(hostname, bytes):
                            hostname = hostname.decode("utf-8", errors="ignore")
                        content_item.title = f"网页内容 - {hostname}"
                    else:
                        content_item.title = "网页内容 - 未知网站"

            result.success = True
            result.markdown_content = markdown_content
            result.metadata = {
                "source_url": content_item.source_uri,
                "processed_at": datetime.utcnow().isoformat(),
                "processor": "jina",
                "content_type": "url",
            }

            # Store processed markdown to R2
            markdown_path = self._store_markdown_to_r2(
                context, result.markdown_content, result.metadata
            )
            result.assets_created = [markdown_path]

        except requests.exceptions.RequestException as e:
            result.success = False
            result.error_message = f"Jina API request failed: {str(e)}"
        except Exception as e:
            result.success = False
            result.error_message = f"Jina processing failed: {str(e)}"

        return result

    def _store_markdown_to_r2(
        self,
        context: ProcessingContext,
        markdown_content: str,
        metadata: dict[str, Any],
    ) -> str:
        """Store markdown content to R2 following the organized bucket structure."""
        content_item = context.content_item
        storage_service = context.storage_service

        # Define R2 path based on content type
        r2_path = f"processed/markdown/{content_item.id}.md"

        try:
            # Upload markdown content
            markdown_bytes = markdown_content.encode("utf-8")
            print(f"🔄 正在上传Markdown文件到R2: {r2_path}")
            storage_service.upload_file(
                file_data=BytesIO(markdown_bytes), file_path=r2_path
            )
            print(f"✅ Markdown文件上传成功: {r2_path}")

            # Store metadata as JSON
            metadata_path = f"processed/metadata/{content_item.id}.json"
            metadata_bytes = json.dumps(metadata, indent=2).encode("utf-8")
            print(f"🔄 正在上传元数据文件到R2: {metadata_path}")
            storage_service.upload_file(
                file_data=BytesIO(metadata_bytes), file_path=metadata_path
            )
            print(f"✅ 元数据文件上传成功: {metadata_path}")

            # Create ContentAsset records
            markdown_asset = ContentAsset(
                content_item_id=content_item.id,
                type="processed_text",
                file_path=r2_path,
                s3_bucket=settings.R2_BUCKET,
                s3_key=r2_path,
                mime_type="text/markdown",
                size_bytes=len(markdown_bytes),
                meta_info=json.dumps({"asset_type": "markdown", "processor": "jina"}),
            )

            metadata_asset = ContentAsset(
                content_item_id=content_item.id,
                type="metadata_json",
                file_path=metadata_path,
                s3_bucket=settings.R2_BUCKET,
                s3_key=metadata_path,
                mime_type="application/json",
                size_bytes=len(metadata_bytes),
                meta_info=json.dumps({"asset_type": "metadata", "processor": "jina"}),
            )

            context.session.add(markdown_asset)
            context.session.add(metadata_asset)

            # Store content chunks in database for efficient rendering
            print("🔄 正在创建内容分段...")
            content_chunks = chunk_content_for_item(content_item.id, markdown_content)
            print(f"✅ 创建了 {len(content_chunks)} 个内容分段")

            # Add chunks to session
            for chunk in content_chunks:
                context.session.add(chunk)

            # Store the full markdown content in content_text for backward compatibility
            content_item.content_text = markdown_content
            context.session.add(content_item)

            context.session.commit()
            print("✅ ContentAsset记录和内容分段创建成功")

        except Exception as e:
            print(f"❌ R2存储失败: {str(e)}")
            import traceback

            traceback.print_exc()
            # 不抛出异常，让处理继续进行

        return r2_path


class MarkItDownProcessor(ProcessingStep):
    """Core processor using Microsoft MarkItDown for file conversion."""

    def __init__(self, llm_client: Any = None, llm_model: str = "gpt-4o") -> None:
        """Initialize with optional LLM client for image processing."""
        if llm_client:
            self.markitdown = MarkItDown(llm_client=llm_client, llm_model=llm_model)
        else:
            self.markitdown = MarkItDown()

    def can_handle(self, content_type: str) -> bool:
        """MarkItDown can handle most content types."""
        return content_type in [
            "url",
            "pdf",
            "docx",
            "text",
            "xlsx",
            "pptx",
            "image",
            "audio",
        ]

    def process(
        self, context: ProcessingContext, result: ProcessingResult
    ) -> ProcessingResult:
        """Process content using MarkItDown."""
        try:
            content_item = context.content_item

            if content_item.type == "url":
                return self._process_url(context, result)
            elif content_item.type == "text":
                return self._process_text(context, result)
            else:
                return self._process_file(context, result)

        except Exception as e:
            result.success = False
            result.error_message = f"MarkItDown processing failed: {str(e)}"
            return result

    def _process_url(
        self, context: ProcessingContext, result: ProcessingResult
    ) -> ProcessingResult:
        """Process URL content."""
        content_item = context.content_item

        try:
            # Use MarkItDown to process URL directly
            # For now, we'll fetch the content and process it
            if not content_item.source_uri:
                result.success = False
                result.error_message = "No source URI provided for URL processing"
                return result

            response = requests.get(content_item.source_uri, timeout=30)
            response.raise_for_status()

            # 改进的编码处理逻辑
            html_content = None
            try:
                # 首先尝试使用response.text（可能会有编码问题）
                if response.encoding and response.encoding.lower() not in [
                    "iso-8859-1",
                    "latin-1",
                ]:
                    # 如果有明确的编码且不是默认的latin-1，使用它
                    html_content = response.text
                else:
                    # 否则直接从字节内容解码UTF-8
                    html_content = response.content.decode("utf-8", errors="replace")

            except UnicodeDecodeError:
                # 如果UTF-8解码失败，尝试其他常见编码
                encodings_to_try = ["gbk", "gb2312", "big5", "utf-8"]
                for encoding in encodings_to_try:
                    try:
                        html_content = response.content.decode(encoding)
                        print(f"🔧 使用 {encoding} 编码成功解码网站内容")
                        break
                    except UnicodeDecodeError:
                        continue

                if html_content is None:
                    # 最后的备选方案：强制UTF-8解码并忽略错误
                    html_content = response.content.decode("utf-8", errors="ignore")
                    print("⚠️  使用UTF-8强制解码（忽略错误）")

            # Create temporary file for MarkItDown，明确指定UTF-8编码
            with tempfile.NamedTemporaryFile(
                mode="w", suffix=".html", delete=False, encoding="utf-8"
            ) as temp_file:
                temp_file.write(html_content)
                temp_path = temp_file.name

            try:
                # Process with MarkItDown
                markitdown_result = self.markitdown.convert(temp_path)

                # Extract title from URL if not set
                if not content_item.title and markitdown_result.title:
                    content_item.title = markitdown_result.title

                result.success = True
                result.markdown_content = markitdown_result.text_content
                result.metadata = {
                    "source_url": content_item.source_uri,
                    "processed_at": datetime.utcnow().isoformat(),
                    "processor": "markitdown",
                    "content_type": "url",
                }

                # Store processed markdown to R2
                markdown_path = self._store_markdown_to_r2(
                    context, result.markdown_content, result.metadata
                )
                result.assets_created = [markdown_path]

            finally:
                # Clean up temp file
                os.unlink(temp_path)

        except Exception as e:
            result.success = False
            result.error_message = f"URL processing failed: {str(e)}"

        return result

    def _process_text(
        self, context: ProcessingContext, result: ProcessingResult
    ) -> ProcessingResult:
        """Process plain text content."""
        content_item = context.content_item

        try:
            # For text content, we'll create a simple markdown structure
            markdown_content = self._create_text_markdown(content_item)

            result.success = True
            result.markdown_content = markdown_content
            result.metadata = {
                "processed_at": datetime.utcnow().isoformat(),
                "processor": "markitdown",
                "content_type": "text",
                "word_count": len(content_item.content_text.split())
                if content_item.content_text
                else 0,
            }

            # Store processed markdown to R2
            markdown_path = self._store_markdown_to_r2(
                context, result.markdown_content, result.metadata
            )
            result.assets_created = [markdown_path]

        except Exception as e:
            result.success = False
            result.error_message = f"Text processing failed: {str(e)}"

        return result

    def _process_file(
        self, context: ProcessingContext, result: ProcessingResult
    ) -> ProcessingResult:
        """Process uploaded file content."""
        # This would be implemented when we have file upload functionality
        # For now, return a placeholder
        result.success = False
        result.error_message = "File processing not yet implemented"
        return result

    def _create_text_markdown(self, content_item: ContentItem) -> str:
        """Create markdown from text content."""
        markdown_parts = []

        # Add title
        if content_item.title:
            markdown_parts.append(f"# {content_item.title}")
            markdown_parts.append("")

        # Add content
        if content_item.content_text:
            # Split into paragraphs and format
            paragraphs = content_item.content_text.split("\n\n")
            for paragraph in paragraphs:
                if paragraph.strip():
                    markdown_parts.append(paragraph.strip())
                    markdown_parts.append("")

        # Add metadata section
        markdown_parts.append("## Metadata")
        markdown_parts.append("")
        markdown_parts.append(f"- **Type:** {content_item.type}")
        markdown_parts.append(f"- **Created:** {content_item.created_at.isoformat()}")
        if content_item.source_uri:
            markdown_parts.append(f"- **Source:** {content_item.source_uri}")

        return "\n".join(markdown_parts)

    def _store_markdown_to_r2(
        self,
        context: ProcessingContext,
        markdown_content: str,
        metadata: dict[str, Any],
    ) -> str:
        """Store markdown content to R2 following the organized bucket structure."""
        content_item = context.content_item
        storage_service = context.storage_service

        # Define R2 path based on content type
        if content_item.type == "url":
            # For URLs, store in processed/markdown/
            r2_path = f"processed/markdown/{content_item.id}.md"
        else:
            # For other types, also store in processed/markdown/
            r2_path = f"processed/markdown/{content_item.id}.md"

        try:
            # Upload markdown content
            markdown_bytes = markdown_content.encode("utf-8")
            print(f"🔄 正在上传Markdown文件到R2: {r2_path}")
            storage_service.upload_file(
                file_data=BytesIO(markdown_bytes), file_path=r2_path
            )
            print(f"✅ Markdown文件上传成功: {r2_path}")

            # Store metadata as JSON
            metadata_path = f"processed/metadata/{content_item.id}.json"
            metadata_bytes = json.dumps(metadata, indent=2).encode("utf-8")
            print(f"🔄 正在上传元数据文件到R2: {metadata_path}")
            storage_service.upload_file(
                file_data=BytesIO(metadata_bytes), file_path=metadata_path
            )
            print(f"✅ 元数据文件上传成功: {metadata_path}")

            # Create ContentAsset records
            markdown_asset = ContentAsset(
                content_item_id=content_item.id,
                type="processed_text",
                file_path=r2_path,
                s3_bucket=settings.R2_BUCKET,
                s3_key=r2_path,
                mime_type="text/markdown",
                size_bytes=len(markdown_bytes),
                meta_info=json.dumps(
                    {"asset_type": "markdown", "processor": "markitdown"}
                ),
            )

            metadata_asset = ContentAsset(
                content_item_id=content_item.id,
                type="metadata_json",
                file_path=metadata_path,
                s3_bucket=settings.R2_BUCKET,
                s3_key=metadata_path,
                mime_type="application/json",
                size_bytes=len(metadata_bytes),
                meta_info=json.dumps(
                    {"asset_type": "metadata", "processor": "markitdown"}
                ),
            )

            context.session.add(markdown_asset)
            context.session.add(metadata_asset)

            # Store content chunks in database for efficient rendering
            print("🔄 正在创建内容分段...")
            content_chunks = chunk_content_for_item(content_item.id, markdown_content)
            print(f"✅ 创建了 {len(content_chunks)} 个内容分段")

            # Add chunks to session
            for chunk in content_chunks:
                context.session.add(chunk)

            # Store the full markdown content in content_text for backward compatibility
            content_item.content_text = markdown_content
            context.session.add(content_item)

            context.session.commit()
            print("✅ ContentAsset记录和内容分段创建成功")

        except Exception as e:
            print(f"❌ R2存储失败: {str(e)}")
            import traceback

            traceback.print_exc()
            # 不抛出异常，让处理继续进行

        return r2_path


class ProcessingPipeline:
    """Extensible processing pipeline for content processing."""

    def __init__(self):
        self.steps: list[ProcessingStep] = []
        self._register_default_steps()

    def _register_default_steps(self):
        """Register default processing steps."""
        # Add Jina processor first for URL processing (if API key is configured)
        if settings.JINA_API_KEY:
            self.add_step(JinaProcessor())

        # Add MarkItDown processor as fallback
        self.add_step(MarkItDownProcessor())

        # Future steps can be added here:
        # self.add_step(LLMScoringStep())
        # self.add_step(TAVILYStep())

    def add_step(self, step: ProcessingStep):
        """Add a processing step to the pipeline."""
        self.steps.append(step)

    def process(self, content_item: ContentItem, session: Session) -> ProcessingResult:
        """Process content through the pipeline."""
        # Create processing context
        storage_service = get_storage_service()
        context = ProcessingContext(
            content_item=content_item,
            session=session,
            user_id=content_item.user_id,
            storage_service=storage_service,
        )

        # Initialize result
        result = ProcessingResult(success=False)

        # Create processing job
        job = ProcessingJob(
            content_item_id=content_item.id,
            processor_name="processing_pipeline",
            status="in_progress",
            started_at=datetime.utcnow(),
        )
        session.add(job)
        session.commit()

        try:
            # Update content item status
            content_item.processing_status = "processing"
            session.add(content_item)
            session.commit()

            # Process through pipeline steps
            for step in self.steps:
                if step.can_handle(content_item.type):
                    result = step.process(context, result)
                    if result.success:
                        # Stop processing after first successful step
                        break
                    # If this step failed, continue to next step

            # Update content item with results
            if result.success:
                content_item.processing_status = "completed"
                content_item.content_text = result.markdown_content
                if result.metadata:
                    content_item.meta_info = json.dumps(result.metadata)

                job.status = "completed"
                job.result = json.dumps(
                    {
                        "success": True,
                        "assets_created": result.assets_created or [],
                        "metadata": result.metadata,
                    }
                )
            else:
                content_item.processing_status = "failed"
                content_item.error_message = result.error_message

                job.status = "failed"
                job.error_message = result.error_message

            job.completed_at = datetime.utcnow()
            session.add(content_item)
            session.add(job)
            session.commit()

        except Exception as e:
            # Handle unexpected errors
            content_item.processing_status = "failed"
            content_item.error_message = f"Pipeline error: {str(e)}"

            job.status = "failed"
            job.error_message = str(e)
            job.completed_at = datetime.utcnow()

            session.add(content_item)
            session.add(job)
            session.commit()

            result.success = False
            result.error_message = str(e)

        return result


# Legacy compatibility - maintain existing factory pattern
class ProcessorBase(ABC):
    """Legacy base class for backward compatibility."""

    @abstractmethod
    def process_content(
        self, content_item: ContentItem, session: Session
    ) -> ProcessingResult:
        """Process content and return result."""
        pass


class ModernProcessor(ProcessorBase):
    """Modern processor that uses the new pipeline system."""

    def __init__(self):
        self.pipeline = ProcessingPipeline()

    def process_content(
        self, content_item: ContentItem, session: Session
    ) -> ProcessingResult:
        """Process content using the modern pipeline."""
        return self.pipeline.process(content_item, session)


class ContentProcessorFactory:
    """Factory for creating content processors."""

    _processors: dict[str, type[ProcessorBase]] = {}
    _modern_processor = ModernProcessor()

    @classmethod
    def register_processor(
        cls, content_type: str, processor_class: type[ProcessorBase]
    ):
        """Register a processor for a content type."""
        cls._processors[content_type] = processor_class

    @classmethod
    def get_processor(cls, content_type: str) -> ProcessorBase:
        """Get processor for content type."""
        # Use modern processor for all types
        return cls._modern_processor


# Register default processors for backward compatibility
ContentProcessorFactory.register_processor("text", ModernProcessor)
ContentProcessorFactory.register_processor("url", ModernProcessor)
ContentProcessorFactory.register_processor("pdf", ModernProcessor)
ContentProcessorFactory.register_processor("docx", ModernProcessor)
ContentProcessorFactory.register_processor("xlsx", ModernProcessor)
ContentProcessorFactory.register_processor("pptx", ModernProcessor)
ContentProcessorFactory.register_processor("image", ModernProcessor)
ContentProcessorFactory.register_processor("audio", ModernProcessor)


# Legacy classes for backward compatibility
class TextProcessor(ProcessorBase):
    """Legacy text processor."""

    def __init__(self):
        self.modern_processor = ModernProcessor()

    def process_content(
        self, content_item: ContentItem, session: Session
    ) -> ProcessingResult:
        return self.modern_processor.process_content(content_item, session)


class URLProcessor(ProcessorBase):
    """Legacy URL processor."""

    def __init__(self):
        self.modern_processor = ModernProcessor()

    def process_content(
        self, content_item: ContentItem, session: Session
    ) -> ProcessingResult:
        return self.modern_processor.process_content(content_item, session)
