import uuid
from unittest.mock import MagicMock, patch

import pytest
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session

from app import crud


class MockDbModel:
    def __init__(self, **kwargs):
        for key, value in kwargs.items():
            setattr(self, key, value)

    # For SQLModel/SQLAlchemy compatibility in select() if not patching select itself
    metadata = MagicMock()
    __table__ = MagicMock()
    __tablename__ = "mock_db_model"  # Often useful for SQLModel/SQLAlchemy internals


class MockCreateSchema:
    def __init__(self, name: str, value: int):
        self.name = name
        self.value = value

    def model_dump(self, **kwargs):
        return {"name": self.name, "value": self.value}


class MockUpdateSchema:
    def __init__(self, name: str | None = None, value: int | None = None):
        self.name = name
        self.value = value

    def model_dump(self, exclude_unset=False, **kwargs):
        data = {}
        if exclude_unset:
            if self.name is not None:
                data["name"] = self.name
            if self.value is not None:
                data["value"] = self.value
        else:
            data["name"] = (
                self.name
            )  # Will include None if not exclude_unset and value is None
            data["value"] = self.value
        return data


@pytest.fixture
def mock_db_session():
    session = MagicMock(spec=Session)
    mock_exec_result = MagicMock()
    session.exec.return_value = mock_exec_result
    return session


# --- Generic CRUD Function Tests ---


def test_generic_get_by_id_found(mock_db_session: MagicMock):
    obj_id = uuid.uuid4()
    mock_instance = MockDbModel(id=obj_id, name="Test")
    mock_db_session.get.return_value = mock_instance
    result = crud.get_by_id(session=mock_db_session, model=MockDbModel, id=obj_id)
    mock_db_session.get.assert_called_once_with(MockDbModel, obj_id)
    assert result == mock_instance


def test_generic_get_by_id_not_found(mock_db_session: MagicMock):
    obj_id = uuid.uuid4()
    mock_db_session.get.return_value = None
    result = crud.get_by_id(session=mock_db_session, model=MockDbModel, id=obj_id)
    mock_db_session.get.assert_called_once_with(MockDbModel, obj_id)
    assert result is None


@patch("app.crud.select")
def test_generic_get_multi(mock_select_crud: MagicMock, mock_db_session: MagicMock):
    mock_query_obj = MagicMock()
    mock_select_crud.return_value = mock_query_obj
    mock_instances = [MockDbModel(id=uuid.uuid4()), MockDbModel(id=uuid.uuid4())]
    mock_db_session.exec.return_value.all.return_value = mock_instances

    results = crud.get_multi(
        session=mock_db_session, model=MockDbModel, skip=0, limit=10
    )

    mock_select_crud.assert_called_once_with(MockDbModel)
    mock_query_obj.offset.assert_called_once_with(0)
    mock_query_obj.offset.return_value.limit.assert_called_once_with(10)
    mock_db_session.exec.assert_called_once_with(
        mock_query_obj.offset.return_value.limit.return_value
    )
    mock_db_session.exec.return_value.all.assert_called_once_with()
    assert results == mock_instances


@patch("app.crud.select")
def test_generic_get_multi_with_skip_limit(
    mock_select_crud: MagicMock, mock_db_session: MagicMock
):
    mock_query_obj = MagicMock()
    mock_select_crud.return_value = mock_query_obj
    mock_db_session.exec.return_value.all.return_value = [MagicMock()]
    crud.get_multi(session=mock_db_session, model=MockDbModel, skip=5, limit=15)
    mock_select_crud.assert_called_once_with(MockDbModel)
    mock_query_obj.offset.assert_called_once_with(5)
    mock_query_obj.offset.return_value.limit.assert_called_once_with(15)


def test_generic_create_success(mock_db_session: MagicMock):
    create_schema = MockCreateSchema(name="New Object", value=123)
    mock_created_instance = MagicMock()

    # Patch the MockDbModel class *as used by crud.create*
    # crud.create takes `model: type[ModelType]`
    # If we pass MockDbModel, it uses MockDbModel.
    # The instantiation `obj = model(**obj_in.model_dump())` happens inside.
    # We need to control what `MockDbModel(...)` returns.
    # So, we patch `MockDbModel` in the scope of *this test file* if `crud.create` uses it directly.
    with patch(
        f"{__name__}.MockDbModel", return_value=mock_created_instance
    ) as PatchedMockDbModelForCreate:
        created_obj = crud.create(
            session=mock_db_session,
            model=PatchedMockDbModelForCreate,
            obj_in=create_schema,
        )

    PatchedMockDbModelForCreate.assert_called_once_with(**create_schema.model_dump())
    mock_db_session.add.assert_called_once_with(mock_created_instance)
    mock_db_session.commit.assert_called_once()
    mock_db_session.refresh.assert_called_once_with(mock_created_instance)
    assert created_obj == mock_created_instance


def test_generic_create_integrity_error(mock_db_session: MagicMock):
    create_schema = MockCreateSchema(name="Fail Object", value=456)
    mock_db_session.commit.side_effect = IntegrityError(
        "mock_generic_commit_fail", {}, Exception()
    )
    with (
        patch(
            f"{__name__}.MockDbModel", return_value=MagicMock()
        ) as PatchedMockDbModelForCreate,
        pytest.raises(IntegrityError),
    ):
        crud.create(
            session=mock_db_session,
            model=PatchedMockDbModelForCreate,
            obj_in=create_schema,
        )
    mock_db_session.rollback.assert_called_once()


def test_generic_update_found_and_success(mock_db_session: MagicMock):
    obj_id = uuid.uuid4()
    mock_existing_obj = MockDbModel(id=obj_id, name="Old Name", value=100)
    mock_db_session.get.return_value = mock_existing_obj
    update_schema = MockUpdateSchema(name="Updated Name", value=101)
    updated_obj = crud.update(
        session=mock_db_session, model=MockDbModel, id=obj_id, obj_in=update_schema
    )
    mock_db_session.get.assert_called_once_with(MockDbModel, obj_id)
    assert mock_existing_obj.name == "Updated Name"
    assert mock_existing_obj.value == 101
    mock_db_session.add.assert_called_once_with(mock_existing_obj)
    mock_db_session.commit.assert_called_once()
    mock_db_session.refresh.assert_called_once_with(mock_existing_obj)
    assert updated_obj == mock_existing_obj


def test_generic_update_partial(mock_db_session: MagicMock):
    obj_id = uuid.uuid4()
    mock_existing_obj = MockDbModel(id=obj_id, name="Old Name", value=100)
    mock_db_session.get.return_value = mock_existing_obj
    update_schema = MockUpdateSchema(name="Updated Name Only")  # Only name is updated
    updated_obj = crud.update(
        session=mock_db_session, model=MockDbModel, id=obj_id, obj_in=update_schema
    )
    assert mock_existing_obj.name == "Updated Name Only"
    assert mock_existing_obj.value == 100
    mock_db_session.add.assert_called_once_with(mock_existing_obj)
    assert updated_obj == mock_existing_obj


def test_generic_update_not_found(mock_db_session: MagicMock):
    obj_id = uuid.uuid4()
    mock_db_session.get.return_value = None
    update_schema = MockUpdateSchema(name="Any Update")
    updated_obj = crud.update(
        session=mock_db_session, model=MockDbModel, id=obj_id, obj_in=update_schema
    )
    mock_db_session.get.assert_called_once_with(MockDbModel, obj_id)
    mock_db_session.add.assert_not_called()
    mock_db_session.commit.assert_not_called()
    assert updated_obj is None


def test_generic_update_integrity_error(mock_db_session: MagicMock):
    obj_id = uuid.uuid4()
    mock_existing_obj = MockDbModel(id=obj_id, name="Old Name")
    mock_db_session.get.return_value = mock_existing_obj
    mock_db_session.commit.side_effect = IntegrityError(
        "mock_generic_update_commit_fail", {}, Exception()
    )
    update_schema = MockUpdateSchema(name="Update Fail")
    with pytest.raises(IntegrityError):
        crud.update(
            session=mock_db_session, model=MockDbModel, id=obj_id, obj_in=update_schema
        )
    mock_db_session.rollback.assert_called_once()


def test_generic_delete_found(mock_db_session: MagicMock):
    obj_id = uuid.uuid4()
    mock_instance = MockDbModel(id=obj_id)
    mock_db_session.get.return_value = mock_instance
    deleted_obj = crud.delete(session=mock_db_session, model=MockDbModel, id=obj_id)
    mock_db_session.get.assert_called_once_with(MockDbModel, obj_id)
    mock_db_session.delete.assert_called_once_with(mock_instance)
    mock_db_session.commit.assert_called_once()
    assert deleted_obj == mock_instance


def test_generic_delete_not_found(mock_db_session: MagicMock):
    obj_id = uuid.uuid4()
    mock_db_session.get.return_value = None
    deleted_obj = crud.delete(session=mock_db_session, model=MockDbModel, id=obj_id)
    mock_db_session.get.assert_called_once_with(MockDbModel, obj_id)
    mock_db_session.delete.assert_not_called()
    mock_db_session.commit.assert_not_called()
    assert deleted_obj is None
