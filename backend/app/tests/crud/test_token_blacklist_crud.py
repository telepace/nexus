import uuid
from datetime import datetime, timedelta
from typing import Any
from unittest.mock import MagicMock, patch

import pytest
from sqlmodel import Session

from app import crud

# from app.models import TokenBlacklist # Will be patched in app.crud's scope or app.models' scope


@pytest.fixture
def mock_db_session():
    session = MagicMock(spec=Session)
    mock_exec_result = MagicMock()
    session.exec.return_value = mock_exec_result
    return session


@pytest.fixture
def test_user_id_for_token():
    return uuid.uuid4()


@pytest.fixture
def sample_token_data(test_user_id_for_token: uuid.UUID) -> dict[str, Any]:
    return {
        "token": "test_token_string",
        "user_id": test_user_id_for_token,
        "expires_at": datetime.utcnow() + timedelta(hours=1),
    }


# --- TokenBlacklist CRUD Tests ---


@patch("app.crud.TokenBlacklist")  # crud.create_token_blacklist imports from app.models
def test_create_token_blacklist(
    MockAppModelsTokenBlacklist: MagicMock,
    mock_db_session: MagicMock,
    sample_token_data: dict[str, Any],
):
    mock_token_blacklist_instance = MagicMock()
    MockAppModelsTokenBlacklist.return_value = mock_token_blacklist_instance

    with patch("app.crud.datetime") as mock_datetime:
        mock_datetime.utcnow.return_value = datetime(2023, 1, 1, 12, 0, 0)
        created_token_entry = crud.create_token_blacklist(
            session=mock_db_session,
            token=sample_token_data["token"],
            user_id=sample_token_data["user_id"],
            expires_at=sample_token_data["expires_at"],
        )

    MockAppModelsTokenBlacklist.assert_called_once_with(
        token=sample_token_data["token"],
        user_id=sample_token_data["user_id"],
        expires_at=sample_token_data["expires_at"],
        created_at=datetime(2023, 1, 1, 12, 0, 0),
        blacklisted_at=datetime(2023, 1, 1, 12, 0, 0),
    )
    mock_db_session.add.assert_called_once_with(mock_token_blacklist_instance)
    mock_db_session.commit.assert_called_once()
    mock_db_session.refresh.assert_called_once_with(mock_token_blacklist_instance)
    assert created_token_entry == mock_token_blacklist_instance


@patch("app.crud.TokenBlacklist")  # crud.add_token_to_blacklist imports from app.models
def test_add_token_to_blacklist(
    MockAppModelsTokenBlacklist: MagicMock,
    mock_db_session: MagicMock,
    sample_token_data: dict[str, Any],
):
    mock_token_blacklist_instance = MagicMock()
    MockAppModelsTokenBlacklist.return_value = mock_token_blacklist_instance

    with patch("app.crud.datetime") as mock_datetime:
        mock_datetime.utcnow.return_value = datetime(2023, 1, 1, 13, 0, 0)
        added_token_entry = crud.add_token_to_blacklist(
            session=mock_db_session,
            token=sample_token_data["token"],
            user_id=sample_token_data["user_id"],
            expires_at=sample_token_data["expires_at"],
        )

    MockAppModelsTokenBlacklist.assert_called_once_with(
        token=sample_token_data["token"],
        user_id=sample_token_data["user_id"],
        expires_at=sample_token_data["expires_at"],
        blacklisted_at=datetime(2023, 1, 1, 13, 0, 0),
    )
    mock_db_session.add.assert_called_once_with(mock_token_blacklist_instance)
    mock_db_session.commit.assert_called_once()
    mock_db_session.refresh.assert_called_once_with(mock_token_blacklist_instance)
    assert added_token_entry == mock_token_blacklist_instance


@patch("app.crud.select")
@patch("app.crud.TokenBlacklist")  # This is what check_token_in_blacklist imports
def test_check_token_in_blacklist_found(
    MockAppModelsTB: MagicMock,
    mock_select_crud: MagicMock,
    mock_db_session: MagicMock,
):
    mock_query_obj = MagicMock()
    mock_select_crud.return_value = mock_query_obj
    mock_db_session.exec.return_value.first.return_value = MagicMock()

    is_blacklisted = crud.check_token_in_blacklist(
        session=mock_db_session, token="test_token"
    )

    assert is_blacklisted is True
    mock_select_crud.assert_called_once_with(MockAppModelsTB)
    mock_query_obj.where.assert_called_once()


@patch("app.crud.select")
@patch("app.crud.TokenBlacklist")
def test_check_token_in_blacklist_not_found(
    MockAppModelsTB: MagicMock,
    mock_select_crud: MagicMock,
    mock_db_session: MagicMock,
):
    mock_query_obj = MagicMock()
    mock_select_crud.return_value = mock_query_obj
    mock_db_session.exec.return_value.first.return_value = None

    is_blacklisted = crud.check_token_in_blacklist(
        session=mock_db_session, token="other_token"
    )
    assert is_blacklisted is False
    mock_select_crud.assert_called_once_with(MockAppModelsTB)


@patch("app.crud.select")
@patch("app.crud.TokenBlacklist")
def test_is_token_blacklisted_found(
    MockAppModelsTB: MagicMock,
    mock_select_crud: MagicMock,
    mock_db_session: MagicMock,
    sample_token_data: dict[str, Any],
):
    mock_query_obj = MagicMock()
    mock_select_crud.return_value = mock_query_obj
    mock_db_session.exec.return_value.first.return_value = MagicMock()

    is_blacklisted = crud.is_token_blacklisted(
        session=mock_db_session, token=sample_token_data["token"]
    )

    assert is_blacklisted is True
    mock_select_crud.assert_called_once_with(MockAppModelsTB)
    mock_query_obj.where.assert_called_once()


@patch("app.crud.select")
@patch("app.crud.TokenBlacklist")
def test_is_token_blacklisted_not_found(
    _MockAppModelsTB: MagicMock,
    mock_select_crud: MagicMock,
    mock_db_session: MagicMock,
):
    mock_query_obj = MagicMock()
    mock_select_crud.return_value = mock_query_obj
    mock_db_session.exec.return_value.first.return_value = None
    is_blacklisted = crud.is_token_blacklisted(
        session=mock_db_session, token="other_token"
    )
    assert is_blacklisted is False


@patch("app.crud.select")
@patch("app.crud.TokenBlacklist")
def test_clean_expired_tokens_none_expired(
    MockAppModelsTB: MagicMock, mock_select_crud: MagicMock, mock_db_session: MagicMock
):
    mock_query_obj = MagicMock()
    mock_select_crud.return_value = mock_query_obj
    mock_db_session.exec.return_value.all.return_value = []

    # Mock the expires_at attribute to support comparison
    MockAppModelsTB.expires_at = MagicMock()
    MockAppModelsTB.expires_at.__lt__ = MagicMock(return_value=True)

    with patch("app.crud.datetime") as mock_datetime:
        mock_datetime.utcnow.return_value = datetime(2023, 1, 1, 12, 0, 0)
        count = crud.clean_expired_tokens(session=mock_db_session)

    assert count == 0
    mock_db_session.delete.assert_not_called()
    mock_db_session.commit.assert_called_once()
    mock_select_crud.assert_called_once_with(MockAppModelsTB)


@patch("app.crud.select")
@patch("app.crud.TokenBlacklist")
def test_clean_expired_tokens_some_expired(
    MockAppModelsTB: MagicMock, mock_select_crud: MagicMock, mock_db_session: MagicMock
):
    mock_query_obj = MagicMock()
    mock_select_crud.return_value = mock_query_obj
    mock_expired_token1 = MagicMock()
    mock_expired_token2 = MagicMock()
    mock_db_session.exec.return_value.all.return_value = [
        mock_expired_token1,
        mock_expired_token2,
    ]

    # Mock the expires_at attribute to support comparison
    MockAppModelsTB.expires_at = MagicMock()
    MockAppModelsTB.expires_at.__lt__ = MagicMock(return_value=True)

    with patch("app.crud.datetime") as mock_datetime:
        mock_datetime.utcnow.return_value = datetime(2023, 1, 1, 12, 0, 0)
        count = crud.clean_expired_tokens(session=mock_db_session)

    assert count == 2
    mock_db_session.delete.assert_any_call(mock_expired_token1)
    mock_db_session.delete.assert_any_call(mock_expired_token2)
    assert mock_db_session.delete.call_count == 2
    mock_db_session.commit.assert_called_once()
    mock_select_crud.assert_called_once_with(MockAppModelsTB)
