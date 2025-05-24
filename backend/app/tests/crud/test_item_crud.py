import uuid
from unittest.mock import MagicMock, patch

import pytest
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session

from app import crud

# from app.models import Item # Will be patched in app.crud's scope or app.models' scope

class MockItemCreateSchema:
    def __init__(self, title: str, description: str | None = None):
        self.title = title
        self.description = description
    def model_dump(self, exclude_unset=False):
        data = {"title": self.title}
        if self.description is not None or not exclude_unset:
            data["description"] = self.description
        return data

class MockItemUpdateSchema(MockItemCreateSchema):
    pass


@pytest.fixture
def mock_db_session():
    session = MagicMock(spec=Session)
    mock_exec_result = MagicMock()
    session.exec.return_value = mock_exec_result
    return session

@pytest.fixture
def test_owner_id():
    return uuid.uuid4()

# --- Item CRUD Tests ---

@patch("app.models.Item") # crud.create_item imports Item from app.models
def test_create_item(MockItemModelInAppModels: MagicMock, mock_db_session: MagicMock, test_owner_id: uuid.UUID):
    item_in_data = {"title": "Test Item", "description": "Test Description"}
    item_in_schema = MockItemCreateSchema(**item_in_data)
    mock_item_instance = MagicMock()
    MockItemModelInAppModels.return_value = mock_item_instance

    created_item = crud.create_item(session=mock_db_session, item_in=item_in_schema, owner_id=test_owner_id)

    MockItemModelInAppModels.assert_called_once_with(**item_in_schema.model_dump(), owner_id=test_owner_id)
    mock_db_session.add.assert_called_once_with(mock_item_instance)
    mock_db_session.commit.assert_called_once()
    mock_db_session.refresh.assert_called_once_with(mock_item_instance)
    assert created_item == mock_item_instance

@patch("app.models.Item")
def test_create_item_integrity_error(MockItemModelInAppModels: MagicMock, mock_db_session: MagicMock, test_owner_id: uuid.UUID):
    item_in_data = {"title": "Test Item Fail", "description": "Test Description"}
    item_in_schema = MockItemCreateSchema(**item_in_data)

    MockItemModelInAppModels.return_value = MagicMock()
    mock_db_session.commit.side_effect = IntegrityError("mock_commit", {}, Exception())

    with pytest.raises(IntegrityError):
        crud.create_item(session=mock_db_session, item_in=item_in_schema, owner_id=test_owner_id)

    mock_db_session.rollback.assert_not_called() # crud.create_item does not handle rollback


@patch("app.models.Item")
def test_get_item(MockItemModelInAppModels: MagicMock, mock_db_session: MagicMock):
    item_id = uuid.uuid4(); mock_item_instance = MagicMock()
    mock_db_session.get.return_value = mock_item_instance
    # crud.get_item imports Item from app.models
    item = crud.get_item(session=mock_db_session, id=item_id)
    mock_db_session.get.assert_called_once_with(MockItemModelInAppModels, item_id)
    assert item == mock_item_instance

@patch("app.models.Item")
def test_get_item_not_found(MockItemModelInAppModels: MagicMock, mock_db_session: MagicMock):
    item_id = uuid.uuid4(); mock_db_session.get.return_value = None
    item = crud.get_item(session=mock_db_session, id=item_id)
    mock_db_session.get.assert_called_once_with(MockItemModelInAppModels, item_id)
    assert item is None


@patch("app.crud.Item") # Patch Item in app.crud's namespace for select(Item)
@patch("app.crud.select")
def test_get_items_no_owner_no_items(mock_select_crud: MagicMock, MockItemInCrud: MagicMock, mock_db_session: MagicMock):
    mock_query_obj = MagicMock()
    mock_select_crud.return_value = mock_query_obj
    mock_db_session.exec.return_value.all.return_value = []

    items = crud.get_items(session=mock_db_session, skip=0, limit=10)

    assert items == []
    mock_select_crud.assert_called_once_with(MockItemInCrud)
    mock_db_session.exec.assert_called_once_with(mock_query_obj)

@patch("app.crud.Item")
@patch("app.crud.select")
def test_get_items_with_owner_items_found(mock_select_crud: MagicMock, MockItemInCrud: MagicMock, mock_db_session: MagicMock, test_owner_id: uuid.UUID):
    mock_query_obj = MagicMock()
    mock_select_crud.return_value = mock_query_obj
    mock_item1 = MagicMock(); mock_item2 = MagicMock()
    mock_db_session.exec.return_value.all.return_value = [mock_item1, mock_item2]

    items = crud.get_items(session=mock_db_session, owner_id=test_owner_id, skip=0, limit=10)

    assert items == [mock_item1, mock_item2]
    mock_select_crud.assert_called_once_with(MockItemInCrud)
    mock_query_obj.where.assert_called_once()
    # To check the where clause:
    # args, _ = mock_query_obj.where.call_args
    # assert args[0].left is MockItemInCrud.owner_id  # This requires MockItemInCrud.owner_id to be a mock attribute
    # assert args[0].right.value == test_owner_id
    mock_db_session.exec.assert_called_once_with(mock_query_obj.where.return_value)


@patch("app.crud.Item")
@patch("app.crud.select")
def test_get_items_pagination_skip(mock_select_crud: MagicMock, MockItemInCrud: MagicMock, mock_db_session: MagicMock):
    mock_query_obj = MagicMock()
    mock_select_crud.return_value = mock_query_obj
    all_items = [MagicMock(name=f"item_{i}") for i in range(20)]
    mock_db_session.exec.return_value.all.return_value = all_items

    items_skip = crud.get_items(session=mock_db_session, skip=5, limit=10)
    assert items_skip == all_items[5:15]
    mock_select_crud.assert_called_once_with(MockItemInCrud)

@patch("app.crud.Item")
@patch("app.crud.select")
def test_get_items_pagination_limit(mock_select_crud: MagicMock, MockItemInCrud: MagicMock, mock_db_session: MagicMock):
    mock_query_obj = MagicMock()
    mock_select_crud.return_value = mock_query_obj
    all_items = [MagicMock(name=f"item_{i}") for i in range(20)]
    mock_db_session.exec.return_value.all.return_value = all_items

    items_limit = crud.get_items(session=mock_db_session, skip=0, limit=5)
    assert items_limit == all_items[0:5]
    mock_select_crud.assert_called_once_with(MockItemInCrud)


# crud.update_item takes the item instance directly, no model patching needed for Item itself here
def test_update_item_success(mock_db_session: MagicMock):
    mock_existing_item = MagicMock()
    update_data_dict = {"title": "Updated Title", "description": "Updated Desc"}
    item_update_schema = MockItemUpdateSchema(**update_data_dict)

    updated_item = crud.update_item(session=mock_db_session, item=mock_existing_item, item_in=item_update_schema)

    assert mock_existing_item.title == "Updated Title"
    assert mock_existing_item.description == "Updated Desc"
    mock_db_session.add.assert_called_with(mock_existing_item)
    mock_db_session.commit.assert_called_once(); mock_db_session.refresh.assert_called_with(mock_existing_item)
    assert updated_item == mock_existing_item


def test_delete_item_success(mock_db_session: MagicMock):
    mock_item_to_delete = MagicMock()
    deleted_item = crud.delete_item(session=mock_db_session, item=mock_item_to_delete)
    mock_db_session.delete.assert_called_once_with(mock_item_to_delete)
    mock_db_session.commit.assert_called_once()
    assert deleted_item == mock_item_to_delete

# For generic crud.delete, we pass the actual model Item
# Patch app.crud.Item if crud.delete dynamically imports Item. It does not; model is an arg.
def test_generic_delete_item_found(mock_db_session: MagicMock):
    from app.models import Item  # Use actual Item for model=Item
    item_id = uuid.uuid4(); mock_item_instance = MagicMock()
    mock_db_session.get.return_value = mock_item_instance
    deleted_item = crud.delete(session=mock_db_session, model=Item, id=item_id)
    mock_db_session.get.assert_called_once_with(Item, item_id)
    mock_db_session.delete.assert_called_once_with(mock_item_instance)
    mock_db_session.commit.assert_called_once()
    assert deleted_item == mock_item_instance

def test_generic_delete_item_not_found(mock_db_session: MagicMock):
    from app.models import Item
    item_id = uuid.uuid4(); mock_db_session.get.return_value = None
    deleted_item = crud.delete(session=mock_db_session, model=Item, id=item_id)
    mock_db_session.get.assert_called_once_with(Item, item_id)
    mock_db_session.delete.assert_not_called()
    mock_db_session.commit.assert_not_called()
    assert deleted_item is None
