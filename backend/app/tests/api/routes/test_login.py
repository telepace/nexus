from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings
from app.core.security import get_password_hash, verify_password
from app.models import User
from app.tests.conftest import get_api_response_data
from app.tests.utils.utils import random_email, random_lower_string
from app.utils import generate_password_reset_token


def test_get_access_token(client: TestClient, db: Session) -> None:
    login_data = {
        "username": settings.FIRST_SUPERUSER,
        "password": settings.FIRST_SUPERUSER_PASSWORD,
    }
    r = client.post(f"{settings.API_V1_STR}/login/access-token", data=login_data)
    tokens = get_api_response_data(r)
    assert r.status_code == 200
    assert "access_token" in tokens
    assert tokens["access_token"]


def test_get_access_token_incorrect_password(client: TestClient) -> None:
    login_data = {
        "username": settings.FIRST_SUPERUSER,
        "password": "incorrect",
    }
    r = client.post(f"{settings.API_V1_STR}/login/access-token", data=login_data)
    assert r.status_code == 400


def test_use_access_token(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    r = client.post(
        f"{settings.API_V1_STR}/login/test-token",
        headers=superuser_token_headers,
    )
    result = get_api_response_data(r)
    assert r.status_code == 200
    assert "email" in result


def test_recovery_password(
    client: TestClient, normal_user_token_headers: dict[str, str]
) -> None:
    with (
        patch("app.core.config.settings.SMTP_HOST", "smtp.example.com"),
        patch("app.core.config.settings.SMTP_USER", "admin@telepace.cc"),
    ):
        email = "test@example.com"
        r = client.post(
            f"{settings.API_V1_STR}/password-recovery/{email}",
            headers=normal_user_token_headers,
        )
        assert r.status_code == 200
        assert r.json() == {"message": "Password recovery email sent"}


def test_recovery_password_user_not_exits(
    client: TestClient, normal_user_token_headers: dict[str, str]
) -> None:
    email = "jVgQr@example.com"
    r = client.post(
        f"{settings.API_V1_STR}/password-recovery/{email}",
        headers=normal_user_token_headers,
    )
    assert r.status_code == 404


def test_incorrect_username(client: TestClient) -> None:
    login_data = {
        "username": random_email(),
        "password": random_lower_string(),
    }
    r = client.post(
        f"{settings.API_V1_STR}/login/access-token",
        data=login_data,
    )
    assert r.status_code == 400
    content = get_api_response_data(r)
    assert "detail" in content


def test_incorrect_password(client: TestClient, db: Session) -> None:
    username = random_email()
    password = random_lower_string()
    user = User(
        email=username,
        hashed_password=get_password_hash(password),
    )
    db.add(user)
    db.commit()

    login_data = {
        "username": username,
        "password": password + "wrong",
    }
    r = client.post(
        f"{settings.API_V1_STR}/login/access-token",
        data=login_data,
    )
    assert r.status_code == 400
    content = get_api_response_data(r)
    assert "detail" in content


def test_reset_password(client: TestClient, db: Session) -> None:
    """Test password reset."""
    # Create test user
    username = random_email()
    password = random_lower_string()
    user = User(
        email=username,
        hashed_password=get_password_hash(password),
    )
    db.add(user)
    db.commit()

    # Create reset token using the same method as the actual implementation
    token = generate_password_reset_token(email=username)

    # Reset password
    new_password = "nexus123"
    data = {"new_password": new_password, "token": token}
    r = client.post(
        f"{settings.API_V1_STR}/reset-password/",
        json=data,
    )

    # Check response
    assert r.status_code == 200
    content = get_api_response_data(r)
    assert content["message"] == "Password updated successfully"

    # Verify new password works
    login_data = {
        "username": username,
        "password": new_password,
    }
    r = client.post(
        f"{settings.API_V1_STR}/login/access-token",
        data=login_data,
    )
    assert r.status_code == 200


def test_reset_password_invalid_token(client: TestClient) -> None:
    """Test invalid password reset token."""
    data = {"new_password": "nexus", "token": "invalid"}
    r = client.post(
        f"{settings.API_V1_STR}/reset-password/",
        json=data,
    )
    response = get_api_response_data(r)
    assert r.status_code == 422
    assert "detail" in response
