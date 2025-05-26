import uuid
from datetime import datetime, timezone
from unittest.mock import MagicMock

import pytest
from sqlmodel import Session

from app.crud.crud_content import (
    create_content_item,
    delete_content_item,
    get_content_item,
    get_content_items,
    update_content_item,
)
from app.models.content import ContentItem


# Helper to create a mock ContentItem for testing
def create_mock_content_item(
    item_id: uuid.UUID | None = None, user_id: uuid.UUID | None = None
) -> ContentItem:
    return ContentItem(
        id=item_id or uuid.uuid4(),
        user_id=user_id or uuid.uuid4(),
        type="text",
        source_uri="http://example.com/test.txt",
        title="Test Content Item",
        summary="This is a test summary.",
        content_text="This is the test content.",
        processing_status="completed",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )


@pytest.fixture
def db_session_mock():
    # Create a MagicMock for the Session object
    session = MagicMock(spec=Session)
    return session


def test_create_content_item(db_session_mock: MagicMock):
    mock_item_data = create_mock_content_item()

    # Configure the mock session's methods that will be called by the CRUD function
    # create_content_item does not return the object from add/refresh, it returns the input obj after validation + commit
    # The actual db_content_item is modified in place by SQLModel.model_validate and by session.refresh if it had defaults

    created_item = create_content_item(
        session=db_session_mock, content_item_in=mock_item_data
    )

    db_session_mock.add.assert_called_once()
    db_session_mock.commit.assert_called_once()
    db_session_mock.refresh.assert_called_once_with(
        db_session_mock.add.call_args[0][0]
    )  # ensure refresh is called with the added obj

    # Assert that the returned item is the one that was passed in, potentially with some fields updated by model_validate
    # or by side effects of session.add/refresh if they were not fully mocked to do nothing
    assert created_item.id == mock_item_data.id
    assert created_item.title == mock_item_data.title


def test_get_content_item(db_session_mock: MagicMock):
    mock_item = create_mock_content_item()
    db_session_mock.get.return_value = mock_item

    item_id = mock_item.id
    retrieved_item = get_content_item(session=db_session_mock, id=item_id)

    db_session_mock.get.assert_called_once_with(ContentItem, item_id)
    assert retrieved_item == mock_item


def test_get_content_item_not_found(db_session_mock: MagicMock):
    db_session_mock.get.return_value = None
    item_id = uuid.uuid4()

    retrieved_item = get_content_item(session=db_session_mock, id=item_id)

    db_session_mock.get.assert_called_once_with(ContentItem, item_id)
    assert retrieved_item is None


def test_get_content_items_empty(db_session_mock: MagicMock):
    # Mock the behavior of session.exec().all()
    mock_exec_result = MagicMock()
    mock_exec_result.all.return_value = []
    db_session_mock.exec.return_value = mock_exec_result

    items = get_content_items(session=db_session_mock)

    db_session_mock.exec.assert_called_once()  # Check that exec was called
    mock_exec_result.all.assert_called_once()  # Check that .all() was called on the result of exec
    assert len(items) == 0


def test_get_content_items_with_data(db_session_mock: MagicMock):
    mock_items_list = [create_mock_content_item(), create_mock_content_item()]

    mock_exec_result = MagicMock()
    mock_exec_result.all.return_value = mock_items_list
    db_session_mock.exec.return_value = mock_exec_result

    items = get_content_items(session=db_session_mock, limit=2)

    db_session_mock.exec.assert_called_once()
    mock_exec_result.all.assert_called_once()
    assert len(items) == 2
    assert items == mock_items_list


def test_update_content_item(db_session_mock: MagicMock):
    existing_item_id = uuid.uuid4()
    mock_existing_item = create_mock_content_item(item_id=existing_item_id)

    # The CRUD operation itself doesn't call session.get for update;
    # it expects the db_content_item to be passed in.
    # So, no need to mock session.get here for this particular CRUD update signature.

    update_data = {"title": "Updated Title", "summary": "Updated Summary."}

    # The update_content_item function modifies db_obj in place and returns it.
    updated_item = update_content_item(
        session=db_session_mock,
        db_content_item=mock_existing_item,
        content_item_in=update_data,
    )

    db_session_mock.add.assert_called_once_with(mock_existing_item)
    db_session_mock.commit.assert_called_once()
    db_session_mock.refresh.assert_called_once_with(mock_existing_item)

    assert updated_item.title == "Updated Title"
    assert updated_item.summary == "Updated Summary."
    assert updated_item.id == existing_item_id  # Ensure ID hasn't changed


def test_delete_content_item(db_session_mock: MagicMock):
    mock_item_to_delete = create_mock_content_item()
    item_id = mock_item_to_delete.id

    db_session_mock.get.return_value = (
        mock_item_to_delete  # Mock get to return the item
    )

    deleted_item = delete_content_item(session=db_session_mock, id=item_id)

    db_session_mock.get.assert_called_once_with(ContentItem, item_id)
    db_session_mock.delete.assert_called_once_with(mock_item_to_delete)
    db_session_mock.commit.assert_called_once()
    assert deleted_item == mock_item_to_delete


def test_delete_content_item_not_found(db_session_mock: MagicMock):
    item_id = uuid.uuid4()
    db_session_mock.get.return_value = None  # Mock get to simulate item not found

    deleted_item = delete_content_item(session=db_session_mock, id=item_id)

    db_session_mock.get.assert_called_once_with(ContentItem, item_id)
    db_session_mock.delete.assert_not_called()
    db_session_mock.commit.assert_not_called()
    assert deleted_item is None


print(
    "CRUD tests for ContentItem created in backend/app/tests/crud/test_crud_content.py"
)
