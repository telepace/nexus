from fastapi.testclient import TestClient

from app.core.config import settings
from app.tests.utils.utils import random_lower_string


def test_create_user_new_email(client: TestClient) -> None:
    email = f"{random_lower_string()}@example.com"
    password = random_lower_string()
    data = {"email": email, "password": password}
    r = client.post(
        f"{settings.API_V1_STR}/users/signup",
        json=data,
    )
    assert 200 <= r.status_code < 300
    created_user = r.json()
    assert created_user["email"] == email
    assert "id" in created_user
    assert "avatar_url" in created_user  # 验证返回了头像URL字段
    # 新用户的头像URL可以为空，这是正常的
