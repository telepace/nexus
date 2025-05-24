import uuid
from datetime import datetime
from unittest.mock import MagicMock, patch, ANY, AsyncMock 
import asyncio 

import pytest
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session 

from app import crud
from app.core.security import verify_password, get_password_hash 
from app.models import UserCreate, UserUpdate # Import actual Pydantic models
from app.tests.utils.utils import random_email, random_lower_string


@pytest.fixture
def mock_db_session():
    session = MagicMock(spec=Session)
    mock_exec_result = MagicMock() 
    session.exec.return_value = mock_exec_result
    return session

# --- User CRUD Tests ---

@patch("app.utils.image_utils.AvatarGenerator.get_default_avatar", new_callable=AsyncMock) 
@patch("asyncio.run") 
@patch("app.crud.User") # Patch User in crud.py's scope, assuming "from app.models import User" in crud.py
def test_create_user(
    MockUserInCrud: MagicMock, 
    mock_asyncio_run: MagicMock, 
    mock_get_default_avatar: AsyncMock, 
    mock_db_session: MagicMock
):
    email = random_email(); password = random_lower_string(); full_name = random_lower_string()
    user_in_obj = UserCreate(email=email, password=password, full_name=full_name, is_superuser=False)
    
    mock_user_instance = MagicMock(id=uuid.uuid4(), email=email, full_name=full_name, avatar_url=None, is_superuser=False)
    MockUserInCrud.return_value = mock_user_instance # User(...) in crud.py returns this
    
    # crud.create_user calls asyncio.run(AvatarGenerator.get_default_avatar(...))
    # mock_get_default_avatar is the AsyncMock for AvatarGenerator.get_default_avatar
    # It will return a coroutine mock. asyncio.run should execute it.
    # We mock the final return value of asyncio.run itself.
    mock_asyncio_run.return_value = ("mock_avatar.png", "mock_etag")

    user = crud.create_user(session=mock_db_session, user_create=user_in_obj)

    assert user.email == email
    assert hasattr(user, "hashed_password") 
    assert user.is_superuser is False 
    
    # Assert that AvatarGenerator.get_default_avatar was called
    # The actual coroutine object passed to asyncio.run will be a mock if get_default_avatar is an AsyncMock
    mock_get_default_avatar.assert_called_once_with(email, str(user.id))
    # Assert that asyncio.run was called with the coroutine from mock_get_default_avatar
    mock_asyncio_run.assert_called_once_with(mock_get_default_avatar.return_value) # It's called with the coroutine mock
    
    assert user.avatar_url == "mock_avatar.png"
    mock_db_session.add.assert_any_call(user) 
    assert mock_db_session.commit.call_count == 2
    mock_db_session.refresh.assert_any_call(user)


@patch("app.crud.User") 
def test_create_user_integrity_error(MockUserInCrud: MagicMock, mock_db_session: MagicMock):
    email = random_email(); password = random_lower_string()
    user_in_obj = UserCreate(email=email, password=password)
    
    MockUserInCrud.return_value = MagicMock() 
    mock_db_session.commit.side_effect = IntegrityError("mock_user_commit_fail", {}, Exception())

    user = crud.create_user(session=mock_db_session, user_create=user_in_obj)
    
    assert user is None
    mock_db_session.rollback.assert_called_once()


@patch("app.models.User") # Patches User where model_validate is called
def test_create_user_oauth_new_user(MockAppModelsUser: MagicMock, mock_db_session: MagicMock):
    email = random_email(); full_name = "OAuth User"; google_id = "google123"
    oauth_user_data_dict = {"email": email, "full_name": full_name, "google_id": google_id, "is_active": True, "avatar_url": None}
    
    mock_validated_user = MagicMock(id=uuid.uuid4(), email=email, full_name=full_name, google_id=google_id, is_active=True, avatar_url=None)
    MockAppModelsUser.model_validate.return_value = mock_validated_user

    user = crud.create_user_oauth(session=mock_db_session, obj_in=oauth_user_data_dict)

    MockAppModelsUser.model_validate.assert_called_once_with(oauth_user_data_dict)
    mock_db_session.add.assert_any_call(mock_validated_user) 
    assert mock_db_session.commit.call_count == 2 
    mock_db_session.refresh.assert_any_call(mock_validated_user)
    assert user == mock_validated_user
    assert user.avatar_url == f"/static/avatars/{user.id}.png" 

@patch("app.models.User")
def test_create_user_oauth_with_existing_avatar(MockAppModelsUser: MagicMock, mock_db_session: MagicMock):
    email = random_email(); full_name = "OAuth User Avatar"; google_id = "google_avatar_123"
    existing_avatar_url = "http://example.com/myavatar.png"
    oauth_user_data_dict = {"email": email, "full_name": full_name, "google_id": google_id, "is_active": True, "avatar_url": existing_avatar_url}
    
    mock_validated_user = MagicMock(id=uuid.uuid4(), email=email, avatar_url=existing_avatar_url)
    MockAppModelsUser.model_validate.return_value = mock_validated_user

    user = crud.create_user_oauth(session=mock_db_session, obj_in=oauth_user_data_dict)
    
    assert user.avatar_url == existing_avatar_url 
    mock_db_session.add.assert_called_once_with(mock_validated_user) 
    mock_db_session.commit.assert_called_once() 
    mock_db_session.refresh.assert_called_once_with(mock_validated_user)


@patch("app.crud.select") 
@patch("app.crud.User") # User in crud's global scope for select(User)
def test_authenticate_user(MockUserInCrud: MagicMock, mock_select_crud: MagicMock, mock_db_session: MagicMock):
    email = random_email(); password = random_lower_string()
    mock_user = MagicMock(email=email, hashed_password=get_password_hash(password))
    
    mock_query_obj = MagicMock(); mock_select_crud.return_value = mock_query_obj
    mock_db_session.exec.return_value.first.return_value = mock_user
    
    authenticated_user = crud.authenticate(session=mock_db_session, email=email, password=password)
    
    assert authenticated_user is not None; assert authenticated_user.email == email
    mock_select_crud.assert_called_once_with(MockUserInCrud) 

@patch("app.crud.select")
@patch("app.crud.User") 
def test_authenticate_user_no_user(MockUserInCrud: MagicMock, mock_select_crud: MagicMock, mock_db_session: MagicMock):
    mock_query_obj = MagicMock(); mock_select_crud.return_value = mock_query_obj
    mock_db_session.exec.return_value.first.return_value = None 
    authenticated_user = crud.authenticate(session=mock_db_session, email="no@user.com", password="any")
    assert authenticated_user is None

@patch("app.crud.select")
@patch("app.crud.User") 
def test_authenticate_user_wrong_password(MockUserInCrud: MagicMock, mock_select_crud: MagicMock, mock_db_session: MagicMock):
    email = random_email(); password = random_lower_string(); wrong_password = "wrongpassword"
    mock_user = MagicMock(email=email, hashed_password=get_password_hash(password))
    mock_query_obj = MagicMock(); mock_select_crud.return_value = mock_query_obj
    mock_db_session.exec.return_value.first.return_value = mock_user
    
    authenticated_user = crud.authenticate(session=mock_db_session, email=email, password=wrong_password)
    assert authenticated_user is None

@patch("app.crud.select")
@patch("app.crud.User") 
def test_get_user_by_email(MockUserInCrud: MagicMock, mock_select_crud: MagicMock, mock_db_session: MagicMock):
    email = random_email(); mock_user_instance = MagicMock()
    mock_query_obj = MagicMock(); mock_select_crud.return_value = mock_query_obj
    mock_db_session.exec.return_value.first.return_value = mock_user_instance
    
    user = crud.get_user_by_email(session=mock_db_session, email=email)
    assert user == mock_user_instance
    mock_select_crud.assert_called_once_with(MockUserInCrud)


@patch("app.crud.select")
@patch("app.models.User") # crud.get_user_by_google_id dynamically imports User from app.models
def test_get_user_by_google_id(MockAppModelsUser: MagicMock, mock_select_crud: MagicMock, mock_db_session: MagicMock):
    google_id = "google_id_123"; mock_user_instance = MagicMock()
    mock_query_obj = MagicMock(); mock_select_crud.return_value = mock_query_obj
    mock_db_session.exec.return_value.first.return_value = mock_user_instance
    
    user = crud.get_user_by_google_id(session=mock_db_session, google_id=google_id)
    assert user == mock_user_instance
    mock_select_crud.assert_called_once_with(MockAppModelsUser)
    mock_query_obj.where.assert_called_once() 


@patch("app.crud.select")
@patch("app.models.User") 
def test_get_user_by_google_id_not_found(MockAppModelsUser: MagicMock, mock_select_crud: MagicMock, mock_db_session: MagicMock):
    mock_query_obj = MagicMock(); mock_select_crud.return_value = mock_query_obj
    mock_db_session.exec.return_value.first.return_value = None
    user = crud.get_user_by_google_id(session=mock_db_session, google_id="nonexistent_gid")
    assert user is None


@patch("app.utils.image_utils.AvatarGenerator.get_default_avatar", new_callable=AsyncMock)
@patch("asyncio.run") 
@patch("app.crud.User") 
def test_check_if_user_is_active(
    MockUserInCrud: MagicMock, mock_asyncio_run: MagicMock, mock_get_default_avatar: AsyncMock, mock_db_session: MagicMock
):
    email = random_email(); password = random_lower_string()
    user_in = UserCreate(email=email, password=password) 
    
    mock_user_instance = MagicMock(id=uuid.uuid4(), email=email, is_active=True, is_superuser=False) 
    MockUserInCrud.return_value = mock_user_instance
    mock_get_default_avatar.return_value = ("mock_avatar.png", "mock_etag")
    mock_asyncio_run.return_value = ("mock_avatar.png", "mock_etag")
    
    user = crud.create_user(session=mock_db_session, user_create=user_in)
    assert user.is_active is True 

@patch("app.utils.image_utils.AvatarGenerator.get_default_avatar", new_callable=AsyncMock)
@patch("asyncio.run") 
@patch("app.crud.User") 
def test_check_if_user_is_superuser(
    MockUserInCrud: MagicMock, mock_asyncio_run: MagicMock, mock_get_default_avatar: AsyncMock, mock_db_session: MagicMock
):
    email = random_email(); password = random_lower_string()
    user_in_superuser = UserCreate(email=email, password=password, is_superuser=True)
    
    mock_user_instance_superuser = MagicMock(id=uuid.uuid4(), email=email, is_active=True, is_superuser=True)
    
    def user_constructor_side_effect(**kwargs):
        instance = MagicMock(id=uuid.uuid4())
        for k,v in kwargs.items(): setattr(instance, k, v)
        if 'is_active' not in kwargs: instance.is_active = True 
        return instance
        
    MockUserInCrud.side_effect = user_constructor_side_effect
    mock_get_default_avatar.return_value = ("mock_avatar.png", "mock_etag")
    mock_asyncio_run.return_value = ("mock_avatar.png", "mock_etag")
    
    user = crud.create_user(session=mock_db_session, user_create=user_in_superuser)
    assert user.is_superuser is True


@patch("app.models.User") 
def test_get_user(MockAppModelsUser: MagicMock, mock_db_session: MagicMock):
    user_id = uuid.uuid4(); mock_user_instance = MagicMock()
    mock_db_session.get.return_value = mock_user_instance
    user = crud.get_user(session=mock_db_session, user_id=user_id)
    mock_db_session.get.assert_called_once_with(MockAppModelsUser, user_id)
    assert user == mock_user_instance


@patch("app.core.security.get_password_hash") 
def test_update_user_password_change(mock_get_password_hash: MagicMock, mock_db_session: MagicMock):
    mock_db_user = MagicMock(id=uuid.uuid4(), email=random_email())
    new_password = random_lower_string(); new_full_name = "Updated Name"
    mock_get_password_hash.return_value = "new_hashed_password"
    
    user_in_update_schema = UserUpdate(password=new_password, full_name=new_full_name)

    updated_user = crud.update_user(session=mock_db_session, db_user=mock_db_user, user_in=user_in_update_schema)

    assert mock_db_user.full_name == new_full_name
    mock_get_password_hash.assert_called_once_with(new_password)
    assert mock_db_user.hashed_password == "new_hashed_password"
    assert updated_user == mock_db_user

def test_update_user_no_password_change(mock_db_session: MagicMock):
    mock_db_user = MagicMock(id=uuid.uuid4(), email=random_email(), hashed_password="old_hash")
    original_hash = mock_db_user.hashed_password
    user_in_update_schema = UserUpdate(full_name="New Full Name Only")

    with patch("app.core.security.get_password_hash") as mock_get_pw_hash:
        crud.update_user(session=mock_db_session, db_user=mock_db_user, user_in=user_in_update_schema)
        mock_get_pw_hash.assert_not_called() 
    
    assert mock_db_user.full_name == "New Full Name Only"
    assert mock_db_user.hashed_password == original_hash

# --- Generic CRUD tests via User model ---
@patch("app.crud.select") 
def test_generic_get_multi_users(mock_select_crud: MagicMock, mock_db_session: MagicMock):
    from app.models import User # Use actual User model for select
    mock_query_obj = MagicMock(); mock_select_crud.return_value = mock_query_obj
    mock_users = [MagicMock(), MagicMock()]
    mock_db_session.exec.return_value.all.return_value = mock_users
    
    users = crud.get_multi(session=mock_db_session, model=User, skip=0, limit=10)
    
    assert users == mock_users
    mock_select_crud.assert_called_once_with(User)


def test_generic_delete_user_found(mock_db_session: MagicMock):
    from app.models import User
    user_id = uuid.uuid4(); mock_user_instance = MagicMock()
    mock_db_session.get.return_value = mock_user_instance
    deleted_user = crud.delete(session=mock_db_session, model=User, id=user_id)
    mock_db_session.get.assert_called_once_with(User, user_id)
    mock_db_session.delete.assert_called_once_with(mock_user_instance)
    mock_db_session.commit.assert_called_once()
    assert deleted_user == mock_user_instance

def test_generic_delete_user_not_found(mock_db_session: MagicMock):
    from app.models import User
    user_id = uuid.uuid4(); mock_db_session.get.return_value = None 
    deleted_user = crud.delete(session=mock_db_session, model=User, id=user_id)
    mock_db_session.get.assert_called_once_with(User, user_id)
    mock_db_session.delete.assert_not_called()
    assert deleted_user is None
