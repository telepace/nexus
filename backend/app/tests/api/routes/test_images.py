import unittest
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import AsyncClient

from app.models.image import Image as ImageModel  # SQLAlchemy model
from app.models.user import User as UserModel  # SQLAlchemy model
from app.schemas.image import ImageCreate

# --- Mock Fixtures and Data ---


@pytest.fixture
def test_user() -> UserModel:
    return UserModel(
        id=uuid.uuid4(), email="test@example.com", is_active=True, is_superuser=False
    )


@pytest.fixture
def test_image_id() -> uuid.UUID:
    return uuid.uuid4()


@pytest.fixture
def test_image_model(test_user: UserModel, test_image_id: uuid.UUID) -> ImageModel:
    return ImageModel(
        id=test_image_id,
        owner_id=test_user.id,
        s3_key="test/image.jpg",
        type="uploaded",
        format="jpeg",
        # ... other fields
    )


@pytest.fixture
def image_response_dict(test_image_model: ImageModel) -> dict:
    # Convert model to dict that matches ImageResponse schema for assertion
    return {
        "id": str(test_image_model.id),
        "owner_id": str(test_image_model.owner_id),
        "s3_key": test_image_model.s3_key,
        "type": test_image_model.type,
        "format": test_image_model.format,
        "source_url": test_image_model.source_url,  # Will be None if not set
        "alt_text": test_image_model.alt_text,  # Will be None if not set
        "importance": test_image_model.importance,  # Will be None if not set
        "is_accessible": test_image_model.is_accessible,  # Will be False by default
        # Timestamps are often set by DB, so might not be in the initial model dict
        # "created_at": test_image_model.created_at.isoformat(),
        # "updated_at": test_image_model.updated_at.isoformat(),
        # "last_checked": test_image_model.last_checked.isoformat() if test_image_model.last_checked else None,
    }


# --- API Endpoint Tests ---


@pytest.mark.asyncio
@patch("app.api.deps.get_current_active_user")
@patch("app.api.deps.get_storage_service")
async def test_get_upload_url_success(
    mock_get_storage_service: MagicMock,
    mock_get_current_user: MagicMock,
    client: AsyncClient,  # Assuming client fixture is available from conftest.py
    test_user: UserModel,
):
    mock_get_current_user.return_value = test_user

    mock_storage_instance = AsyncMock()
    mock_storage_instance.get_presigned_url = AsyncMock(
        return_value="http://s3.mock/presigned-url-for-upload"
    )
    mock_get_storage_service.return_value = mock_storage_instance

    payload = {"filename": "test_image.png", "content_type": "image/png"}
    response = await client.post("/api/images/upload-url", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data["presigned_url"] == "http://s3.mock/presigned-url-for-upload"
    assert "s3_key" in data
    assert f"user_uploads/{test_user.id}/" in data["s3_key"]
    assert data["s3_key"].endswith(".png")

    mock_storage_instance.get_presigned_url.assert_called_once()
    # Check call args for get_presigned_url
    call_args = mock_storage_instance.get_presigned_url.call_args[1]
    assert (
        call_args["blob_name"] == data["s3_key"]
    )  # s3_key is generated, so check against returned one
    assert call_args["content_type"] == "image/png"


@pytest.mark.asyncio
async def test_get_upload_url_unauthenticated(client: AsyncClient):
    payload = {"filename": "test_image.png", "content_type": "image/png"}
    response = await client.post("/api/images/upload-url", json=payload)
    assert response.status_code == 401  # Or 403 depending on setup


@pytest.mark.asyncio
@patch("app.api.deps.get_current_active_user")
@patch("app.crud.crud_image.create_image", new_callable=AsyncMock)
async def test_create_image_record_success(
    mock_create_image: AsyncMock,
    mock_get_current_user: MagicMock,
    client: AsyncClient,
    test_user: UserModel,
    test_image_model: ImageModel,  # Use this to shape the mock return
    image_response_dict: dict,
):
    mock_get_current_user.return_value = test_user

    # Ensure the mock_create_image returns an object that can be serialized by Pydantic
    # For simplicity, returning the test_image_model itself.
    # FastAPI will serialize this using ImageResponse schema.
    mock_create_image.return_value = test_image_model

    image_create_payload = {
        "s3_key": "user_uploads/some_uuid.jpg",
        "type": "uploaded_test",
        "format": "jpeg",
        "size": 12345,
        "alt_text": "A test image",
    }
    response = await client.post("/api/images/", json=image_create_payload)

    assert response.status_code == 201
    data = response.json()

    # Compare relevant fields, excluding potentially dynamic ones like created_at/updated_at
    # if they are not part of test_image_model or are hard to mock precisely.
    assert (
        data["s3_key"] == image_response_dict["s3_key"]
    )  # s3_key from model, not payload
    assert data["owner_id"] == str(test_user.id)
    # assert data["alt_text"] == image_create_payload["alt_text"] # This depends on what create_image returns

    mock_create_image.assert_called_once()
    call_args = mock_create_image.call_args[1]
    assert isinstance(call_args["obj_in"], ImageCreate)
    assert call_args["obj_in"].s3_key == image_create_payload["s3_key"]
    assert call_args["owner_id"] == test_user.id


@pytest.mark.asyncio
async def test_create_image_record_unauthenticated(client: AsyncClient):
    payload = {"s3_key": "test.jpg", "type": "test"}
    response = await client.post("/api/images/", json=payload)
    assert response.status_code == 401


@pytest.mark.asyncio
@patch("app.api.deps.get_current_active_user")
@patch("app.crud.crud_image.get_image", new_callable=AsyncMock)
async def test_read_image_success(
    mock_get_image: AsyncMock,
    mock_get_current_user: MagicMock,
    client: AsyncClient,
    test_user: UserModel,
    test_image_model: ImageModel,
):
    mock_get_current_user.return_value = test_user
    mock_get_image.return_value = test_image_model  # Image owned by test_user

    response = await client.get(f"/api/images/{test_image_model.id}")

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(test_image_model.id)
    assert data["s3_key"] == test_image_model.s3_key
    mock_get_image.assert_called_once_with(
        db=unittest.mock.ANY, image_id=test_image_model.id
    )


@pytest.mark.asyncio
@patch("app.api.deps.get_current_active_user")
@patch("app.crud.crud_image.get_image", new_callable=AsyncMock)
async def test_read_image_not_found(
    mock_get_image: AsyncMock,
    mock_get_current_user: MagicMock,
    client: AsyncClient,
    test_user: UserModel,
):
    mock_get_current_user.return_value = test_user
    mock_get_image.return_value = None
    non_existent_id = uuid.uuid4()

    response = await client.get(f"/api/images/{non_existent_id}")
    assert response.status_code == 404


@pytest.mark.asyncio
@patch("app.api.deps.get_current_active_user")
@patch("app.crud.crud_image.get_image", new_callable=AsyncMock)
async def test_read_image_forbidden(
    mock_get_image: AsyncMock,
    mock_get_current_user: MagicMock,
    client: AsyncClient,
    _test_user: UserModel,  # This is the current user (marked as unused with _)
    test_image_model: ImageModel,  # This image is owned by test_user
):
    # Create another user who will try to access the image
    other_user = UserModel(id=uuid.uuid4(), email="other@example.com")
    mock_get_current_user.return_value = other_user  # Current user is 'other_user'

    # Image is owned by 'test_user', but 'other_user' is trying to access it
    mock_get_image.return_value = test_image_model

    response = await client.get(f"/api/images/{test_image_model.id}")
    assert response.status_code == 403  # Forbidden


@pytest.mark.asyncio
@patch("app.api.deps.get_current_active_user")
@patch("app.api.deps.get_storage_service")
@patch("app.crud.crud_image.get_image", new_callable=AsyncMock)
@patch("app.crud.crud_image.remove_image", new_callable=AsyncMock)
async def test_delete_image_success(
    mock_remove_image: AsyncMock,
    mock_get_image: AsyncMock,
    mock_get_storage_service: MagicMock,
    mock_get_current_user: MagicMock,
    client: AsyncClient,
    test_user: UserModel,
    test_image_model: ImageModel,  # Owned by test_user
):
    mock_get_current_user.return_value = test_user
    mock_get_image.return_value = test_image_model
    mock_remove_image.return_value = (
        test_image_model  # remove_image returns the deleted obj
    )

    mock_storage_instance = AsyncMock()
    mock_storage_instance.delete_file = AsyncMock()
    mock_get_storage_service.return_value = mock_storage_instance

    response = await client.delete(f"/api/images/{test_image_model.id}")

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(test_image_model.id)

    mock_get_image.assert_called_once_with(
        db=unittest.mock.ANY, image_id=test_image_model.id
    )
    mock_storage_instance.delete_file.assert_called_once_with(
        blob_name=test_image_model.s3_key
    )
    mock_remove_image.assert_called_once_with(
        db=unittest.mock.ANY, image_id=test_image_model.id
    )


@pytest.mark.asyncio
@patch("app.api.deps.get_current_active_user")
@patch("app.crud.crud_image.get_image", new_callable=AsyncMock)
async def test_delete_image_not_found(
    mock_get_image: AsyncMock,
    mock_get_current_user: MagicMock,
    client: AsyncClient,
    test_user: UserModel,
):
    mock_get_current_user.return_value = test_user
    mock_get_image.return_value = None  # Image does not exist
    non_existent_id = uuid.uuid4()

    response = await client.delete(f"/api/images/{non_existent_id}")
    assert response.status_code == 404


# Add tests for list_images endpoint as well
# Add tests for validation errors on create_image_record (e.g. missing s3_key)
# Add tests for delete_image when image.s3_key is None (should not call storage.delete_file)
