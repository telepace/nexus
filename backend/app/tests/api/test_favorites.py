import uuid

from fastapi.testclient import TestClient
from sqlmodel import Session


class TestFavorites:
    """Test cases for favorites functionality."""

    def test_add_favorite_success(
        self, client: TestClient, normal_user_token_headers: dict, db: Session
    ):
        """Test successfully adding a content item to favorites."""
        # Create a content item first
        content_data = {
            "type": "text",
            "title": "Test Content",
            "content_text": "This is test content",
        }
        content_response = client.post(
            "/api/v1/content/create",
            headers=normal_user_token_headers,
            json=content_data,
        )
        assert content_response.status_code == 201
        content_id = content_response.json()["id"]

        # Add to favorites
        response = client.post(
            f"/api/v1/content/{content_id}/favorite", headers=normal_user_token_headers
        )
        assert response.status_code == 201
        assert response.json()["status"] == "ok"

    def test_add_favorite_nonexistent_content(
        self, client: TestClient, normal_user_token_headers: dict
    ):
        """Test adding non-existent content to favorites returns 404."""
        fake_id = str(uuid.uuid4())
        response = client.post(
            f"/api/v1/content/{fake_id}/favorite", headers=normal_user_token_headers
        )
        assert response.status_code == 404

    def test_add_favorite_duplicate(
        self, client: TestClient, normal_user_token_headers: dict
    ):
        """Test adding same content to favorites twice returns 409."""
        # Create content
        content_data = {
            "type": "text",
            "title": "Test Content",
            "content_text": "This is test content",
        }
        content_response = client.post(
            "/api/v1/content/create",
            headers=normal_user_token_headers,
            json=content_data,
        )
        content_id = content_response.json()["id"]

        # Add to favorites first time
        client.post(
            f"/api/v1/content/{content_id}/favorite", headers=normal_user_token_headers
        )

        # Try to add again
        response = client.post(
            f"/api/v1/content/{content_id}/favorite", headers=normal_user_token_headers
        )
        assert response.status_code == 409

    def test_remove_favorite_success(
        self, client: TestClient, normal_user_token_headers: dict
    ):
        """Test successfully removing a content item from favorites."""
        # Create content and add to favorites
        content_data = {
            "type": "text",
            "title": "Test Content",
            "content_text": "This is test content",
        }
        content_response = client.post(
            "/api/v1/content/create",
            headers=normal_user_token_headers,
            json=content_data,
        )
        content_id = content_response.json()["id"]

        client.post(
            f"/api/v1/content/{content_id}/favorite", headers=normal_user_token_headers
        )

        # Remove from favorites
        response = client.delete(
            f"/api/v1/content/{content_id}/favorite", headers=normal_user_token_headers
        )
        assert response.status_code == 204

    def test_remove_favorite_not_favorited(
        self, client: TestClient, normal_user_token_headers: dict
    ):
        """Test removing non-favorited content returns 404."""
        # Create content but don't add to favorites
        content_data = {
            "type": "text",
            "title": "Test Content",
            "content_text": "This is test content",
        }
        content_response = client.post(
            "/api/v1/content/create",
            headers=normal_user_token_headers,
            json=content_data,
        )
        content_id = content_response.json()["id"]

        # Try to remove from favorites
        response = client.delete(
            f"/api/v1/content/{content_id}/favorite", headers=normal_user_token_headers
        )
        assert response.status_code == 404

    def test_get_favorites_empty(
        self, client: TestClient, normal_user_token_headers: dict
    ):
        """Test getting empty favorites list."""
        response = client.get("/api/v1/favorites", headers=normal_user_token_headers)
        if response.status_code != 200:
            print(f"Error response: {response.text}")
            print(f"Status code: {response.status_code}")
        assert response.status_code == 200
        assert response.json()["items"] == []
        assert response.json()["total"] == 0

    def test_get_favorites_with_items(
        self, client: TestClient, normal_user_token_headers: dict
    ):
        """Test getting favorites list with items."""
        # Create multiple content items and add to favorites
        content_items = []
        for i in range(3):
            content_data = {
                "type": "text",
                "title": f"Test Content {i}",
                "content_text": f"This is test content {i}",
            }
            content_response = client.post(
                "/api/v1/content/create",
                headers=normal_user_token_headers,
                json=content_data,
            )
            content_id = content_response.json()["id"]
            content_items.append(content_id)

            # Add to favorites
            client.post(
                f"/api/v1/content/{content_id}/favorite",
                headers=normal_user_token_headers,
            )

        # Get favorites
        response = client.get("/api/v1/favorites", headers=normal_user_token_headers)
        assert response.status_code == 200
        assert len(response.json()["items"]) == 3
        assert response.json()["total"] == 3

    def test_get_favorites_pagination(
        self, client: TestClient, normal_user_token_headers: dict
    ):
        """Test favorites pagination."""
        # Create 5 content items and add to favorites
        for i in range(5):
            content_data = {
                "type": "text",
                "title": f"Test Content {i}",
                "content_text": f"This is test content {i}",
            }
            content_response = client.post(
                "/api/v1/content/create",
                headers=normal_user_token_headers,
                json=content_data,
            )
            content_id = content_response.json()["id"]

            client.post(
                f"/api/v1/content/{content_id}/favorite",
                headers=normal_user_token_headers,
            )

        # Test pagination
        response = client.get(
            "/api/v1/favorites?skip=0&limit=3", headers=normal_user_token_headers
        )
        assert response.status_code == 200
        assert len(response.json()["items"]) == 3
        assert response.json()["total"] == 5
