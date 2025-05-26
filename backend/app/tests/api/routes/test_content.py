import uuid
from datetime import datetime, timezone

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.schemas.content import ContentItemCreate, ContentItemPublic
from app.tests.utils.utils import get_error_detail
from app import crud
from app.core.config import settings

# Assuming 'client' and 'normal_user_token_headers' are fixtures provided by conftest.py or similar
# If not, client would be TestClient(app) from app.main
# And normal_user_token_headers would need to be mocked or obtained via a login utility.


# Helper to create a mock ContentItemPublic for API responses
def create_mock_content_item_public(
    item_id: uuid.UUID, user_id: uuid.UUID, title: str = "API Test Item"
) -> ContentItemPublic:
    return ContentItemPublic(
        id=item_id,
        user_id=user_id,
        type="api_test",
        source_uri="http://example.com/api_test.txt",
        title=title,
        summary="This is an API test summary.",
        processing_status="completed",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )


# Test for POST /api/v1/content/create
def test_create_content_item_api(client: TestClient, db: Session, mocker, normal_user_token_headers):
    # Get the test user to ensure we use the correct user_id
    test_user = crud.get_user_by_email(session=db, email=settings.EMAIL_TEST_USER)
    if not test_user:
        # This shouldn't happen in tests, but let's be safe
        from app.models import UserCreate
        user_in = UserCreate(email=settings.EMAIL_TEST_USER, password="testpassword")
        test_user = crud.create_user(session=db, user_create=user_in)
    
    item_id_for_test = uuid.uuid4()

    # Prepare request data using the schema (user_id is no longer needed in request)
    content_item_create_data = ContentItemCreate(
        type="document",
        source_uri="http://example.com/new_doc.pdf",
        title="New Document via API",
        summary="A test document created via API.",
        # user_id is now set from authentication, not from client request
    )

    # Mock the response from the CRUD function
    mock_created_item = create_mock_content_item_public(
        item_id=item_id_for_test,
        user_id=test_user.id,  # Use actual test user ID
        title=content_item_create_data.title or "Default Title",
    )

    mocker.patch(
        "app.api.routes.content.crud_create_content_item",
        return_value=mock_created_item,
    )

    response = client.post(
        "/api/v1/content/create",
        headers=normal_user_token_headers,
        json=content_item_create_data.model_dump(
            mode="json"
        ),  # Use model_dump for proper serialization
    )

    assert response.status_code == 201
    response_data = response.json()
    assert response_data["id"] == str(item_id_for_test)
    assert response_data["title"] == content_item_create_data.title
    assert response_data["user_id"] == str(test_user.id)
    assert response_data["processing_status"] == "completed"


# Test for GET /api/v1/content (empty list)
def test_get_content_items_api_empty(
    client: TestClient, mocker, normal_user_token_headers
):
    mocker.patch("app.api.routes.content.crud_get_content_items", return_value=[])

    response = client.get("/api/v1/content", headers=normal_user_token_headers)

    assert response.status_code == 200
    assert response.json() == []


# Test for GET /api/v1/content (with data)
def test_get_content_items_api_with_data(
    client: TestClient, mocker, normal_user_token_headers
):
    user_id_for_test = uuid.uuid4()
    mock_items_list = [
        create_mock_content_item_public(uuid.uuid4(), user_id_for_test, "Item 1"),
        create_mock_content_item_public(uuid.uuid4(), user_id_for_test, "Item 2"),
    ]
    mocker.patch(
        "app.api.routes.content.crud_get_content_items", return_value=mock_items_list
    )

    response = client.get("/api/v1/content", headers=normal_user_token_headers)

    assert response.status_code == 200
    response_data = response.json()
    assert len(response_data) == 2
    assert response_data[0]["title"] == "Item 1"
    assert response_data[1]["title"] == "Item 2"


# Test for GET /api/v1/content/{id} (found)
def test_get_single_content_item_api(
    client: TestClient, db: Session, mocker, normal_user_token_headers
):
    # Get the test user to ensure we use the correct user_id
    test_user = crud.get_user_by_email(session=db, email=settings.EMAIL_TEST_USER)
    if not test_user:
        # This shouldn't happen in tests, but let's be safe
        from app.models import UserCreate
        user_in = UserCreate(email=settings.EMAIL_TEST_USER, password="testpassword")
        test_user = crud.create_user(session=db, user_create=user_in)
    
    item_id = uuid.uuid4()
    # Use the actual test user's ID to avoid permission errors
    mock_item = create_mock_content_item_public(item_id, test_user.id, "Specific Item")

    mocker.patch("app.api.routes.content.crud_get_content_item", return_value=mock_item)

    response = client.get(
        f"/api/v1/content/{item_id}", headers=normal_user_token_headers
    )

    assert response.status_code == 200
    response_data = response.json()
    assert response_data["id"] == str(item_id)
    assert response_data["title"] == "Specific Item"


# Test for GET /api/v1/content/{id} (not found)
def test_get_single_content_item_api_not_found(
    client: TestClient, mocker, normal_user_token_headers
):
    item_id = uuid.uuid4()
    mocker.patch("app.api.routes.content.crud_get_content_item", return_value=None)

    response = client.get(
        f"/api/v1/content/{item_id}", headers=normal_user_token_headers
    )

    assert response.status_code == 404
    response_data = response.json()
    error_detail = get_error_detail(response_data)
    assert error_detail == "ContentItem not found"


def test_get_content_markdown_api(client: TestClient, normal_user_token_headers: dict[str, str], db: Session) -> None:
    """Test getting markdown content for a content item."""
    # Create a content item first
    content_data = {
        "type": "text",
        "title": "Test Markdown Content",
        "content_text": "# Hello World\n\nThis is **markdown** content."
    }
    
    response = client.post(
        "/api/v1/content/create",
        headers=normal_user_token_headers,
        json=content_data,
    )
    assert response.status_code == 201
    created_content = response.json()
    
    # Handle both wrapped and unwrapped response formats
    if "data" in created_content:
        content_id = created_content["data"]["id"]
    else:
        content_id = created_content["id"]
    
    # Update the content to be completed
    from app.crud.crud_content import get_content_item
    content_item = get_content_item(session=db, id=content_id)
    content_item.processing_status = "completed"
    db.add(content_item)
    db.commit()
    
    # Get markdown content
    response = client.get(
        f"/api/v1/content/{content_id}/markdown",
        headers=normal_user_token_headers,
    )
    assert response.status_code == 200
    
    response_data = response.json()
    
    # Handle both wrapped and unwrapped response formats
    if "data" in response_data:
        markdown_data = response_data["data"]
    else:
        markdown_data = response_data
    
    assert markdown_data["id"] == content_id
    assert markdown_data["title"] == "Test Markdown Content"
    assert markdown_data["markdown_content"] == "# Hello World\n\nThis is **markdown** content."
    assert markdown_data["processing_status"] == "completed"
    assert "created_at" in markdown_data
    assert "updated_at" in markdown_data


def test_get_content_markdown_api_not_ready(client: TestClient, normal_user_token_headers: dict[str, str]) -> None:
    """Test getting markdown content for a content item that's not ready."""
    # Create a content item first without content_text
    content_data = {
        "type": "text",
        "title": "Test Content",
        # Don't include content_text to simulate a content item without processed content
    }
    
    response = client.post(
        "/api/v1/content/create",
        headers=normal_user_token_headers,
        json=content_data,
    )
    assert response.status_code == 201
    created_content = response.json()
    
    # Handle both wrapped and unwrapped response formats
    if "data" in created_content:
        content_id = created_content["data"]["id"]
    else:
        content_id = created_content["id"]
    
    # Try to get markdown content (should fail because there's no content and no R2 assets)
    response = client.get(
        f"/api/v1/content/{content_id}/markdown",
        headers=normal_user_token_headers,
    )
    assert response.status_code == 400
    response_data = response.json()
    # Check error field in ApiResponse format
    error_message = response_data.get("error", "")
    assert "not ready" in error_message.lower() or "no markdown content" in error_message.lower()


def test_get_content_markdown_api_not_found(client: TestClient, normal_user_token_headers: dict[str, str]) -> None:
    """Test getting markdown content for a non-existent content item."""
    fake_id = "00000000-0000-0000-0000-000000000000"
    
    response = client.get(
        f"/api/v1/content/{fake_id}/markdown",
        headers=normal_user_token_headers,
    )
    assert response.status_code == 404
    response_data = response.json()
    error_message = response_data.get("error", "")
    assert "not found" in error_message.lower()


def test_get_content_markdown_api_unauthorized(client: TestClient, normal_user_token_headers: dict[str, str], superuser_token_headers: dict[str, str]) -> None:
    """Test getting markdown content for a content item owned by another user."""
    # Create a content item with normal user
    content_data = {
        "type": "text",
        "title": "Test Content",
        "content_text": "Some content"
    }
    
    response = client.post(
        "/api/v1/content/create",
        headers=normal_user_token_headers,
        json=content_data,
    )
    assert response.status_code == 201
    created_content = response.json()
    
    # Handle both wrapped and unwrapped response formats
    if "data" in created_content:
        content_id = created_content["data"]["id"]
    else:
        content_id = created_content["id"]
    
    # Try to access with different user (superuser)
    response = client.get(
        f"/api/v1/content/{content_id}/markdown",
        headers=superuser_token_headers,
    )
    assert response.status_code == 403
    response_data = response.json()
    error_message = response_data.get("error", "")
    assert "permission" in error_message.lower()


print(
    "API tests for ContentItem created in backend/app/tests/api/routes/test_content.py"
)
