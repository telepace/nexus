"""
Tests for content chunks API optimization features.
Following TDD approach to define expected behavior before implementation.
"""

import uuid
import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.models.content import ContentItem, Segment
from app.tests.utils.utils import create_test_content_with_chunks


class TestContentChunksOptimization:
    """Test suite for optimized content chunks retrieval."""

    def test_get_all_chunks_at_once(
        self, client: TestClient, session: Session, normal_user_token_headers: dict
    ):
        """
        Test case: When all=true parameter is provided, 
        should return all chunks in a single request ignoring pagination.
        
        Expected behavior:
        - Single API call returns complete content
        - Response time < 2 seconds for content with 100+ chunks  
        - Chunks are ordered by segment_index
        - pagination.has_next = false
        """
        # Arrange: Create test content with many chunks (simulating long article)
        content_item = create_test_content_with_chunks(session, chunk_count=75)
        content_id = content_item.id

        # Act: Request all chunks at once
        response = client.get(
            f"/api/v1/content/{content_id}/chunks?all=true",
            headers=normal_user_token_headers,
        )

        # Assert
        assert response.status_code == 200
        data = response.json()
        
        # Should return all 75 chunks
        assert len(data["chunks"]) == 75
        assert data["pagination"]["total_chunks"] == 75
        assert data["pagination"]["has_next"] is False
        assert data["pagination"]["has_prev"] is False
        
        # Chunks should be properly ordered
        for i, chunk in enumerate(data["chunks"]):
            assert chunk["index"] == i
            assert "content" in chunk
            assert "id" in chunk

    def test_all_chunks_performance(
        self, client: TestClient, session: Session, normal_user_token_headers: dict
    ):
        """
        Test case: Performance requirement for all=true parameter.
        Should handle large content efficiently.
        """
        import time
        
        # Arrange: Create content with realistic large chunk count
        content_item = create_test_content_with_chunks(session, chunk_count=200)
        content_id = content_item.id

        # Act: Measure response time
        start_time = time.time()
        response = client.get(
            f"/api/v1/content/{content_id}/chunks?all=true",
            headers=normal_user_token_headers,
        )
        end_time = time.time()

        # Assert: Performance requirements
        assert response.status_code == 200
        assert (end_time - start_time) < 3.0  # Max 3 seconds for 200 chunks
        assert len(response.json()["chunks"]) == 200

    def test_backward_compatibility_preserved(
        self, client: TestClient, session: Session, normal_user_token_headers: dict
    ):
        """
        Test case: Existing pagination behavior should remain unchanged
        when all=true is not specified.
        """
        # Arrange
        content_item = create_test_content_with_chunks(session, chunk_count=30)
        content_id = content_item.id

        # Act: Use existing pagination API
        response = client.get(
            f"/api/v1/content/{content_id}/chunks?page=1&size=15",
            headers=normal_user_token_headers,
        )

        # Assert: Traditional pagination still works
        assert response.status_code == 200
        data = response.json()
        assert len(data["chunks"]) == 15  # First page
        assert data["pagination"]["page"] == 1
        assert data["pagination"]["size"] == 15
        assert data["pagination"]["has_next"] is True
        assert data["pagination"]["total_chunks"] == 30

    def test_user_experience_seamless_loading(
        self, client: TestClient, session: Session, normal_user_token_headers: dict
    ):
        """
        Test case: Simulate user experience - first screen loads quickly,
        full content loads without user noticing pagination.
        """
        # Arrange: Content representing a typical article
        content_item = create_test_content_with_chunks(session, chunk_count=50)
        content_id = content_item.id

        # Act 1: Get first screen (traditional way)
        first_screen_response = client.get(
            f"/api/v1/content/{content_id}/chunks?page=1&size=15",
            headers=normal_user_token_headers,
        )

        # Act 2: Get all content (optimized way)
        all_content_response = client.get(
            f"/api/v1/content/{content_id}/chunks?all=true",
            headers=normal_user_token_headers,
        )

        # Assert: Both approaches return consistent data
        assert first_screen_response.status_code == 200
        assert all_content_response.status_code == 200
        
        first_screen_chunks = first_screen_response.json()["chunks"]
        all_chunks = all_content_response.json()["chunks"]
        
        # First 15 chunks should be identical
        for i in range(15):
            assert first_screen_chunks[i]["id"] == all_chunks[i]["id"]
            assert first_screen_chunks[i]["content"] == all_chunks[i]["content"]

    def test_content_integrity_with_all_parameter(
        self, client: TestClient, session: Session, normal_user_token_headers: dict
    ):
        """
        Test case: Content integrity when using all=true parameter.
        All chunks should be present and properly ordered.
        """
        # Arrange: Create content with known chunk sequence
        content_item = create_test_content_with_chunks(
            session, 
            chunk_count=25,
            content_pattern="Chunk content {index}"
        )
        content_id = content_item.id

        # Act
        response = client.get(
            f"/api/v1/content/{content_id}/chunks?all=true",
            headers=normal_user_token_headers,
        )

        # Assert: Data integrity
        assert response.status_code == 200
        chunks = response.json()["chunks"]
        
        # Verify all chunks present and ordered
        assert len(chunks) == 25
        for i, chunk in enumerate(chunks):
            assert chunk["index"] == i
            assert f"Chunk content {i}" in chunk["content"]
        
        # Verify summary data
        summary = response.json()["summary"]
        assert summary["total_chunks"] == 25
        assert summary["max_index"] == 24


def create_test_content_with_chunks(
    session: Session, 
    chunk_count: int, 
    content_pattern: str = "Test chunk content {index}"
) -> ContentItem:
    """
    Helper function to create test content with specified number of chunks.
    This simulates the real-world scenario of processed content.
    """
    # Create base content item
    content_item = ContentItem(
        user_id=uuid.uuid4(),  # Will be overridden in actual test
        type="web_page",
        source_uri="https://example.com/test-article",
        title=f"Test Article with {chunk_count} chunks",
        content_text="Full article content here...",
        processing_status="completed"
    )
    session.add(content_item)
    session.commit()
    session.refresh(content_item)

    # Create chunks/segments
    for i in range(chunk_count):
        segment = Segment(
            content_item_id=content_item.id,
            segment_index=i,
            content=content_pattern.format(index=i),
            segment_type="paragraph",
            word_count=10 + (i % 20),  # Vary word count
            char_count=50 + (i % 100)  # Vary char count
        )
        session.add(segment)
    
    session.commit()
    return content_item 