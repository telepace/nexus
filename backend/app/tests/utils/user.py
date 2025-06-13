from typing import cast

from fastapi.testclient import TestClient
from sqlmodel import Session

from app import crud
from app.core.config import settings
from app.core.security import verify_password
from app.models import User, UserCreate, UserUpdate
from app.tests.utils.utils import random_email, random_lower_string


def user_authentication_headers(
    *, client: TestClient, email: str, password: str
) -> dict[str, str]:
    data = {"username": email, "password": password}

    r = client.post(f"{settings.API_V1_STR}/login/access-token", data=data)

    # 添加调试信息
    if r.status_code != 200:
        print(f"Login failed with status {r.status_code}: {r.text}")
        raise Exception(f"Login failed with status {r.status_code}: {r.text}")

    response = r.json()

    # 添加更好的错误处理
    if "access_token" not in response:
        print(f"No access_token in response: {response}")
        raise Exception(f"No access_token in login response: {response}")

    auth_token = response["access_token"]
    headers = {"Authorization": f"Bearer {auth_token}"}
    return headers


def create_random_user(db: Session) -> User:
    email = random_email()
    password = random_lower_string()
    user_in = UserCreate(email=email, password=password)
    user = crud.create_user(session=db, user_create=user_in)
    return cast(User, user)


def authentication_token_from_email(
    *, client: TestClient, email: str, db: Session
) -> dict[str, str]:
    """
    Return a valid token for the user with given email.

    If the user doesn't exist it is created first.
    """
    password = random_lower_string()
    user = crud.get_user_by_email(session=db, email=email)
    if not user:
        user_in_create = UserCreate(email=email, password=password)
        user = crud.create_user(session=db, user_create=user_in_create)
        print(f"Created new test user: {email}")
    else:
        user_in_update = UserUpdate(password=password)
        if not user.id:
            raise Exception("User id not set")
        user = crud.update_user(session=db, db_user=user, user_in=user_in_update)
        # 确保会话提交并刷新用户数据
        db.commit()
        db.refresh(user)
        print(f"Updated existing test user: {email}")

    # 添加密码验证调试信息
    print(f"Generated password: {password}")
    print(f"User hashed_password exists: {bool(user.hashed_password)}")
    if user.hashed_password:
        # 验证密码是否可以正确验证
        password_valid = verify_password(password, user.hashed_password)
        print(f"Password verification result: {password_valid}")

        # 如果密码验证失败，直接使用 crud.authenticate 再次测试
        auth_user = crud.authenticate(session=db, email=email, password=password)
        print(f"Direct authentication result: {bool(auth_user)}")

    print(
        f"Attempting to authenticate user: {email} with password length: {len(password)}"
    )
    return user_authentication_headers(client=client, email=email, password=password)
