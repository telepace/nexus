from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
from cryptography.fernet import Fernet, InvalidToken
from fastapi import HTTPException
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


ALGORITHM = "HS256"


def create_access_token(subject: str | Any, expires_delta: timedelta) -> str:
    expire = datetime.now(timezone.utc) + expires_delta
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bool(pwd_context.verify(plain_password, hashed_password))


def get_password_hash(password: str) -> str:
    return str(pwd_context.hash(password))


def decrypt_password(encrypted_password_b64: str) -> str:
    # 在测试环境中直接返回原始密码，跳过解密过程
    if settings.TESTING or settings.TEST_MODE:
        print("测试模式：跳过密码解密过程，直接返回原始密码")
        return encrypted_password_b64

    try:
        cipher_suite = Fernet(settings.APP_SYMMETRIC_ENCRYPTION_KEY.encode())
        # crypto-js AES output is Base64, Fernet expects bytes.
        # The encrypted_password_b64 itself is a string that needs to be encoded to bytes.
        decrypted_bytes = cipher_suite.decrypt(encrypted_password_b64.encode("utf-8"))
        return decrypted_bytes.decode("utf-8")
    except InvalidToken:
        # This specific exception is raised by Fernet for invalid tokens
        raise HTTPException(
            status_code=400, detail="Invalid password encryption format or key."
        )
    except Exception as e:  # Catch other potential errors during decryption
        # Log the error e for server-side debugging
        # Consider using a proper logger in a production environment
        print(f"Password decryption error: {e}")
        raise HTTPException(status_code=400, detail="Could not process password.")
