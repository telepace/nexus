import logging
from datetime import datetime, timedelta, timezone
from typing import Any
import base64
import json

import jwt
from fastapi import HTTPException
from passlib.context import CryptContext
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend

from app.core.config import settings

# 创建logger实例
logger = logging.getLogger(__name__)

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
    """
    Decrypt password encrypted with CryptoJS AES.
    Compatible with frontend encryption using CryptoJS.AES.encrypt().
    """
    # 在测试环境中直接返回原始密码，跳过解密过程
    if settings.TESTING or settings.TEST_MODE:
        logger.debug(
            "Testing mode: Skipping password decryption and returning the original password."
        )
        return encrypted_password_b64

    try:
        # CryptoJS AES 解密逻辑
        # CryptoJS 输出的是 Base64 编码的字符串
        encrypted_bytes = base64.b64decode(encrypted_password_b64)
        
        # CryptoJS 使用的格式：前8字节是 "Salted__"，接下来8字节是盐，然后是密文
        if len(encrypted_bytes) < 16:
            raise ValueError("Encrypted data too short")
        
        # 检查是否是 CryptoJS 格式
        if encrypted_bytes[:8] != b"Salted__":
            # 如果不是标准的 CryptoJS 格式，尝试直接使用 key 解密
            # 这种情况下假设密码已经是正确格式的Base64
            from cryptography.fernet import Fernet
            try:
                cipher_suite = Fernet(settings.APP_SYMMETRIC_ENCRYPTION_KEY.encode())
                decrypted_bytes = cipher_suite.decrypt(encrypted_password_b64.encode("utf-8"))
                return decrypted_bytes.decode("utf-8")
            except Exception:
                # 如果 Fernet 也失败了，抛出错误
                raise ValueError("Invalid encryption format")
        
        # 提取盐和密文
        salt = encrypted_bytes[8:16]
        ciphertext = encrypted_bytes[16:]
        
        # 使用 PBKDF2 从密码和盐生成密钥和IV（与 CryptoJS 兼容）
        key = settings.APP_SYMMETRIC_ENCRYPTION_KEY.encode('utf-8')
        
        # CryptoJS 使用 MD5 进行密钥派生
        import hashlib
        def derive_key_iv(password: bytes, salt: bytes, key_len: int = 32, iv_len: int = 16):
            """
            Derive key and IV using the same method as CryptoJS (EVP_BytesToKey)
            """
            d = d_i = b''
            while len(d) < (key_len + iv_len):
                d_i = hashlib.md5(d_i + password + salt).digest()
                d += d_i
            return d[:key_len], d[key_len:key_len+iv_len]
        
        derived_key, iv = derive_key_iv(key, salt)
        
        # 使用 AES-256-CBC 解密
        cipher = Cipher(algorithms.AES(derived_key), modes.CBC(iv), backend=default_backend())
        decryptor = cipher.decryptor()
        decrypted = decryptor.update(ciphertext) + decryptor.finalize()
        
        # 移除 PKCS7 填充
        padding_length = decrypted[-1]
        if padding_length > 16:
            raise ValueError("Invalid padding")
        
        decrypted = decrypted[:-padding_length]
        
        return decrypted.decode('utf-8')
    
    except Exception as e:
        logger.error(f"Password decryption error: {e}")
        # 在开发环境中提供更详细的错误信息
        if settings.ENVIRONMENT == "development":
            raise HTTPException(
                status_code=400, 
                detail=f"Password decryption failed: {str(e)}"
            )
        else:
            raise HTTPException(
                status_code=400, 
                detail="Invalid password encryption format or key."
            )
