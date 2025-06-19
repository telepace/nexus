import uuid
import json
import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings
from app.tests.utils.utils import random_email, random_lower_string


class TestAIConversationsAPI:
    """Test AI Conversations API endpoints."""

    def test_create_ai_conversation_success(
        self, client: TestClient, superuser_token_headers: dict[str, str], db: Session
    ) -> None:
        """Test creating a new AI conversation."""
        data = {
            "title": "Test Analysis Conversation",
            "ai_model_name": "gemini-2.5-flash-preview-05-20",
            "messages": [
                {"role": "user", "content": "Analyze this content"},
                {"role": "assistant", "content": "Here is my analysis..."}
            ],
            "summary": "This is a test conversation for content analysis"
        }
        
        response = client.post(
            f"{settings.API_V1_STR}/ai/conversations/",
            headers=superuser_token_headers,
            json=data,
        )
        
        print(f"Response status: {response.status_code}")
        print(f"Response content: {response.text}")
        
        assert response.status_code == 201
        content = response.json()
        assert content["title"] == data["title"]
        assert content["ai_model_name"] == data["ai_model_name"]
        assert content["summary"] == data["summary"]
        assert len(content["messages"]) == 2
        assert "id" in content
        assert "created_at" in content
        assert "updated_at" in content

    def test_list_ai_conversations_empty(
        self, client: TestClient, superuser_token_headers: dict[str, str], db: Session
    ) -> None:
        """Test listing conversations when none exist."""
        response = client.get(
            f"{settings.API_V1_STR}/ai/conversations/",
            headers=superuser_token_headers,
        )
        
        assert response.status_code == 200
        content = response.json()
        assert isinstance(content, list)
        # Note: might not be empty if other tests have run

    def test_list_ai_conversations_with_content_filter(
        self, client: TestClient, superuser_token_headers: dict[str, str], db: Session
    ) -> None:
        """Test listing conversations filtered by content_item_id."""
        content_item_id = str(uuid.uuid4())
        
        response = client.get(
            f"{settings.API_V1_STR}/ai/conversations/",
            headers=superuser_token_headers,
            params={"content_item_id": content_item_id}
        )
        
        assert response.status_code == 200
        content = response.json()
        assert isinstance(content, list)

    def test_get_ai_conversation_detail_not_found(
        self, client: TestClient, superuser_token_headers: dict[str, str], db: Session
    ) -> None:
        """Test getting conversation detail for non-existent conversation."""
        fake_id = str(uuid.uuid4())
        
        response = client.get(
            f"{settings.API_V1_STR}/ai/conversations/{fake_id}",
            headers=superuser_token_headers,
        )
        
        assert response.status_code == 404

    def test_get_ai_conversation_messages_not_found(
        self, client: TestClient, superuser_token_headers: dict[str, str], db: Session
    ) -> None:
        """Test getting conversation messages for non-existent conversation."""
        fake_id = str(uuid.uuid4())
        
        response = client.get(
            f"{settings.API_V1_STR}/ai/conversations/{fake_id}/messages",
            headers=superuser_token_headers,
        )
        
        assert response.status_code == 404

    def test_create_and_retrieve_ai_conversation(
        self, client: TestClient, superuser_token_headers: dict[str, str], db: Session
    ) -> None:
        """Test creating a conversation and then retrieving it."""
        # Create conversation
        create_data = {
            "title": "Integration Test Conversation",
            "ai_model_name": "gpt-4",
            "messages": [
                {"role": "user", "content": "Hello"},
                {"role": "assistant", "content": "Hi there!"}
            ],
            "summary": "A simple greeting conversation"
        }
        
        create_response = client.post(
            f"{settings.API_V1_STR}/ai/conversations/",
            headers=superuser_token_headers,
            json=create_data,
        )
        
        assert create_response.status_code == 201
        created_conversation = create_response.json()
        conversation_id = created_conversation["id"]
        
        # Retrieve conversation detail
        detail_response = client.get(
            f"{settings.API_V1_STR}/ai/conversations/{conversation_id}",
            headers=superuser_token_headers,
        )
        
        assert detail_response.status_code == 200
        detail_content = detail_response.json()
        assert detail_content["id"] == conversation_id
        assert detail_content["title"] == create_data["title"]
        assert len(detail_content["messages"]) == 2
        
        # Retrieve conversation messages
        messages_response = client.get(
            f"{settings.API_V1_STR}/ai/conversations/{conversation_id}/messages",
            headers=superuser_token_headers,
        )
        
        assert messages_response.status_code == 200
        messages_content = messages_response.json()
        assert isinstance(messages_content, list)
        assert len(messages_content) == 2
        assert messages_content[0]["role"] == "user"
        assert messages_content[1]["role"] == "assistant"

    def test_create_ai_conversation_unauthorized(
        self, client: TestClient, db: Session
    ) -> None:
        """Test creating conversation without authentication."""
        data = {
            "title": "Unauthorized Test",
            "ai_model_name": "gpt-4",
            "messages": [],
        }
        
        response = client.post(
            f"{settings.API_V1_STR}/ai/conversations/",
            json=data,
        )
        
        assert response.status_code == 401

    def test_create_ai_conversation_with_content_item_id(
        self, client: TestClient, superuser_token_headers: dict[str, str], db: Session
    ) -> None:
        """Test creating conversation with content_item_id."""
        content_item_id = str(uuid.uuid4())
        
        data = {
            "content_item_id": content_item_id,
            "title": "Content Analysis",
            "ai_model_name": "claude-3",
            "messages": [
                {"role": "system", "content": "You are an expert analyst"},
                {"role": "user", "content": "Please analyze this content"},
                {"role": "assistant", "content": "Based on my analysis..."}
            ],
            "summary": "Analysis of specific content item"
        }
        
        response = client.post(
            f"{settings.API_V1_STR}/ai/conversations/",
            headers=superuser_token_headers,
            json=data,
        )
        
        assert response.status_code == 201
        content = response.json()
        assert content["content_item_id"] == content_item_id
        assert len(content["messages"]) == 3

    def test_list_ai_conversations_pagination(
        self, client: TestClient, superuser_token_headers: dict[str, str], db: Session
    ) -> None:
        """Test conversation listing with pagination parameters."""
        response = client.get(
            f"{settings.API_V1_STR}/ai/conversations/",
            headers=superuser_token_headers,
            params={"skip": 0, "limit": 5}
        )
        
        assert response.status_code == 200
        content = response.json()
        assert isinstance(content, list)
        assert len(content) <= 5 