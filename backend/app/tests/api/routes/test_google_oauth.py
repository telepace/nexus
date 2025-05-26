from unittest.mock import MagicMock, patch
from urllib.parse import parse_qs, unquote, urlparse

import pytest
import requests
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.deps import get_db
from app.api.routes.google_oauth import GoogleCallbackRequest
from app.api.routes.google_oauth import router as google_oauth_router
from app.core.config import settings as app_settings
from app.tests.utils.utils import get_error_detail

EXAMPLE_GOOGLE_USER_INFO = {
    "sub": "google_user_123",
    "email": "test.user@example.com",
    "name": "Test User Google",
    "given_name": "Test",
    "family_name": "User",
    "picture": "https://example.com/avatar.jpg",
    "email_verified": True,
    "locale": "en",
}


@pytest.fixture
def mock_db_session_fixture():
    session = MagicMock()
    return session


@pytest.fixture(scope="module")
def app_for_google_oauth_module():
    app = FastAPI()
    app.include_router(google_oauth_router, prefix=app_settings.API_V1_STR)
    return app


@pytest.fixture
def client(app_for_google_oauth_module: FastAPI, mock_db_session_fixture: MagicMock):
    app_for_google_oauth_module.dependency_overrides[get_db] = (
        lambda: mock_db_session_fixture
    )
    with TestClient(app_for_google_oauth_module) as c:
        yield c
    del app_for_google_oauth_module.dependency_overrides[get_db]


# --- Tests for GET /login/google ---
@patch("app.api.routes.google_oauth.settings")
@patch("secrets.token_urlsafe", return_value="test_state_token")
@patch("starlette.requests.Request.session", new_callable=MagicMock)
def test_google_login_success(
    mock_starlette_session: MagicMock,
    _mock_token_urlsafe: MagicMock,
    mock_route_settings: MagicMock,
    client: TestClient,
):
    mock_route_settings.GOOGLE_CLIENT_ID = "test_client_id"
    mock_route_settings.GOOGLE_CLIENT_SECRET = "test_client_secret"
    mock_route_settings.google_oauth_redirect_uri = "http://localhost/callback"
    mock_route_settings.FRONTEND_HOST = app_settings.FRONTEND_HOST
    mock_route_settings.API_V1_STR = app_settings.API_V1_STR

    response = client.get(
        f"{app_settings.API_V1_STR}/login/google", follow_redirects=False
    )

    assert response.status_code == 307
    assert response.headers["location"].startswith(
        "https://accounts.google.com/o/oauth2/v2/auth"
    )
    redirect_params = parse_qs(urlparse(response.headers["location"]).query)
    assert redirect_params["client_id"] == ["test_client_id"]
    mock_starlette_session.__setitem__.assert_any_call(
        "google_oauth_state", "test_state_token"
    )


@patch("app.api.routes.google_oauth.settings")
@patch("secrets.token_urlsafe", return_value="test_state_token_ext")
@patch("starlette.requests.Request.session", new_callable=MagicMock)
def test_google_login_success_with_extension_callback(
    mock_starlette_session: MagicMock,
    _mock_token_urlsafe: MagicMock,
    mock_route_settings: MagicMock,
    client: TestClient,
):
    mock_route_settings.GOOGLE_CLIENT_ID = "test_client_id"
    mock_route_settings.GOOGLE_CLIENT_SECRET = "test_client_secret"
    mock_route_settings.google_oauth_redirect_uri = "http://localhost/callback"
    mock_route_settings.FRONTEND_HOST = app_settings.FRONTEND_HOST
    mock_route_settings.API_V1_STR = app_settings.API_V1_STR

    response = client.get(
        f"{app_settings.API_V1_STR}/login/google?extension_callback=myextension://callback",
        follow_redirects=False,
    )
    assert response.status_code == 307
    mock_starlette_session.__setitem__.assert_any_call(
        "google_oauth_state", "test_state_token_ext"
    )
    mock_starlette_session.__setitem__.assert_any_call(
        "extension_callback", "myextension://callback"
    )


@patch("app.api.routes.google_oauth.settings")
@patch("starlette.requests.Request.session", new_callable=MagicMock)
def test_google_login_oauth_not_configured(
    _mock_starlette_session: MagicMock,
    mock_route_settings: MagicMock,
    client: TestClient,
):
    mock_route_settings.GOOGLE_CLIENT_ID = None
    mock_route_settings.GOOGLE_CLIENT_SECRET = "test_secret"
    mock_route_settings.FRONTEND_HOST = app_settings.FRONTEND_HOST
    mock_route_settings.API_V1_STR = app_settings.API_V1_STR

    response = client.get(
        f"{app_settings.API_V1_STR}/login/google", follow_redirects=False
    )
    assert response.status_code == 307
    assert (
        response.headers["location"]
        == f"{app_settings.FRONTEND_HOST}/login?error=oauth_config_error"
    )


# --- Tests for GET /login/google/callback ---


@patch("app.models.User")
@patch("app.api.routes.google_oauth.crud")
@patch("app.api.routes.google_oauth.create_access_token")
@patch("app.api.routes.google_oauth.requests")
@patch("app.api.routes.google_oauth.settings")
def test_google_callback_success_new_user(
    mock_route_settings: MagicMock,
    mock_requests_module: MagicMock,
    mock_create_access_token: MagicMock,
    mock_crud_module: MagicMock,
    MockUserModel: MagicMock,
    client: TestClient,
):
    mock_route_settings.configure_mock(**app_settings.model_dump(exclude_none=True))
    mock_route_settings.GOOGLE_CLIENT_ID = "test_cid"
    mock_route_settings.GOOGLE_CLIENT_SECRET = "test_csec"
    mock_route_settings.google_oauth_redirect_uri = "http://cb.uri"

    mock_token_response = MagicMock()
    mock_token_response.json.return_value = {
        "access_token": "google_access_token",
        "id_token": "mock_id_token",
    }
    mock_user_info_resp = MagicMock()
    current_google_user_info = EXAMPLE_GOOGLE_USER_INFO.copy()
    mock_user_info_resp.json.return_value = current_google_user_info
    mock_requests_module.post.return_value = mock_token_response
    mock_requests_module.get.return_value = mock_user_info_resp

    mock_crud_module.get_user_by_email.return_value = None
    new_user_instance = MagicMock(
        id="new_user_id_123",
        email=current_google_user_info["email"],
        google_id=current_google_user_info["sub"],
    )
    MockUserModel.return_value = new_user_instance
    mock_crud_module.create_user_oauth.return_value = new_user_instance
    new_app_token = "app_access_token_for_new_user"
    mock_create_access_token.return_value = new_app_token

    mock_session_obj = MagicMock()
    session_items = {"google_oauth_state": "test_state_value"}
    mock_session_obj.get = MagicMock(side_effect=session_items.get)
    mock_session_obj.pop = MagicMock(
        side_effect=lambda k, d=None: session_items.pop(k, d)
    )
    with patch("starlette.requests.Request.session", mock_session_obj):
        response = client.get(
            f"{app_settings.API_V1_STR}/login/google/callback?code=auth_code_here&state=test_state_value",
            follow_redirects=False,
        )
    assert response.status_code == 307
    assert (
        response.headers["location"]
        == f"{app_settings.FRONTEND_HOST}/login/google/callback?token={new_app_token}"
    )
    mock_crud_module.create_user_oauth.assert_called_once()


@patch("app.models.User")
@patch("app.api.routes.google_oauth.crud")
@patch("app.api.routes.google_oauth.create_access_token")
@patch("app.api.routes.google_oauth.requests")
@patch("app.api.routes.google_oauth.settings")
def test_google_callback_success_existing_user_no_google_id(
    mock_route_settings: MagicMock,
    mock_requests: MagicMock,
    mock_create_access_token: MagicMock,
    mock_crud: MagicMock,
    _MockUserModel: MagicMock,
    client: TestClient,
    mock_db_session_fixture: MagicMock,
):
    mock_route_settings.configure_mock(**app_settings.model_dump(exclude_none=True))
    mock_route_settings.GOOGLE_CLIENT_ID = "test_cid"
    mock_route_settings.GOOGLE_CLIENT_SECRET = "test_csec"
    mock_route_settings.google_oauth_redirect_uri = "http://cb.uri"
    mock_token_response = MagicMock()
    mock_token_response.json.return_value = {"access_token": "ga_token"}
    mock_user_info_resp = MagicMock()
    google_user_data = EXAMPLE_GOOGLE_USER_INFO.copy()
    mock_user_info_resp.json.return_value = google_user_data
    mock_requests.post.return_value = mock_token_response
    mock_requests.get.return_value = mock_user_info_resp
    existing_user = MagicMock(
        id="existing_user_456",
        email=google_user_data["email"],
        google_id=None,
        is_active=True,
    )
    mock_crud.get_user_by_email.return_value = existing_user
    new_app_token = "app_token_existing_user_no_gid"
    mock_create_access_token.return_value = new_app_token
    mock_session_obj = MagicMock()
    session_items = {"google_oauth_state": "test_state_value"}
    mock_session_obj.get = MagicMock(side_effect=session_items.get)
    mock_session_obj.pop = MagicMock(
        side_effect=lambda k, d=None: session_items.pop(k, d)
    )
    with patch("starlette.requests.Request.session", mock_session_obj):
        response = client.get(
            f"{app_settings.API_V1_STR}/login/google/callback?code=auth_code&state=test_state_value",
            follow_redirects=False,
        )
    assert response.status_code == 307
    assert (
        response.headers["location"]
        == f"{app_settings.FRONTEND_HOST}/login/google/callback?token={new_app_token}"
    )
    mock_crud.create_user_oauth.assert_not_called()
    mock_db_session_fixture.add.assert_called_with(existing_user)
    assert existing_user.google_id == google_user_data["sub"]


@patch("app.models.User")
@patch("app.api.routes.google_oauth.crud")
@patch("app.api.routes.google_oauth.create_access_token")
@patch("app.api.routes.google_oauth.requests")
@patch("app.api.routes.google_oauth.settings")
def test_google_callback_success_existing_user_with_google_id(
    mock_route_settings: MagicMock,
    mock_requests: MagicMock,
    mock_create_access_token: MagicMock,
    mock_crud: MagicMock,
    _MockUserModel: MagicMock,
    client: TestClient,
):
    mock_route_settings.configure_mock(**app_settings.model_dump(exclude_none=True))
    mock_route_settings.GOOGLE_CLIENT_ID = "test_cid"
    mock_route_settings.GOOGLE_CLIENT_SECRET = "test_csec"
    mock_route_settings.google_oauth_redirect_uri = "http://cb.uri"
    mock_token_response = MagicMock()
    mock_token_response.json.return_value = {"access_token": "ga_token"}
    mock_user_info_resp = MagicMock()
    google_user_data = EXAMPLE_GOOGLE_USER_INFO.copy()
    mock_user_info_resp.json.return_value = google_user_data
    mock_requests.post.return_value = mock_token_response
    mock_requests.get.return_value = mock_user_info_resp
    existing_user = MagicMock(
        id="existing_user_789",
        email=google_user_data["email"],
        google_id=google_user_data["sub"],
        is_active=True,
    )
    mock_crud.get_user_by_email.return_value = existing_user
    new_app_token = "app_token_existing_user_with_gid"
    mock_create_access_token.return_value = new_app_token
    mock_session_obj = MagicMock()
    session_items = {"google_oauth_state": "test_state_value"}
    mock_session_obj.get = MagicMock(side_effect=session_items.get)
    mock_session_obj.pop = MagicMock(
        side_effect=lambda k, d=None: session_items.pop(k, d)
    )
    with patch("starlette.requests.Request.session", mock_session_obj):
        response = client.get(
            f"{app_settings.API_V1_STR}/login/google/callback?code=auth_code&state=test_state_value",
            follow_redirects=False,
        )
    assert response.status_code == 307
    assert (
        response.headers["location"]
        == f"{app_settings.FRONTEND_HOST}/login/google/callback?token={new_app_token}"
    )
    mock_crud.create_user_oauth.assert_not_called()


@patch("app.models.User")
@patch("app.api.routes.google_oauth.crud")
@patch("app.api.routes.google_oauth.create_access_token")
@patch("app.api.routes.google_oauth.requests")
@patch("app.api.routes.google_oauth.settings")
def test_google_callback_with_extension_redirect(
    mock_route_settings: MagicMock,
    mock_requests: MagicMock,
    mock_create_access_token: MagicMock,
    mock_crud: MagicMock,
    _MockUserModel: MagicMock,
    client: TestClient,
):
    mock_route_settings.configure_mock(**app_settings.model_dump(exclude_none=True))
    mock_route_settings.GOOGLE_CLIENT_ID = "test_cid"
    mock_route_settings.GOOGLE_CLIENT_SECRET = "test_csec"
    mock_route_settings.google_oauth_redirect_uri = "http://cb.uri"
    mock_token_response = MagicMock()
    mock_token_response.json.return_value = {"access_token": "ga_token"}
    mock_user_info_resp = MagicMock()
    mock_user_info_resp.json.return_value = EXAMPLE_GOOGLE_USER_INFO.copy()
    mock_requests.post.return_value = mock_token_response
    mock_requests.get.return_value = mock_user_info_resp
    new_user_instance = MagicMock(id="ext_cb_user")
    mock_crud.get_user_by_email.return_value = None
    _MockUserModel.return_value = new_user_instance
    mock_crud.create_user_oauth.return_value = new_user_instance
    new_app_token = "app_token_ext_cb"
    mock_create_access_token.return_value = new_app_token
    mock_session_obj = MagicMock()
    session_items = {
        "google_oauth_state": "test_state_ext_cb",
        "extension_callback": "myextension://callback",
    }
    mock_session_obj.get = MagicMock(side_effect=session_items.get)
    mock_session_obj.pop = MagicMock(
        side_effect=lambda k, d=None: session_items.pop(k, d)
    )  # pop will modify session_items
    with patch("starlette.requests.Request.session", mock_session_obj):
        response = client.get(
            f"{app_settings.API_V1_STR}/login/google/callback?code=auth_code_ext&state=test_state_ext_cb",
            follow_redirects=False,
        )
    assert response.status_code == 307
    assert (
        response.headers["location"] == f"myextension://callback?token={new_app_token}"
    )
    assert "extension_callback" not in session_items


@patch("app.api.routes.google_oauth.settings")
def test_google_callback_error_from_google(
    mock_route_settings: MagicMock, client: TestClient
):
    mock_route_settings.FRONTEND_HOST = app_settings.FRONTEND_HOST
    mock_session_obj = MagicMock()
    session_items = {"google_oauth_state": "test_state_value"}
    mock_session_obj.get = MagicMock(side_effect=session_items.get)
    mock_session_obj.pop = MagicMock(
        side_effect=lambda k, d=None: session_items.pop(k, d)
    )
    with patch("starlette.requests.Request.session", mock_session_obj):
        response = client.get(
            f"{app_settings.API_V1_STR}/login/google/callback?error=access_denied&state=test_state_value",
            follow_redirects=False,
        )
    assert response.status_code == 307
    assert (
        response.headers["location"]
        == f"{app_settings.FRONTEND_HOST}/login?error=oauth_error&message=access_denied"
    )


@patch("app.api.routes.google_oauth.settings")
def test_google_callback_state_mismatch(
    mock_route_settings: MagicMock, client: TestClient
):
    mock_route_settings.FRONTEND_HOST = app_settings.FRONTEND_HOST
    mock_session_obj = MagicMock()
    mock_session_obj.get.return_value = "stored_correct_state"
    mock_session_obj.pop.return_value = "stored_correct_state"
    with patch("starlette.requests.Request.session", mock_session_obj):
        response = client.get(
            f"{app_settings.API_V1_STR}/login/google/callback?code=somecode&state=received_wrong_state",
            follow_redirects=False,
        )
    assert response.status_code == 307
    assert (
        response.headers["location"]
        == f"{app_settings.FRONTEND_HOST}/login?error=invalid_state"
    )


@patch("app.api.routes.google_oauth.settings")
def test_google_callback_no_code(mock_route_settings: MagicMock, client: TestClient):
    mock_route_settings.FRONTEND_HOST = app_settings.FRONTEND_HOST
    mock_session_obj = MagicMock()
    session_items = {"google_oauth_state": "test_state_value"}
    mock_session_obj.get = MagicMock(side_effect=session_items.get)
    mock_session_obj.pop = MagicMock(
        side_effect=lambda k, d=None: session_items.pop(k, d)
    )
    with patch("starlette.requests.Request.session", mock_session_obj):
        response = client.get(
            f"{app_settings.API_V1_STR}/login/google/callback?state=test_state_value",
            follow_redirects=False,
        )
    assert response.status_code == 307
    assert (
        response.headers["location"]
        == f"{app_settings.FRONTEND_HOST}/login?error=no_code"
    )


@patch("app.api.routes.google_oauth.settings")
@patch("app.api.routes.google_oauth.requests")
def test_google_callback_token_exchange_fails(
    mock_requests: MagicMock, mock_route_settings: MagicMock, client: TestClient
):
    mock_route_settings.configure_mock(**app_settings.model_dump(exclude_none=True))
    mock_route_settings.GOOGLE_CLIENT_ID = "test_cid"
    mock_route_settings.GOOGLE_CLIENT_SECRET = "test_csec"
    mock_route_settings.google_oauth_redirect_uri = "http://cb.uri"
    mock_requests.post.side_effect = requests.exceptions.HTTPError(
        "Failed to get token"
    )
    mock_session_obj = MagicMock()
    session_items = {"google_oauth_state": "test_state_value"}
    mock_session_obj.get = MagicMock(side_effect=session_items.get)
    mock_session_obj.pop = MagicMock(
        side_effect=lambda k, d=None: session_items.pop(k, d)
    )
    with patch("starlette.requests.Request.session", mock_session_obj):
        response = client.get(
            f"{app_settings.API_V1_STR}/login/google/callback?code=auth_code&state=test_state_value",
            follow_redirects=False,
        )
    assert response.status_code == 307
    redirect_location = unquote(response.headers["location"])
    assert (
        "error=server_error" in redirect_location
        and "Failed to get token" in redirect_location
    )


@patch("app.api.routes.google_oauth.settings")
@patch("app.api.routes.google_oauth.requests")
def test_google_callback_user_info_fails(
    mock_requests: MagicMock, mock_route_settings: MagicMock, client: TestClient
):
    mock_route_settings.configure_mock(**app_settings.model_dump(exclude_none=True))
    mock_route_settings.GOOGLE_CLIENT_ID = "test_cid"
    mock_route_settings.GOOGLE_CLIENT_SECRET = "test_csec"
    mock_route_settings.google_oauth_redirect_uri = "http://cb.uri"
    mock_token_resp = MagicMock()
    mock_token_resp.json.return_value = {"access_token": "ga_token"}
    mock_requests.post.return_value = mock_token_resp
    mock_requests.get.side_effect = requests.exceptions.HTTPError(
        "Failed to get user info"
    )
    mock_session_obj = MagicMock()
    session_items = {"google_oauth_state": "test_state_value"}
    mock_session_obj.get = MagicMock(side_effect=session_items.get)
    mock_session_obj.pop = MagicMock(
        side_effect=lambda k, d=None: session_items.pop(k, d)
    )
    with patch("starlette.requests.Request.session", mock_session_obj):
        response = client.get(
            f"{app_settings.API_V1_STR}/login/google/callback?code=auth_code&state=test_state_value",
            follow_redirects=False,
        )
    assert response.status_code == 307
    redirect_location = unquote(response.headers["location"])
    assert (
        "error=server_error" in redirect_location
        and "Failed to get user info" in redirect_location
    )


# --- Tests for POST /auth/google-callback (old endpoint) ---
@patch("app.models.UserPublic")
@patch("app.models.User")
@patch("app.api.routes.google_oauth.crud")  # Patched here
@patch("app.api.deps.get_db")
@patch("app.api.routes.google_oauth.create_access_token")
@patch("app.api.routes.google_oauth.requests")
@patch("app.api.routes.google_oauth.settings")
def test_old_google_callback_api_success_new_user(
    mock_route_settings: MagicMock,
    mock_requests: MagicMock,
    mock_create_access_token: MagicMock,
    mock_get_db_patch: MagicMock,
    mock_crud: MagicMock,  # mock_crud is now a param
    MockUserModel: MagicMock,
    _MockUserPublicModel: MagicMock,
    client: TestClient,
    mock_db_session_fixture: MagicMock,
):
    mock_route_settings.configure_mock(**app_settings.model_dump(exclude_none=True))
    mock_route_settings.ACCESS_TOKEN_EXPIRE_MINUTES = (
        app_settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    mock_get_db_patch.return_value = mock_db_session_fixture

    google_token = "frontend_google_token"
    user_info_from_frontend = EXAMPLE_GOOGLE_USER_INFO.copy()
    mock_user_info_response = MagicMock()
    mock_user_info_response.json.return_value = user_info_from_frontend
    mock_requests.get.return_value = mock_user_info_response

    mock_crud.get_user_by_email.return_value = None
    new_user_instance = MagicMock(id="new_user_via_old_cb")
    MockUserModel.return_value = new_user_instance
    mock_crud.create_user_oauth.return_value = new_user_instance
    new_app_token = "app_token_old_cb"
    mock_create_access_token.return_value = new_app_token

    request_data_model = GoogleCallbackRequest(
        token=google_token, user_info=user_info_from_frontend
    )
    response = client.post(
        f"{app_settings.API_V1_STR}/auth/google-callback",
        json=request_data_model.model_dump(),
    )

    assert response.status_code == 200
    assert response.json() == {"access_token": new_app_token, "token_type": "bearer"}


@patch("app.api.deps.get_db")
@patch("app.api.routes.google_oauth.requests")
@patch("app.api.routes.google_oauth.settings")
def test_old_google_callback_api_user_info_mismatch(
    mock_route_settings: MagicMock,
    mock_requests: MagicMock,
    mock_get_db_patch: MagicMock,
    client: TestClient,
    mock_db_session_fixture: MagicMock,
):
    mock_route_settings.configure_mock(**app_settings.model_dump(exclude_none=True))
    mock_get_db_patch.return_value = mock_db_session_fixture

    google_token = "frontend_token_mismatch"
    user_info_from_frontend = {"sub": "frontend_sub_123", "email": "test@example.com"}
    verified_user_info = EXAMPLE_GOOGLE_USER_INFO.copy()
    verified_user_info["sub"] = "google_verified_sub_456"
    mock_user_info_response = MagicMock()
    mock_user_info_response.json.return_value = verified_user_info
    mock_requests.get.return_value = mock_user_info_response

    request_data_model = GoogleCallbackRequest(
        token=google_token, user_info=user_info_from_frontend
    )
    response = client.post(
        f"{app_settings.API_V1_STR}/auth/google-callback",
        json=request_data_model.model_dump(),
    )

    # This endpoint has a broad try-except that converts all exceptions to 500 if not handled explicitly
    # The HTTPException(400) for "User info verification failed" is caught by this.
    assert response.status_code == 500
    error_detail = get_error_detail(response.json())
    assert "User info verification failed" in error_detail
    assert "Google OAuth error: 400: User info verification failed" in error_detail


@patch("app.api.deps.get_db")
@patch("app.api.routes.google_oauth.requests")
@patch("app.api.routes.google_oauth.settings")
def test_old_google_callback_api_google_verification_fails(
    mock_route_settings: MagicMock,
    mock_requests: MagicMock,
    mock_get_db_patch: MagicMock,
    client: TestClient,
    mock_db_session_fixture: MagicMock,
):
    mock_route_settings.configure_mock(**app_settings.model_dump(exclude_none=True))
    mock_get_db_patch.return_value = mock_db_session_fixture
    mock_requests.get.side_effect = requests.exceptions.HTTPError(
        "Google verification failed"
    )

    request_data_model = GoogleCallbackRequest(
        token="anytoken", user_info={"sub": "any", "email": "any@any.com"}
    )
    response = client.post(
        f"{app_settings.API_V1_STR}/auth/google-callback",
        json=request_data_model.model_dump(),
    )

    assert response.status_code == 500
    error_detail = get_error_detail(response.json())
    assert "Google OAuth error: Google verification failed" in error_detail


@patch("app.models.User")
@patch("app.api.routes.google_oauth.crud")
@patch("app.api.deps.get_db")
@patch("app.api.routes.google_oauth.requests")
@patch("app.api.routes.google_oauth.settings")
def test_old_google_callback_user_creation_path_exception(
    mock_route_settings: MagicMock,
    mock_requests: MagicMock,
    mock_get_db_patch: MagicMock,
    mock_crud: MagicMock,
    _MockUserModel: MagicMock,
    client: TestClient,
    mock_db_session_fixture: MagicMock,
):
    mock_route_settings.configure_mock(**app_settings.model_dump(exclude_none=True))
    mock_get_db_patch.return_value = mock_db_session_fixture

    google_token = "token_user_create_exception"
    user_info = EXAMPLE_GOOGLE_USER_INFO.copy()

    mock_user_info_response = MagicMock()
    mock_user_info_response.json.return_value = user_info
    mock_requests.get.return_value = mock_user_info_response

    mock_crud.get_user_by_email.return_value = None  # New user
    mock_crud.create_user_oauth.side_effect = Exception(
        "DB creation error"
    )  # Simulate error during user creation

    request_data_model = GoogleCallbackRequest(token=google_token, user_info=user_info)
    response = client.post(
        f"{app_settings.API_V1_STR}/auth/google-callback",
        json=request_data_model.model_dump(),
    )

    assert response.status_code == 500
    error_detail = get_error_detail(response.json())
    assert "Google OAuth error: DB creation error" in error_detail
