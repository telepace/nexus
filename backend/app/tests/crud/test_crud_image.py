import uuid
from unittest.mock import AsyncMock, MagicMock  # For mocking AsyncSession

import pytest
import pytest_asyncio  # For async fixtures
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import crud_image
from app.models.image import Image  # The SQLAlchemy model
from app.schemas.image import ImageCreate, ImageUpdate  # Pydantic schemas


# --- Async Mock Session Fixture ---
@pytest_asyncio.fixture
async def mock_db_session() -> AsyncMock:
    session = AsyncMock(spec=AsyncSession)
    session.commit = AsyncMock()
    session.refresh = AsyncMock()
    session.add = MagicMock()
    session.delete = AsyncMock()
    # Mock the execute method to return an object that can then have scalar_one_or_none, etc. called
    mock_execute_result = MagicMock()
    session.execute = AsyncMock(return_value=mock_execute_result)
    return session


# --- Test Data ---
def create_test_image_model(
    owner_id: uuid.UUID, image_id: uuid.UUID = None, s3_key: str = "test.jpg"
) -> Image:
    return Image(
        id=image_id or uuid.uuid4(),
        s3_key=s3_key,
        owner_id=owner_id,
        type="test_type",
        format="jpg",
        # Add other necessary fields as per your Image model definition
    )


def create_test_image_create_schema(s3_key: str = "test_new.jpg") -> ImageCreate:
    return ImageCreate(
        s3_key=s3_key,
        type="test_create_type",
        format="png",
        # Add other fields from ImageCreate schema
    )


def create_test_image_update_schema() -> ImageUpdate:
    return ImageUpdate(
        alt_text="Updated alt text",
        importance="high",
    )


# --- CRUD Function Tests ---


@pytest.mark.asyncio
async def test_create_image(mock_db_session: AsyncMock):
    owner_id = uuid.uuid4()
    image_create_data = create_test_image_create_schema()

    # The actual db_obj will be an instance of Image, created inside create_image
    # We don't need to mock its exact return value from construction,
    # but rather ensure session.add, commit, refresh are called.

    created_image = await crud_image.create_image(
        db=mock_db_session, obj_in=image_create_data, owner_id=owner_id
    )

    mock_db_session.add.assert_called_once()  # Check that add was called
    mock_db_session.commit.assert_called_once()
    mock_db_session.refresh.assert_called_once()

    # Assert that the returned object has data from obj_in and owner_id
    assert created_image.s3_key == image_create_data.s3_key
    assert created_image.owner_id == owner_id
    assert created_image.type == image_create_data.type
    assert created_image.format == image_create_data.format
    assert isinstance(created_image.id, uuid.UUID)


@pytest.mark.asyncio
async def test_get_image(mock_db_session: AsyncMock):
    image_id = uuid.uuid4()
    owner_id = uuid.uuid4()
    expected_image = create_test_image_model(owner_id=owner_id, image_id=image_id)

    # Configure the mock_execute_result for this specific test
    mock_db_session.execute.return_value.scalar_one_or_none = MagicMock(
        return_value=expected_image
    )

    retrieved_image = await crud_image.get_image(db=mock_db_session, image_id=image_id)

    mock_db_session.execute.assert_called_once()
    # Add more specific assertion about the select statement if possible/needed
    assert retrieved_image == expected_image


@pytest.mark.asyncio
async def test_get_image_not_found(mock_db_session: AsyncMock):
    image_id = uuid.uuid4()
    mock_db_session.execute.return_value.scalar_one_or_none = MagicMock(
        return_value=None
    )

    retrieved_image = await crud_image.get_image(db=mock_db_session, image_id=image_id)

    mock_db_session.execute.assert_called_once()
    assert retrieved_image is None


@pytest.mark.asyncio
async def test_get_multi_images_by_owner(mock_db_session: AsyncMock):
    owner_id = uuid.uuid4()
    image1 = create_test_image_model(owner_id=owner_id)
    image2 = create_test_image_model(owner_id=owner_id)
    expected_images = [image1, image2]

    mock_db_session.execute.return_value.scalars.return_value.all = MagicMock(
        return_value=expected_images
    )

    retrieved_images = await crud_image.get_multi_images_by_owner(
        db=mock_db_session, owner_id=owner_id, skip=0, limit=10
    )

    mock_db_session.execute.assert_called_once()
    assert retrieved_images == expected_images
    assert len(retrieved_images) == 2


@pytest.mark.asyncio
async def test_update_image(mock_db_session: AsyncMock):
    image_id = uuid.uuid4()
    owner_id = uuid.uuid4()

    db_image_to_update = create_test_image_model(
        owner_id=owner_id, image_id=image_id, s3_key="old.jpg"
    )
    image_update_data = create_test_image_update_schema()  # e.g., alt_text="new alt"

    # update_image takes db_obj as an argument, so it's already "retrieved"
    # The function will modify this db_obj directly.

    updated_image = await crud_image.update_image(
        db=mock_db_session, db_obj=db_image_to_update, obj_in=image_update_data
    )

    mock_db_session.add.assert_called_once_with(db_image_to_update)
    mock_db_session.commit.assert_called_once()
    mock_db_session.refresh.assert_called_once_with(db_image_to_update)

    assert updated_image.alt_text == image_update_data.alt_text
    assert updated_image.importance == image_update_data.importance
    assert updated_image.id == image_id  # Ensure ID hasn't changed


@pytest.mark.asyncio
async def test_remove_image(mock_db_session: AsyncMock):
    image_id = uuid.uuid4()
    owner_id = uuid.uuid4()
    image_to_delete = create_test_image_model(owner_id=owner_id, image_id=image_id)

    # Mock get_image if remove_image calls it internally (as per my crud_image.py impl)
    # If remove_image directly takes a db_obj, this part is different.
    # Assuming remove_image calls get_image:
    mock_db_session.execute.return_value.scalar_one_or_none = MagicMock(
        return_value=image_to_delete
    )

    deleted_image = await crud_image.remove_image(db=mock_db_session, image_id=image_id)

    # get_image is called once by remove_image
    mock_db_session.execute.assert_called_once()
    mock_db_session.delete.assert_called_once_with(image_to_delete)
    mock_db_session.commit.assert_called_once()
    assert deleted_image == image_to_delete


@pytest.mark.asyncio
async def test_remove_image_not_found(mock_db_session: AsyncMock):
    image_id = uuid.uuid4()

    # Mock get_image to return None
    mock_db_session.execute.return_value.scalar_one_or_none = MagicMock(
        return_value=None
    )

    result = await crud_image.remove_image(db=mock_db_session, image_id=image_id)

    mock_db_session.execute.assert_called_once()
    mock_db_session.delete.assert_not_called()  # Ensure delete wasn't called if no object
    mock_db_session.commit.assert_not_called()  # Ensure commit wasn't called
    assert result is None


# Add more tests for edge cases, different inputs, etc.
