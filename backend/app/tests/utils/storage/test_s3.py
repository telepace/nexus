from io import BytesIO
from unittest.mock import MagicMock, patch

import pytest

# Module to be tested
from app.utils.storage import s3 as s3_storage_module
from app.utils.storage.s3 import MockS3Client, S3StorageService

# Define a mock ClientError that can be used by tests
MockBotocoreClientError = type("MockBotocoreClientError", (Exception,), {})


@pytest.fixture
def s3_settings():
    return {
        "aws_access_key_id": "test_access_key_id",
        "aws_secret_access_key": "test_secret_access_key",
        "bucket": "test-bucket",
        "region": "us-west-1",
        "public_url": "https://test-bucket.s3.us-west-1.amazonaws.com",
        "endpoint_url": None,
    }


# --- Initialization Tests ---


@patch.object(
    s3_storage_module, "ClientError", create=True
)  # Patch/create ClientError in s3_storage_module
@patch.object(
    s3_storage_module, "boto3", create=True
)  # Patch/create boto3 in s3_storage_module
@patch.object(s3_storage_module, "BOTO3_AVAILABLE", True)  # Set BOTO3_AVAILABLE to True
def test_s3_storage_service_init_with_boto3(
    mock_boto3_in_module: MagicMock,  # Corresponds to patch for "boto3"
    _mock_client_error_in_module: MagicMock,  # Corresponds to patch for "ClientError"
    s3_settings,
):
    mock_s3_client_instance = MagicMock()
    mock_boto3_in_module.client.return_value = mock_s3_client_instance
    # mock_client_error_in_module is now the PatchedClientError for s3_storage_module.ClientError
    # We don't need to do anything with it unless we are testing specific exception types being raised by it.
    # S3StorageService will use this patched s3_storage_module.ClientError if it needs to catch it.

    service = S3StorageService(**s3_settings)

    mock_boto3_in_module.client.assert_called_once_with(
        "s3",
        aws_access_key_id=s3_settings["aws_access_key_id"],
        aws_secret_access_key=s3_settings["aws_secret_access_key"],
        region_name=s3_settings["region"],
        endpoint_url=s3_settings["endpoint_url"],
    )
    assert service.client == mock_s3_client_instance
    assert service.bucket == s3_settings["bucket"]
    assert service.public_url == s3_settings["public_url"]


@patch.object(s3_storage_module, "BOTO3_AVAILABLE", False)
def test_s3_storage_service_init_without_boto3_uses_mock_client(s3_settings):
    # When BOTO3_AVAILABLE is False, S3StorageService should use MockS3Client
    # and its internal ClientError should be s3_storage_module.MockClientError
    service = S3StorageService(**s3_settings)
    assert isinstance(service.client, MockS3Client)
    assert service.client.bucket_name == s3_settings["bucket"]
    # Ensure that s3_storage_module.ClientError is indeed MockClientError in this context
    assert s3_storage_module.ClientError == s3_storage_module.MockClientError


# --- _build_url Tests ---
@patch.object(
    s3_storage_module, "BOTO3_AVAILABLE", False
)  # Ensure no real boto3 attempt
def test_build_url(s3_settings):
    service = S3StorageService(**s3_settings)
    file_path = "some/file/path.txt"
    expected_url = f"{s3_settings['public_url']}/{file_path}"
    assert service._build_url(file_path) == expected_url


@patch.object(s3_storage_module, "BOTO3_AVAILABLE", False)
def test_build_url_with_trailing_slash_in_public_url(s3_settings):
    settings_with_slash = s3_settings.copy()
    settings_with_slash["public_url"] = (
        "https://test-bucket.s3.us-west-1.amazonaws.com/"
    )
    service = S3StorageService(**settings_with_slash)
    file_path = "some/file/path.txt"
    expected_url = f"{s3_settings['public_url']}/{file_path}"
    assert service._build_url(file_path) == expected_url


# --- upload_file Tests ---
@patch.object(s3_storage_module, "ClientError", create=True)
@patch.object(s3_storage_module, "boto3", create=True)
@patch.object(s3_storage_module, "BOTO3_AVAILABLE", True)
def test_upload_file_bytesio_with_boto3(
    mock_s3_boto3, _mock_s3_clienterror, s3_settings
):
    mock_s3_client_instance = MagicMock()
    mock_s3_boto3.client.return_value = mock_s3_client_instance
    service = S3StorageService(**s3_settings)

    file_data_content = b"test data"
    file_data_io = BytesIO(file_data_content)
    original_pos = file_data_io.tell()
    file_path = "test/file.txt"
    url = service.upload_file(file_data_io, file_path)

    mock_s3_client_instance.upload_fileobj.assert_called_once_with(
        file_data_io, s3_settings["bucket"], file_path
    )
    assert file_data_io.tell() == original_pos
    assert url == f"{s3_settings['public_url']}/{file_path}"


@patch.object(s3_storage_module, "ClientError", create=True)
@patch.object(s3_storage_module, "boto3", create=True)
@patch.object(s3_storage_module, "BOTO3_AVAILABLE", True)
def test_upload_file_bytes_with_boto3(mock_s3_boto3, _mock_s3_clienterror, s3_settings):
    mock_s3_client_instance = MagicMock()
    mock_s3_boto3.client.return_value = mock_s3_client_instance
    service = S3StorageService(**s3_settings)

    file_data_bytes = b"test data bytes"
    file_path = "test/file_bytes.txt"
    url = service.upload_file(file_data_bytes, file_path)

    mock_s3_client_instance.put_object.assert_called_once_with(
        Bucket=s3_settings["bucket"], Key=file_path, Body=file_data_bytes
    )
    assert url == f"{s3_settings['public_url']}/{file_path}"


@patch.object(s3_storage_module, "BOTO3_AVAILABLE", False)
def test_upload_file_bytesio_with_mock_client(s3_settings):
    with patch.object(
        s3_storage_module, "ClientError", s3_storage_module.MockClientError
    ):  # Ensure ClientError is the mock one
        service = S3StorageService(**s3_settings)
    file_data_content = b"mock test data"
    file_data_io = BytesIO(file_data_content)
    original_pos = file_data_io.tell()
    file_path = "mock/file.txt"
    url = service.upload_file(file_data_io, file_path)
    assert file_path in service.client.objects
    assert service.client.objects[file_path] == file_data_content
    assert file_data_io.tell() == original_pos
    assert url == f"{s3_settings['public_url']}/{file_path}"


@patch.object(s3_storage_module, "BOTO3_AVAILABLE", False)
def test_upload_file_bytes_with_mock_client(s3_settings):
    with patch.object(
        s3_storage_module, "ClientError", s3_storage_module.MockClientError
    ):
        service = S3StorageService(**s3_settings)
    file_data_bytes = b"mock test data bytes"
    file_path = "mock/file_bytes.txt"
    url = service.upload_file(file_data_bytes, file_path)
    assert file_path in service.client.objects
    assert service.client.objects[file_path] == file_data_bytes
    assert url == f"{s3_settings['public_url']}/{file_path}"


# --- get_file_url Tests ---
@patch.object(s3_storage_module, "BOTO3_AVAILABLE", False)
def test_get_file_url(s3_settings):
    service = S3StorageService(**s3_settings)
    file_path = "my/file.zip"
    expected_url = f"{s3_settings['public_url']}/{file_path}"
    assert service.get_file_url(file_path) == expected_url


# --- delete_file Tests ---
@patch.object(s3_storage_module, "ClientError", create=True)
@patch.object(s3_storage_module, "boto3", create=True)
@patch.object(s3_storage_module, "BOTO3_AVAILABLE", True)
def test_delete_file_success_with_boto3(
    mock_s3_boto3, _mock_s3_clienterror, s3_settings
):
    mock_s3_client_instance = MagicMock()
    mock_s3_boto3.client.return_value = mock_s3_client_instance
    service = S3StorageService(**s3_settings)
    file_path = "to/delete.txt"
    result = service.delete_file(file_path)
    assert result is True
    mock_s3_client_instance.delete_object.assert_called_once_with(
        Bucket=s3_settings["bucket"], Key=file_path
    )


@patch.object(s3_storage_module, "ClientError", create=True)
@patch.object(s3_storage_module, "boto3", create=True)
@patch.object(s3_storage_module, "BOTO3_AVAILABLE", True)
def test_delete_file_failure_with_boto3(
    mock_s3_boto3, _mock_s3_clienterror, s3_settings
):
    mock_s3_client_instance = MagicMock()
    mock_s3_client_instance.delete_object.side_effect = Exception("S3 delete error")
    mock_s3_boto3.client.return_value = mock_s3_client_instance
    service = S3StorageService(**s3_settings)
    result = service.delete_file("to/delete_fail.txt")
    assert result is False


@patch.object(s3_storage_module, "BOTO3_AVAILABLE", False)
def test_delete_file_with_mock_client(s3_settings):
    with patch.object(
        s3_storage_module, "ClientError", s3_storage_module.MockClientError
    ):
        service = S3StorageService(**s3_settings)
    file_path = "mock/to_delete.txt"
    service.client.objects[file_path] = b"some data"
    assert service.delete_file(file_path) is True
    assert file_path not in service.client.objects
    assert service.delete_file("non/existent.txt") is True


# --- file_exists Tests ---
@patch.object(
    s3_storage_module, "ClientError", create=True
)  # This will be MockBotocoreClientError for the test
@patch.object(s3_storage_module, "boto3", create=True)
@patch.object(s3_storage_module, "BOTO3_AVAILABLE", True)
def test_file_exists_true_with_boto3(
    mock_s3_boto3, _mock_s3_clienterror_class_mock, s3_settings
):
    mock_s3_client_instance = MagicMock()
    mock_s3_boto3.client.return_value = mock_s3_client_instance
    # mock_s3_clienterror_class_mock is the class mock for ClientError in s3_storage_module's scope
    service = S3StorageService(**s3_settings)
    mock_s3_client_instance.head_object.return_value = {
        "ResponseMetadata": {"HTTPStatusCode": 200}
    }
    assert service.file_exists("existing/file.txt") is True
    mock_s3_client_instance.head_object.assert_called_once_with(
        Bucket=s3_settings["bucket"], Key="existing/file.txt"
    )


@patch.object(
    s3_storage_module,
    "ClientError",
    new_callable=lambda: MockBotocoreClientError,
    create=True,
)  # Patch with our defined mock error
@patch.object(s3_storage_module, "boto3", create=True)
@patch.object(s3_storage_module, "BOTO3_AVAILABLE", True)
def test_file_exists_false_with_boto3(
    mock_s3_boto3, _MockedClientError, s3_settings
):  # MockedClientError is now s3_storage_module.ClientError
    mock_s3_client_instance = MagicMock()
    mock_s3_boto3.client.return_value = mock_s3_client_instance
    service = S3StorageService(**s3_settings)

    # Ensure the service instance is using the correctly patched ClientError
    # The S3StorageService instance will internally reference s3_storage_module.ClientError
    # which we've patched to be MockBotocoreClientError for this test.
    mock_s3_client_instance.head_object.side_effect = MockBotocoreClientError(
        {}, "HeadObject"
    )
    assert service.file_exists("non_existing/file.txt") is False


@patch.object(s3_storage_module, "BOTO3_AVAILABLE", False)
def test_file_exists_with_mock_client(s3_settings):
    with patch.object(
        s3_storage_module, "ClientError", s3_storage_module.MockClientError
    ):
        service = S3StorageService(**s3_settings)
    existing_path = "mock/exists.txt"
    non_existing_path = "mock/not_exists.txt"
    service.client.objects[existing_path] = b"data"
    assert service.file_exists(existing_path) is True
    assert service.file_exists(non_existing_path) is False
