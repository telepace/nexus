"""
Content chunking utilities for efficient storage and rendering.

This module provides algorithms to split markdown content into manageable chunks
while preserving the structure and readability of the content.
"""

import re
import uuid
from dataclasses import dataclass
from typing import Any

from app.models.content import ContentChunk


@dataclass
class ChunkInfo:
    """Information about a content chunk."""

    content: str
    chunk_type: str
    index: int
    word_count: int
    char_count: int
    meta_info: dict[str, Any] | None = None


class ContentChunker:
    """Handles the chunking of markdown content into manageable segments."""

    def __init__(self, max_chunk_size: int = 3000, min_chunk_size: int = 100):
        """
        Initialize the content chunker.

        Args:
            max_chunk_size: Maximum characters per chunk
            min_chunk_size: Minimum characters per chunk
        """
        self.max_chunk_size = max_chunk_size
        self.min_chunk_size = min_chunk_size

    def chunk_markdown_content(self, content: str) -> list[ChunkInfo]:
        """
        Split markdown content into chunks based on structure and size.

        Args:
            content: The markdown content to chunk

        Returns:
            List of ChunkInfo objects
        """
        if not content or not content.strip():
            return []

        chunks = []
        current_index = 0

        # First, try to split by headings
        heading_chunks = self._split_by_headings(content)

        for heading_chunk in heading_chunks:
            # If a heading chunk is too large, split it further
            if len(heading_chunk) > self.max_chunk_size:
                sub_chunks = self._split_large_chunk(heading_chunk)
                for sub_chunk in sub_chunks:
                    chunk_info = self._create_chunk_info(
                        sub_chunk, current_index, self._detect_chunk_type(sub_chunk)
                    )
                    chunks.append(chunk_info)
                    current_index += 1
            else:
                chunk_info = self._create_chunk_info(
                    heading_chunk, current_index, self._detect_chunk_type(heading_chunk)
                )
                chunks.append(chunk_info)
                current_index += 1

        return chunks

    def _split_by_headings(self, content: str) -> list[str]:
        """Split content by markdown headings while preserving structure."""
        lines = content.split("\n")
        chunks = []
        current_chunk: list[str] = []
        in_code_block = False
        in_table = False
        code_block_delimiter = None

        for i, line in enumerate(lines):
            # Track code block state
            if line.strip().startswith("```"):
                if not in_code_block:
                    in_code_block = True
                    code_block_delimiter = line.strip()
                elif line.strip() == code_block_delimiter or line.strip() == "```":
                    in_code_block = False
                    code_block_delimiter = None

            # Track table state (simple heuristic)
            if "|" in line and not in_code_block:
                in_table = True
            elif in_table and line.strip() == "":
                # Empty line might end table
                next_line_has_table = False
                if i + 1 < len(lines) and "|" in lines[i + 1]:
                    next_line_has_table = True
                if not next_line_has_table:
                    in_table = False

            # Check for heading
            is_heading = re.match(r"^#{1,6}\s+", line) and not in_code_block

            # Start new chunk on heading, but only if we're not in a special block
            if is_heading and current_chunk and not in_code_block and not in_table:
                chunk_content = "\n".join(current_chunk).strip()
                if chunk_content:
                    chunks.append(chunk_content)
                current_chunk = [line]
            else:
                current_chunk.append(line)

        # Add the last chunk
        if current_chunk:
            chunk_content = "\n".join(current_chunk).strip()
            if chunk_content:
                chunks.append(chunk_content)

        return chunks

    def _split_large_chunk(self, content: str) -> list[str]:
        """Split a large chunk into smaller pieces while preserving markdown structure."""
        # Don't split if it's a code block or table
        if self._is_special_block(content):
            return [content]

        # First try to split by sub-headings within the chunk
        sub_chunks = self._split_by_subheadings(content)
        if len(sub_chunks) > 1:
            final_chunks = []
            for sub_chunk in sub_chunks:
                if len(sub_chunk) > self.max_chunk_size:
                    final_chunks.extend(self._split_by_paragraphs_safe(sub_chunk))
                else:
                    final_chunks.append(sub_chunk)
            return final_chunks

        # If no sub-headings, split by paragraphs safely
        return self._split_by_paragraphs_safe(content)

    def _is_special_block(self, content: str) -> bool:
        """Check if content is a special block that shouldn't be split."""
        content_stripped = content.strip()

        # Code block
        if content_stripped.startswith("```") and content_stripped.endswith("```"):
            return True

        # Table (simple check)
        lines = content_stripped.split("\n")
        table_lines = [line for line in lines if "|" in line]
        if len(table_lines) > len(lines) * 0.5:  # More than half lines are table
            return True

        return False

    def _split_by_subheadings(self, content: str) -> list[str]:
        """Split content by sub-headings (lower level headings)."""
        lines = content.split("\n")
        chunks = []
        current_chunk: list[str] = []
        first_heading_level = None

        for line in lines:
            heading_match = re.match(r"^(#{1,6})\s+", line)

            if heading_match:
                heading_level = len(heading_match.group(1))

                if first_heading_level is None:
                    first_heading_level = heading_level
                    current_chunk.append(line)
                elif heading_level <= first_heading_level and current_chunk:
                    # Same or higher level heading, start new chunk
                    chunks.append("\n".join(current_chunk).strip())
                    current_chunk = [line]
                else:
                    # Lower level heading, continue current chunk
                    current_chunk.append(line)
            else:
                current_chunk.append(line)

        # Add the last chunk
        if current_chunk:
            chunks.append("\n".join(current_chunk).strip())

        # If we only got one chunk, return empty list to indicate no splitting
        return chunks if len(chunks) > 1 else []

    def _split_by_paragraphs_safe(self, content: str) -> list[str]:
        """Split content by paragraphs while avoiding breaking special structures."""
        paragraphs = content.split("\n\n")
        chunks = []
        current_chunk: list[str] = []
        current_size = 0
        in_special_block = False

        for paragraph in paragraphs:
            # Check if this paragraph starts or ends a special block
            if "```" in paragraph:
                in_special_block = not in_special_block

            paragraph_size = len(paragraph)

            # If we're in a special block, don't split
            if in_special_block:
                current_chunk.append(paragraph)
                current_size += paragraph_size + 2
            elif current_size + paragraph_size > self.max_chunk_size and current_chunk:
                # Save current chunk and start new one
                chunks.append("\n\n".join(current_chunk))
                current_chunk = [paragraph]
                current_size = paragraph_size
            else:
                current_chunk.append(paragraph)
                current_size += paragraph_size + 2  # +2 for the \n\n

        # Add the last chunk
        if current_chunk:
            chunks.append("\n\n".join(current_chunk))

        return chunks

    def _detect_chunk_type(self, content: str) -> str:
        """Detect the type of content chunk."""
        content_stripped = content.strip()

        # Check for headings
        if re.match(r"^#{1,6}\s+", content_stripped):
            return "heading"

        # Check for code blocks
        if content_stripped.startswith("```") or "```" in content_stripped:
            return "code_block"

        # Check for tables
        if "|" in content_stripped and re.search(r"\|.*\|", content_stripped):
            return "table"

        # Check for lists
        if re.match(r"^[\s]*[-*+]\s+", content_stripped, re.MULTILINE) or re.match(
            r"^[\s]*\d+\.\s+", content_stripped, re.MULTILINE
        ):
            return "list"

        # Default to paragraph
        return "paragraph"

    def _create_chunk_info(
        self, content: str, index: int, chunk_type: str
    ) -> ChunkInfo:
        """Create a ChunkInfo object from content."""
        word_count = len(content.split())
        char_count = len(content)

        meta_info = {
            "has_code": "```" in content,
            "has_links": "[" in content and "](" in content,
            "has_images": "![" in content,
            "has_tables": "|" in content and re.search(r"\|.*\|", content) is not None,
        }

        return ChunkInfo(
            content=content,
            chunk_type=chunk_type,
            index=index,
            word_count=word_count,
            char_count=char_count,
            meta_info=meta_info,
        )

    def create_content_chunks(
        self, content_item_id: uuid.UUID, content: str
    ) -> list[ContentChunk]:
        """
        Create ContentChunk database objects from markdown content.

        Args:
            content_item_id: The ID of the parent content item
            content: The markdown content to chunk

        Returns:
            List of ContentChunk objects ready for database insertion
        """
        chunk_infos = self.chunk_markdown_content(content)

        content_chunks = []
        for chunk_info in chunk_infos:
            content_chunk = ContentChunk(
                content_item_id=content_item_id,
                chunk_index=chunk_info.index,
                chunk_content=chunk_info.content,
                chunk_type=chunk_info.chunk_type,
                word_count=chunk_info.word_count,
                char_count=chunk_info.char_count,
                meta_info=chunk_info.meta_info,
            )
            content_chunks.append(content_chunk)

        return content_chunks


def chunk_content_for_item(
    content_item_id: uuid.UUID, content: str, max_chunk_size: int = 3000
) -> list[ContentChunk]:
    """
    Convenience function to chunk content for a content item.

    Args:
        content_item_id: The ID of the content item
        content: The markdown content to chunk
        max_chunk_size: Maximum size per chunk

    Returns:
        List of ContentChunk objects
    """
    chunker = ContentChunker(max_chunk_size=max_chunk_size)
    return chunker.create_content_chunks(content_item_id, content)
