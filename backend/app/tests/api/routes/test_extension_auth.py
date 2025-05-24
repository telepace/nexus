from datetime import timedelta
from unittest.mock import MagicMock, patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from jwt.exceptions import InvalidTokenError

from app.core.config import settings
from app.core import security 
from app.api.routes.extension_auth import router as extension_auth_router
from app.api.deps import get_db 

# Define UserPublic and Token structures for mocking
EXAMPLE_USER_PUBLIC_DICT = {
    "id": "some_id", "email": "some@example.com", "full_name": "Some User",
    "is_active": True, "avatar_url": None
}

@pytest.fixture
def mock_db_session_fixture():
    session = MagicMock()
    return session

@pytest.fixture(scope="module")
def app_for_extension_auth():
    app = FastAPI()
    app.include_router(extension_auth_router, prefix=settings.API_V1_STR)
    return app

# --- Tests for GET /extension/auth/status ---

@patch("app.models.UserPublic")
@patch("app.models.User")
@patch("app.api.deps.get_db") 
@patch("app.api.routes.extension_auth.jwt")
def test_check_status_auth_header_valid_user(
    mock_jwt: MagicMock, 
    mock_get_db_patch: MagicMock, 
    MockUserModel: MagicMock, 
    MockUserPublicModel: MagicMock, 
    app_for_extension_auth: FastAPI, 
    mock_db_session_fixture: MagicMock
):
    mock_get_db_patch.return_value = mock_db_session_fixture
    app_for_extension_auth.dependency_overrides[get_db] = lambda: mock_db_session_fixture
    
    user_id = "testuser1"
    mock_user_instance = MagicMock()
    mock_user_instance.id = user_id
    mock_user_instance.is_active = True
    mock_user_instance.email = "test@example.com"
    mock_user_instance.full_name = "Test User"
    mock_user_instance.avatar_url = None

    mock_user_public_dict = EXAMPLE_USER_PUBLIC_DICT.copy()
    mock_user_public_dict.update({"id": user_id, "email": "test@example.com", "full_name": "Test User"})
    MockUserPublicModel.model_validate.return_value = mock_user_public_dict
        
    mock_jwt.decode.return_value = {"sub": user_id}
    mock_db_session_fixture.get.return_value = mock_user_instance

    with TestClient(app_for_extension_auth) as client:
        response = client.get(
            f"{settings.API_V1_STR}/extension/auth/status",
            headers={"Authorization": "Bearer validtoken"}
        )
    
    assert response.status_code == 200
    data = response.json()
    assert data["authenticated"] is True
    assert data["user"] == mock_user_public_dict
    mock_jwt.decode.assert_called_once_with("validtoken", settings.SECRET_KEY, algorithms=[security.ALGORITHM])
    mock_db_session_fixture.get.assert_called_once_with(MockUserModel, user_id)
    
    del app_for_extension_auth.dependency_overrides[get_db]


@patch("app.models.UserPublic")
@patch("app.models.User")
@patch("app.api.deps.get_db")
@patch("app.api.routes.extension_auth.jwt")
def test_check_status_cookie_valid_user(
    mock_jwt: MagicMock, mock_get_db_patch: MagicMock, MockUserModel: MagicMock, MockUserPublicModel: MagicMock, 
    app_for_extension_auth: FastAPI, mock_db_session_fixture: MagicMock
):
    mock_get_db_patch.return_value = mock_db_session_fixture
    user_id = "testuser2"
    mock_user_instance = MagicMock()
    mock_user_instance.id = user_id
    mock_user_instance.is_active = True
    mock_user_instance.email = "cookieuser@example.com"
    mock_user_instance.full_name = "Cookie User"
    mock_user_instance.avatar_url = None

    mock_user_public_dict = EXAMPLE_USER_PUBLIC_DICT.copy()
    mock_user_public_dict.update({"id": user_id, "email": "cookieuser@example.com", "full_name": "Cookie User"})
    MockUserPublicModel.model_validate.return_value = mock_user_public_dict
    
    mock_jwt.decode.return_value = {"sub": user_id}
    mock_db_session_fixture.get.return_value = mock_user_instance
        
    app_for_extension_auth.dependency_overrides[get_db] = lambda: mock_db_session_fixture
    with TestClient(app_for_extension_auth) as client:
        response = client.get(
            f"{settings.API_V1_STR}/extension/auth/status",
            cookies={"accessToken": "validcookietoken"}
        )
    del app_for_extension_auth.dependency_overrides[get_db]

    assert response.status_code == 200
    data = response.json()
    assert data["authenticated"] is True
    assert data["user"] == mock_user_public_dict
    mock_jwt.decode.assert_called_once_with("validcookietoken", settings.SECRET_KEY, algorithms=[security.ALGORITHM])
    mock_db_session_fixture.get.assert_called_once_with(MockUserModel, user_id)

@patch("app.api.deps.get_db")
def test_check_status_no_token(mock_get_db_patch: MagicMock, app_for_extension_auth: FastAPI, mock_db_session_fixture: MagicMock):
    mock_get_db_patch.return_value = mock_db_session_fixture
    app_for_extension_auth.dependency_overrides[get_db] = lambda: mock_db_session_fixture
    with TestClient(app_for_extension_auth) as client:
        response = client.get(f"{settings.API_V1_STR}/extension/auth/status")
    del app_for_extension_auth.dependency_overrides[get_db]
    assert response.status_code == 200
    assert response.json() == {"authenticated": False}

@patch("app.api.deps.get_db")
@patch("app.api.routes.extension_auth.jwt")
def test_check_status_invalid_header_token(mock_jwt: MagicMock, mock_get_db_patch: MagicMock, app_for_extension_auth: FastAPI, mock_db_session_fixture: MagicMock):
    mock_get_db_patch.return_value = mock_db_session_fixture
    mock_jwt.decode.side_effect = InvalidTokenError("Invalid header token")
    
    app_for_extension_auth.dependency_overrides[get_db] = lambda: mock_db_session_fixture
    with TestClient(app_for_extension_auth) as client:
        response = client.get(
            f"{settings.API_V1_STR}/extension/auth/status",
            headers={"Authorization": "Bearer invalidtoken"}
        )
    del app_for_extension_auth.dependency_overrides[get_db]
    
    assert response.status_code == 200
    data = response.json()
    assert data["authenticated"] is False
    assert "Invalid header token" in data["error"]

@patch("app.api.deps.get_db")
@patch("app.api.routes.extension_auth.jwt")
def test_check_status_invalid_cookie_token(mock_jwt: MagicMock, mock_get_db_patch: MagicMock, app_for_extension_auth: FastAPI, mock_db_session_fixture: MagicMock):
    mock_get_db_patch.return_value = mock_db_session_fixture
    mock_jwt.decode.side_effect = InvalidTokenError("Invalid cookie token")

    app_for_extension_auth.dependency_overrides[get_db] = lambda: mock_db_session_fixture
    with TestClient(app_for_extension_auth) as client:
        response = client.get(
            f"{settings.API_V1_STR}/extension/auth/status",
            cookies={"accessToken": "invalidcookietoken"}
        )
    del app_for_extension_auth.dependency_overrides[get_db]

    assert response.status_code == 200
    data = response.json()
    assert data["authenticated"] is False
    assert "Invalid cookie token" in data["error"]

@patch("app.models.User")
@patch("app.api.deps.get_db")
@patch("app.api.routes.extension_auth.jwt")
def test_check_status_user_not_found_header(mock_jwt: MagicMock, mock_get_db_patch: MagicMock, MockUserModel: MagicMock, app_for_extension_auth: FastAPI, mock_db_session_fixture: MagicMock):
    mock_get_db_patch.return_value = mock_db_session_fixture
    mock_jwt.decode.return_value = {"sub": "nonexistentuser"}
    mock_db_session_fixture.get.return_value = None 
    
    app_for_extension_auth.dependency_overrides[get_db] = lambda: mock_db_session_fixture
    with TestClient(app_for_extension_auth) as client:
        response = client.get(
            f"{settings.API_V1_STR}/extension/auth/status",
            headers={"Authorization": "Bearer validtoken"}
        )
    del app_for_extension_auth.dependency_overrides[get_db]

    assert response.status_code == 200
    assert response.json() == {"authenticated": False}
    mock_db_session_fixture.get.assert_called_with(MockUserModel, "nonexistentuser")


@patch("app.models.User")
@patch("app.api.deps.get_db")
@patch("app.api.routes.extension_auth.jwt")
def test_check_status_user_inactive_header(mock_jwt: MagicMock, mock_get_db_patch: MagicMock, MockUserModel: MagicMock, app_for_extension_auth: FastAPI, mock_db_session_fixture: MagicMock):
    mock_get_db_patch.return_value = mock_db_session_fixture
    mock_user_inactive = MagicMock()
    mock_user_inactive.is_active = False
    mock_jwt.decode.return_value = {"sub": "inactiveuser"}
    mock_db_session_fixture.get.return_value = mock_user_inactive
    
    app_for_extension_auth.dependency_overrides[get_db] = lambda: mock_db_session_fixture
    with TestClient(app_for_extension_auth) as client:
        response = client.get(
            f"{settings.API_V1_STR}/extension/auth/status",
            headers={"Authorization": "Bearer validtoken"}
        )
    del app_for_extension_auth.dependency_overrides[get_db]

    assert response.status_code == 200
    assert response.json() == {"authenticated": False}
    mock_db_session_fixture.get.assert_called_with(MockUserModel, "inactiveuser")

@patch("app.api.deps.get_db")
@patch("app.api.routes.extension_auth.jwt")
def test_check_status_general_exception_on_decode(mock_jwt: MagicMock, mock_get_db_patch: MagicMock, app_for_extension_auth: FastAPI, mock_db_session_fixture: MagicMock):
    mock_get_db_patch.return_value = mock_db_session_fixture
    mock_jwt.decode.side_effect = Exception("Something unexpected happened")

    app_for_extension_auth.dependency_overrides[get_db] = lambda: mock_db_session_fixture
    with TestClient(app_for_extension_auth) as client:
        response = client.get(
            f"{settings.API_V1_STR}/extension/auth/status",
            headers={"Authorization": "Bearer sometoken"}
        )
    del app_for_extension_auth.dependency_overrides[get_db]
    
    assert response.status_code == 200
    data = response.json()
    assert data["authenticated"] is False
    assert "Something unexpected happened" in data["error"]

# --- Tests for POST /extension/auth/token ---

@patch("app.models.User") 
# @patch("app.models.Token") # Removed this patch to use the actual Token model
@patch("app.api.deps.get_db")
@patch("app.api.routes.extension_auth.security.create_access_token")
@patch("app.api.routes.extension_auth.jwt")
def test_get_extension_token_success(
    mock_jwt: MagicMock, 
    mock_create_access_token: MagicMock, 
    mock_get_db_patch: MagicMock, 
    # MockTokenModel: MagicMock, # Removed
    MockUserModel: MagicMock,
    app_for_extension_auth: FastAPI, 
    mock_db_session_fixture: MagicMock
):
    mock_get_db_patch.return_value = mock_db_session_fixture
    user_id = "testuser_for_ext_token"
    mock_user_instance = MagicMock()
    mock_user_instance.id = user_id
    mock_user_instance.is_active = True
    new_ext_token = "new_extension_jwt_token"

    mock_create_access_token.return_value = new_ext_token
    mock_jwt.decode.return_value = {"sub": user_id}
    mock_db_session_fixture.get.return_value = mock_user_instance
        
    app_for_extension_auth.dependency_overrides[get_db] = lambda: mock_db_session_fixture
    with TestClient(app_for_extension_auth) as client:
        response = client.post(
            f"{settings.API_V1_STR}/extension/auth/token",
            cookies={"accessToken": "validwebcookietoken"}
        )
    del app_for_extension_auth.dependency_overrides[get_db]
    
    assert response.status_code == 200
    # The actual app.models.Token has a default token_type="bearer"
    assert response.json() == {"access_token": new_ext_token, "token_type": "bearer"}
    mock_jwt.decode.assert_called_once_with("validwebcookietoken", settings.SECRET_KEY, algorithms=[security.ALGORITHM])
    mock_db_session_fixture.get.assert_called_once_with(MockUserModel, user_id)
    mock_create_access_token.assert_called_once_with(
        user_id, expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )

@patch("app.api.deps.get_db")
def test_get_extension_token_no_cookie(mock_get_db_patch: MagicMock, app_for_extension_auth: FastAPI, mock_db_session_fixture: MagicMock):
    mock_get_db_patch.return_value = mock_db_session_fixture
    app_for_extension_auth.dependency_overrides[get_db] = lambda: mock_db_session_fixture
    with TestClient(app_for_extension_auth) as client:
        response = client.post(f"{settings.API_V1_STR}/extension/auth/token")
    del app_for_extension_auth.dependency_overrides[get_db]
    assert response.status_code == 401
    assert "未找到有效的网页会话" in response.json()["detail"]


@patch("app.api.deps.get_db")
@patch("app.api.routes.extension_auth.jwt")
def test_get_extension_token_invalid_cookie(mock_jwt: MagicMock, mock_get_db_patch: MagicMock, app_for_extension_auth: FastAPI, mock_db_session_fixture: MagicMock):
    mock_get_db_patch.return_value = mock_db_session_fixture
    mock_jwt.decode.side_effect = InvalidTokenError("Cookie token is bad")
    
    app_for_extension_auth.dependency_overrides[get_db] = lambda: mock_db_session_fixture
    with TestClient(app_for_extension_auth) as client:
        response = client.post(
            f"{settings.API_V1_STR}/extension/auth/token",
            cookies={"accessToken": "badcookie"}
        )
    del app_for_extension_auth.dependency_overrides[get_db]
    assert response.status_code == 401
    assert "无效的网页会话: Cookie token is bad" in response.json()["detail"]

@patch("app.models.User")
@patch("app.api.deps.get_db")
@patch("app.api.routes.extension_auth.jwt")
def test_get_extension_token_user_not_found(
    mock_jwt: MagicMock, mock_get_db_patch: MagicMock, MockUserModel: MagicMock, 
    app_for_extension_auth: FastAPI, mock_db_session_fixture: MagicMock
):
    mock_get_db_patch.return_value = mock_db_session_fixture
    mock_jwt.decode.return_value = {"sub": "ghostuser"}
    mock_db_session_fixture.get.return_value = None 
    
    app_for_extension_auth.dependency_overrides[get_db] = lambda: mock_db_session_fixture
    with TestClient(app_for_extension_auth) as client:
        response = client.post(
            f"{settings.API_V1_STR}/extension/auth/token",
            cookies={"accessToken": "validcookie_ghostuser"}
        )
    del app_for_extension_auth.dependency_overrides[get_db]
    assert response.status_code == 401
    assert "未找到有效的网页会话" in response.json()["detail"] 
    mock_db_session_fixture.get.assert_called_with(MockUserModel, "ghostuser")


@patch("app.models.User")
@patch("app.api.deps.get_db")
@patch("app.api.routes.extension_auth.jwt")
def test_get_extension_token_user_inactive(
    mock_jwt: MagicMock, mock_get_db_patch: MagicMock, MockUserModel: MagicMock, 
    app_for_extension_auth: FastAPI, mock_db_session_fixture: MagicMock
):
    mock_get_db_patch.return_value = mock_db_session_fixture
    user_id = "inactive_ext_user"
    mock_user_inactive = MagicMock()
    mock_user_inactive.id = user_id
    mock_user_inactive.is_active = False

    mock_jwt.decode.return_value = {"sub": user_id}
    mock_db_session_fixture.get.return_value = mock_user_inactive

    app_for_extension_auth.dependency_overrides[get_db] = lambda: mock_db_session_fixture
    with TestClient(app_for_extension_auth) as client:
        response = client.post(
            f"{settings.API_V1_STR}/extension/auth/token",
            cookies={"accessToken": "validcookie_inactiveuser"}
        )
    del app_for_extension_auth.dependency_overrides[get_db]
    assert response.status_code == 401
    assert "未找到有效的网页会话" in response.json()["detail"] 
    mock_db_session_fixture.get.assert_called_with(MockUserModel, user_id)

@patch("app.models.User")
@patch("app.api.deps.get_db")
@patch("app.api.routes.extension_auth.security.create_access_token")
@patch("app.api.routes.extension_auth.jwt")
def test_get_extension_token_create_token_exception(
    mock_jwt: MagicMock, mock_create_access_token: MagicMock, mock_get_db_patch: MagicMock, MockUserModel: MagicMock,
    app_for_extension_auth: FastAPI, mock_db_session_fixture: MagicMock
):
    mock_get_db_patch.return_value = mock_db_session_fixture
    user_id = "token_creation_fail_user"
    mock_user_instance = MagicMock()
    mock_user_instance.id = user_id
    mock_user_instance.is_active = True

    mock_create_access_token.side_effect=Exception("Token creation failed")
    mock_jwt.decode.return_value = {"sub": user_id}
    mock_db_session_fixture.get.return_value = mock_user_instance

    app_for_extension_auth.dependency_overrides[get_db] = lambda: mock_db_session_fixture
    with TestClient(app_for_extension_auth) as client:
        response = client.post(
            f"{settings.API_V1_STR}/extension/auth/token",
            cookies={"accessToken": "validcookie_tokenfail"}
        )
    del app_for_extension_auth.dependency_overrides[get_db]
    assert response.status_code == 401
    assert "获取扩展令牌失败: Token creation failed" in response.json()["detail"]
