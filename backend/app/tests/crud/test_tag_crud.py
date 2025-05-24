import uuid
from unittest.mock import MagicMock, patch

import pytest
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session 

from app import crud
# from app.models import Tag # Will be patched in app.crud's scope

class MockTagCreateSchema:
    def __init__(self, name: str, description: str | None = None):
        self.name = name
        self.description = description
    def model_dump(self, exclude_unset=False):
        data = {"name": self.name}
        if self.description is not None or not exclude_unset:
            data["description"] = self.description
        return data

class MockTagUpdateSchema(MockTagCreateSchema):
    pass


@pytest.fixture
def mock_db_session():
    session = MagicMock(spec=Session)
    mock_exec_result = MagicMock()
    session.exec.return_value = mock_exec_result
    return session

# --- Tag CRUD Tests ---

@patch("app.crud.Tag") # Patch Tag in app.crud's namespace
def test_create_tag(MockTagInCrud: MagicMock, mock_db_session: MagicMock):
    tag_in_data = {"name": "Test Tag", "description": "Test Description"}
    tag_in_schema = MockTagCreateSchema(**tag_in_data)
    mock_tag_instance = MagicMock()
    MockTagInCrud.return_value = mock_tag_instance # crud.Tag(**data) returns this

    created_tag = crud.create_tag(db=mock_db_session, tag_in=tag_in_schema)

    MockTagInCrud.assert_called_once_with(**tag_in_schema.model_dump())
    mock_db_session.add.assert_called_once_with(mock_tag_instance)
    mock_db_session.commit.assert_called_once()
    mock_db_session.refresh.assert_called_once_with(mock_tag_instance)
    assert created_tag == mock_tag_instance

@patch("app.crud.Tag") 
def test_create_tag_integrity_error(MockTagInCrud: MagicMock, mock_db_session: MagicMock):
    tag_in_data = {"name": "Test Tag Fail"}
    tag_in_schema = MockTagCreateSchema(**tag_in_data)
    MockTagInCrud.return_value = MagicMock()
    mock_db_session.commit.side_effect = IntegrityError("mock_commit_tag", {}, Exception())

    with pytest.raises(IntegrityError):
      crud.create_tag(db=mock_db_session, tag_in=tag_in_schema)
    
    mock_db_session.rollback.assert_called_once() # crud.create_tag handles rollback


@patch("app.crud.Tag") 
def test_get_tag(MockTagInCrud: MagicMock, mock_db_session: MagicMock):
    tag_id = uuid.uuid4(); mock_tag_instance = MagicMock()
    mock_db_session.get.return_value = mock_tag_instance
    # crud.get_tag imports Tag from app.models, so patch app.models.Tag for this one
    with patch("app.models.Tag") as MockAppModelsTag:
      tag = crud.get_tag(db=mock_db_session, tag_id=tag_id)
      mock_db_session.get.assert_called_once_with(MockAppModelsTag, tag_id)
    assert tag == mock_tag_instance

@patch("app.models.Tag") 
def test_get_tag_not_found(MockAppModelsTag: MagicMock, mock_db_session: MagicMock):
    tag_id = uuid.uuid4(); mock_db_session.get.return_value = None 
    tag = crud.get_tag(db=mock_db_session, tag_id=tag_id)
    mock_db_session.get.assert_called_once_with(MockAppModelsTag, tag_id)
    assert tag is None

@patch("app.crud.Tag") 
@patch("app.crud.select") 
def test_get_tags_no_items(mock_select_crud: MagicMock, MockTagInCrud: MagicMock, mock_db_session: MagicMock):
    mock_query_obj = MagicMock()
    mock_select_crud.return_value = mock_query_obj
    mock_db_session.exec.return_value.all.return_value = []
    
    tags = crud.get_tags(db=mock_db_session, skip=0, limit=10)
    
    assert tags == []
    mock_select_crud.assert_called_once_with(MockTagInCrud) 
    mock_query_obj.offset.assert_called_once_with(0)
    mock_query_obj.offset.return_value.limit.assert_called_once_with(10)
    mock_db_session.exec.assert_called_once_with(mock_query_obj.offset.return_value.limit.return_value)


@patch("app.crud.Tag")
@patch("app.crud.select")
def test_get_tags_with_items(mock_select_crud: MagicMock, MockTagInCrud: MagicMock, mock_db_session: MagicMock):
    mock_query_obj = MagicMock()
    mock_select_crud.return_value = mock_query_obj
    expected_tags = [MagicMock(name="tag1"), MagicMock(name="tag2")]
    mock_db_session.exec.return_value.all.return_value = expected_tags

    tags = crud.get_tags(db=mock_db_session, skip=0, limit=10)

    assert tags == expected_tags
    mock_select_crud.assert_called_once_with(MockTagInCrud)
    mock_query_obj.offset.assert_called_once_with(0)
    mock_query_obj.offset.return_value.limit.assert_called_once_with(10)


@patch("app.crud.Tag")
@patch("app.crud.select")
def test_get_tags_pagination_skip(mock_select_crud: MagicMock, MockTagInCrud: MagicMock, mock_db_session: MagicMock):
    mock_query_obj = MagicMock()
    mock_select_crud.return_value = mock_query_obj
    expected_tags_page = [MagicMock(name="tag_5")] 
    mock_db_session.exec.return_value.all.return_value = expected_tags_page

    tags_skip = crud.get_tags(db=mock_db_session, skip=5, limit=1)
    
    assert tags_skip == expected_tags_page
    mock_select_crud.assert_called_once_with(MockTagInCrud)
    mock_query_obj.offset.assert_called_once_with(5)
    mock_query_obj.offset.return_value.limit.assert_called_once_with(1)

@patch("app.crud.Tag")
@patch("app.crud.select")
def test_get_tags_pagination_limit(mock_select_crud: MagicMock, MockTagInCrud: MagicMock, mock_db_session: MagicMock):
    mock_query_obj = MagicMock()
    mock_select_crud.return_value = mock_query_obj
    expected_tags_page = [MagicMock(name=f"tag_{i}") for i in range(5)]
    mock_db_session.exec.return_value.all.return_value = expected_tags_page
    
    tags_limit = crud.get_tags(db=mock_db_session, skip=0, limit=5)

    assert tags_limit == expected_tags_page
    mock_select_crud.assert_called_once_with(MockTagInCrud)
    mock_query_obj.offset.assert_called_once_with(0)
    mock_query_obj.offset.return_value.limit.assert_called_once_with(5)


# crud.update_tag takes the tag instance directly
def test_update_tag_success(mock_db_session: MagicMock):
    mock_existing_tag = MagicMock() 
    update_data_dict = {"name": "Updated Tag Name", "description": "Updated Desc"}
    tag_update_schema = MockTagUpdateSchema(**update_data_dict)
    updated_tag = crud.update_tag(db=mock_db_session, tag=mock_existing_tag, tag_in=tag_update_schema)
    assert mock_existing_tag.name == "Updated Tag Name"; assert mock_existing_tag.description == "Updated Desc"
    mock_db_session.add.assert_called_with(mock_existing_tag)
    mock_db_session.commit.assert_called_once(); mock_db_session.refresh.assert_called_with(mock_existing_tag)
    assert updated_tag == mock_existing_tag

def test_update_tag_integrity_error(mock_db_session: MagicMock):
    mock_existing_tag = MagicMock()
    update_data_dict = {"name": "Conflicting Name"}
    tag_update_schema = MockTagUpdateSchema(**update_data_dict)
    mock_db_session.commit.side_effect = IntegrityError("mock_update_tag_fail", {}, Exception())

    with pytest.raises(IntegrityError): # crud.update_tag does not handle IntegrityError
        crud.update_tag(db=mock_db_session, tag=mock_existing_tag, tag_in=tag_update_schema)
    
    mock_db_session.add.assert_called_once_with(mock_existing_tag) 
    mock_db_session.rollback.assert_not_called()
