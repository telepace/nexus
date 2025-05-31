"""
Tests for content processing API endpoints.
"""

import uuid
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlmodel import Session


def extract_content_id(response_json):
    """Extract content ID from response, handling both direct and wrapped formats."""
    if "data" in response_json:
        return response_json["data"]["id"]
    else:
        return response_json["id"]


def extract_data(response_json, field):
    """Extract field from response data, handling both direct and wrapped formats."""
    if "data" in response_json:
        return response_json["data"][field]
    else:
        return response_json[field]


class TestContentProcessingAPI:
    """Test content processing API endpoints."""

    def test_get_supported_processors(self, client: TestClient):
        """Test getting supported processors endpoint."""
        response = client.get("/api/v1/content/processors/supported")
        assert response.status_code == 200

        data = response.json()
        assert "supported_types" in data
        assert "processors" in data
        assert "pipeline_info" in data

        # Check that we have the expected supported types
        supported_types = data["supported_types"]
        assert "text" in supported_types
        assert "url" in supported_types
        assert "pdf" in supported_types
        assert "docx" in supported_types

        # Check pipeline info
        pipeline_info = data["pipeline_info"]
        assert pipeline_info["engine"] == "Microsoft MarkItDown"
        assert pipeline_info["storage"] == "Cloudflare R2"
        assert pipeline_info["extensible"] is True

    def test_process_content_item_text(
        self, client: TestClient, db: Session, normal_user_token_headers
    ):
        """Test processing a text content item."""
        # Create a content item first
        content_data = {
            "type": "text",
            "title": "Test Content",
            "content_text": "This is a test content with multiple paragraphs.\n\nSecond paragraph here.",
        }

        create_response = client.post(
            "/api/v1/content/create",
            json=content_data,
            headers=normal_user_token_headers,
        )
        assert create_response.status_code == 201
        content_item = create_response.json()
        content_id = extract_content_id(content_item)

        # Process the content item
        process_response = client.post(
            f"/api/v1/content/process/{content_id}",
            headers=normal_user_token_headers,
        )
        assert process_response.status_code == 200

        processed_item = process_response.json()
        assert extract_data(processed_item, "processing_status") == "processing"

    @patch("app.utils.content_processors.requests.get")
    def test_process_content_item_url(
        self, mock_get, client: TestClient, db: Session, normal_user_token_headers
    ):
        """Test processing a URL content item."""
        # Mock HTTP response
        mock_response = mock_get.return_value
        mock_response.status_code = 200
        mock_response.text = """
        <html>
            <head><title>Test Page</title></head>
            <body>
                <h1>Main Heading</h1>
                <p>This is a test paragraph.</p>
            </body>
        </html>
        """

        # Create a URL content item
        content_data = {"type": "url", "source_uri": "https://example.com/test-page"}

        create_response = client.post(
            "/api/v1/content/create",
            json=content_data,
            headers=normal_user_token_headers,
        )
        assert create_response.status_code == 201
        content_item = create_response.json()
        content_id = extract_content_id(content_item)

        # Process the content item
        process_response = client.post(
            f"/api/v1/content/process/{content_id}",
            headers=normal_user_token_headers,
        )
        assert process_response.status_code == 200

        processed_item = process_response.json()
        assert extract_data(processed_item, "processing_status") == "processing"

    def test_process_content_item_not_found(
        self, client: TestClient, normal_user_token_headers
    ):
        """Test processing non-existent content item."""
        fake_id = str(uuid.uuid4())

        response = client.post(
            f"/api/v1/content/process/{fake_id}",
            headers=normal_user_token_headers,
        )
        assert response.status_code == 404
        assert "ContentItem not found" in response.json()["error"]

    def test_process_content_item_unsupported_type(
        self, client: TestClient, db: Session, normal_user_token_headers
    ):
        """Test processing content item with unsupported type - should now succeed with ModernProcessor."""
        # Create a content item with unsupported type
        content_data = {"type": "unsupported", "title": "Unsupported Content"}

        create_response = client.post(
            "/api/v1/content/create",
            json=content_data,
            headers=normal_user_token_headers,
        )
        assert create_response.status_code == 201
        content_item = create_response.json()
        content_id = extract_content_id(content_item)

        # Try to process the content item - should now succeed
        process_response = client.post(
            f"/api/v1/content/process/{content_id}",
            headers=normal_user_token_headers,
        )
        # New architecture handles all types through ModernProcessor
        assert process_response.status_code == 200

        result = process_response.json()
        # Check that we get back a ContentItem with processing status
        assert "id" in result
        assert "processing_status" in result
        # Should be set to "processing" since it's handled in background
        assert result["processing_status"] == "processing"

    def test_process_already_completed_content(
        self, client: TestClient, db: Session, normal_user_token_headers
    ):
        """Test processing already completed content item."""
        # Create and manually mark as completed
        content_data = {
            "type": "text",
            "title": "Completed Content",
            "content_text": "Already processed content.",
        }

        create_response = client.post(
            "/api/v1/content/create",
            json=content_data,
            headers=normal_user_token_headers,
        )
        assert create_response.status_code == 201
        content_item = create_response.json()
        content_id = extract_content_id(content_item)

        # Manually update status to completed
        from app.crud.crud_content import get_content_item_sync

        item = get_content_item_sync(db, uuid.UUID(content_id))
        item.processing_status = "completed"
        db.add(item)
        db.commit()

        # Try to process again
        process_response = client.post(
            f"/api/v1/content/process/{content_id}",
            headers=normal_user_token_headers,
        )
        assert process_response.status_code == 200

        processed_item = process_response.json()
        assert extract_data(processed_item, "processing_status") == "completed"

    def test_process_content_item_unauthorized(
        self,
        client: TestClient,
        db: Session,
        superuser_token_headers,
        normal_user_token_headers,
    ):
        """Test processing content item that belongs to another user."""
        # Create content item with superuser
        content_data = {
            "type": "text",
            "title": "Superuser Content",
            "content_text": "This belongs to superuser.",
        }

        create_response = client.post(
            "/api/v1/content/create",
            json=content_data,
            headers=superuser_token_headers,
        )
        assert create_response.status_code == 201
        content_item = create_response.json()
        content_id = extract_content_id(content_item)

        # Try to process with normal user
        process_response = client.post(
            f"/api/v1/content/process/{content_id}",
            headers=normal_user_token_headers,
        )
        assert process_response.status_code == 403
        assert "You don't have permission" in process_response.json()["error"]
