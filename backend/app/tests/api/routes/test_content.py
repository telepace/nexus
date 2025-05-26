import uuid
from datetime import datetime, timezone

from fastapi.testclient import TestClient

from app.schemas.content import ContentItemCreate, ContentItemPublic
from app.tests.utils.utils import get_error_detail

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
def test_create_content_item_api(client: TestClient, mocker, normal_user_token_headers):
    user_id_for_test = (
        uuid.uuid4()
    )  # Assume this comes from the token or a test user setup
    item_id_for_test = uuid.uuid4()

    # Prepare request data using the schema
    content_item_create_data = ContentItemCreate(
        type="document",
        source_uri="http://example.com/new_doc.pdf",
        title="New Document via API",
        summary="A test document created via API.",
        user_id=user_id_for_test,  # Ensure user_id is included as per schema
    )

    # Mock the response from the CRUD function
    mock_created_item = create_mock_content_item_public(
        item_id=item_id_for_test,
        user_id=user_id_for_test,
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
    assert response_data["user_id"] == str(user_id_for_test)
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
    client: TestClient, mocker, normal_user_token_headers
):
    item_id = uuid.uuid4()
    user_id = uuid.uuid4()
    mock_item = create_mock_content_item_public(item_id, user_id, "Specific Item")

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


print(
    "API tests for ContentItem created in backend/app/tests/api/routes/test_content.py"
)
