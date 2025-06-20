import random
import string
from typing import Any

from fastapi.testclient import TestClient

from app.core.config import settings


def random_lower_string() -> str:
    return "".join(random.choices(string.ascii_lowercase, k=32))


def random_email() -> str:
    return f"{random_lower_string()}@{random_lower_string()}.com"


def get_superuser_token_headers(client: TestClient) -> dict[str, str]:
    login_data = {
        "username": settings.FIRST_SUPERUSER,
        "password": settings.FIRST_SUPERUSER_PASSWORD,
    }
    r = client.post(f"{settings.API_V1_STR}/login/access-token", data=login_data)

    # 添加基本的错误处理
    if r.status_code != 200:
        raise Exception(f"Superuser login failed with status {r.status_code}: {r.text}")

    # Handle both old and new response formats
    response_data = r.json()

    # Check if response is in new ApiResponse format
    if "data" in response_data and response_data["data"] is not None:
        # New format: {"data": {"access_token": "..."}, "meta": {}, "error": null}
        tokens = response_data["data"]
    else:
        # Old format: {"access_token": "..."}
        tokens = response_data

    if "access_token" not in tokens:
        raise Exception(f"No access_token in superuser login response: {response_data}")

    a_token = tokens["access_token"]
    headers = {"Authorization": f"Bearer {a_token}"}
    return headers


def get_error_detail(response_data: dict[str, Any]) -> str:
    """
    Extract error detail from response data, handling both old and new API response formats.

    Args:
        response_data: The JSON response data from the API

    Returns:
        The error detail string
    """
    if "error" in response_data and response_data["error"] is not None:
        # New format: {"data": null, "meta": {}, "error": "Error message"}
        return str(response_data["error"])
    elif "detail" in response_data:
        # Old format: {"detail": "Error message"}
        return str(response_data["detail"])
    else:
        # Fallback
        return str(response_data)
