import pytest
from fastapi import HTTPException
from unittest.mock import patch
from cryptography.fernet import Fernet

from app.core.security import decrypt_password
from app.core.config import settings # To be patched

# Generate a key for testing purposes
# IMPORTANT: This is a fixed key for predictable tests.
# In a real scenario, the key from settings would be used.
TEST_FERNET_KEY = Fernet.generate_key()
TEST_FERNET_KEY_STR = TEST_FERNET_KEY.decode('utf-8')

@pytest.fixture
def mock_settings_key():
    # Patch settings.APP_SYMMETRIC_ENCRYPTION_KEY to use our test key
    with patch.object(settings, 'APP_SYMMETRIC_ENCRYPTION_KEY', TEST_FERNET_KEY_STR) as _fixture:
        yield _fixture

def test_decrypt_password_success(mock_settings_key):
    """Test successful decryption of a password."""
    plain_password = "testpassword123"
    
    # Encrypt the password using the test key
    cipher_suite = Fernet(TEST_FERNET_KEY)
    encrypted_password_bytes = cipher_suite.encrypt(plain_password.encode('utf-8'))
    encrypted_password_b64 = encrypted_password_bytes.decode('utf-8')

    decrypted_password = decrypt_password(encrypted_password_b64)
    assert decrypted_password == plain_password

# In backend/app/tests/core/test_security.py

def test_decrypt_password_invalid_token(mock_settings_key):
    """Test decryption with an invalid token (malformed base64 or not Fernet encrypted)."""
    invalid_encrypted_password = "this is not a valid fernet token"

    with pytest.raises(HTTPException) as exc_info:
        decrypt_password(invalid_encrypted_password)

    assert exc_info.value.status_code == 400
-    assert "Invalid password encryption format or key." in exc_info.value.detail or \
-           "Could not process password." in exc_info.value.detail
+    assert exc_info.value.detail == "Invalid password encryption format or key."

def test_decrypt_password_incorrect_key_type(mock_settings_key):
    """Test decryption with a token encrypted by a different key (simulated)."""
    plain_password = "testpassword123"
    
    # Encrypt with a *different* key
    different_key = Fernet.generate_key()
    cipher_suite_different = Fernet(different_key)
    encrypted_password_bytes = cipher_suite_different.encrypt(plain_password.encode('utf-8'))
    encrypted_password_b64 = encrypted_password_bytes.decode('utf-8')

    # Decryption with the TEST_FERNET_KEY (via mock_settings_key) should fail
    with pytest.raises(HTTPException) as exc_info:
        decrypt_password(encrypted_password_b64)
    
    assert exc_info.value.status_code == 400
    assert "Invalid password encryption format or key." in exc_info.value.detail

def test_decrypt_empty_password(mock_settings_key):
    """Test decrypting an empty string."""
    # Fernet encryption of an empty string is valid, but results in non-empty ciphertext.
    # Providing an actual empty string to decrypt function should be handled.
    # However, the current decrypt_password function's Fernet().decrypt() will likely
    # raise an error if the input string is empty as it won't be valid base64/fernet token.
    with pytest.raises(HTTPException) as exc_info:
        decrypt_password("") # Empty string is not a valid token
    assert exc_info.value.status_code == 400
    assert "Could not process password." in exc_info.value.detail # Fernet will likely fail to decode/decrypt
