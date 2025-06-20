import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.core.storage import StorageInterface  # For type hinting mocks
from app.schemas.image import ImageCreate
from app.utils.image_processor import (
    PYMUPDF_AVAILABLE,  # To conditionally skip tests or mock differently
    assess_image_importance,
    check_image_accessibility,
    extract_images_from_pdf,
    process_base64_image,
    process_web_image,
)


# --- Mock StorageInterface ---
class MockStorage(StorageInterface):
    async def upload_file(
        self,
        file_content: bytes,
        destination_blob_name: str,
        content_type: str | None = None,
    ) -> str:
        return f"mock_public_url/{destination_blob_name}"

    async def download_file(self, source_blob_name: str) -> bytes:
        return b"mock_file_content"

    async def get_public_url(self, blob_name: str) -> str:
        return f"mock_public_url/{blob_name}"

    async def delete_file(self, blob_name: str) -> None:
        pass

    async def get_presigned_url(self, blob_name: str, content_type: str) -> str:
        return f"mock_presigned_url/{blob_name}?contentType={content_type}"


# --- Tests for extract_images_from_pdf ---
@patch("app.utils.image_processor.fitz")
def test_extract_images_from_pdf_success(mock_fitz):
    if not PYMUPDF_AVAILABLE:
        pytest.skip("PyMuPDF (fitz) not installed, skipping dependent test")

    # Configure mock for fitz.open() and subsequent calls
    mock_doc = MagicMock()
    mock_page = MagicMock()

    mock_doc.page_count = 1
    mock_doc.load_page.return_value = mock_page
    mock_page.get_images.return_value = [
        (7, 0, 100, 100, 8, "DeviceRGB", "", "Image1", "", 0)
    ]
    mock_doc.extract_image.return_value = {"image": b"fake_image_bytes", "ext": "png"}

    mock_fitz.open.return_value = mock_doc

    pdf_content = b"%PDF-1.4 fake content"
    images = extract_images_from_pdf(pdf_content)

    assert images == [b"fake_image_bytes"]
    mock_fitz.open.assert_called_once_with(stream=pdf_content, filetype="pdf")
    mock_doc.load_page.assert_called_once_with(0)
    mock_page.get_images.assert_called_once_with(full=True)
    mock_doc.extract_image.assert_called_once_with(7)  # 7 is the xref from get_images
    mock_doc.close.assert_called_once()


@patch("app.utils.image_processor.fitz")
def test_extract_images_from_pdf_fitz_error(mock_fitz):
    if not PYMUPDF_AVAILABLE:
        pytest.skip("PyMuPDF (fitz) not installed, skipping dependent test")

    mock_fitz.open.side_effect = Exception("Fitz Error")

    pdf_content = b"%PDF-1.4 fake content"
    images = extract_images_from_pdf(pdf_content)

    assert images == []


def test_extract_images_from_pdf_no_fitz():
    if PYMUPDF_AVAILABLE:
        pytest.skip("PyMuPDF (fitz) is installed, skipping this specific test")

    # Temporarily patch PYMUPDF_AVAILABLE to False for this test if it was True
    with patch("app.utils.image_processor.PYMUPDF_AVAILABLE", False):
        with pytest.raises(RuntimeError, match=r"PyMuPDF \(fitz\) is not installed"):
            extract_images_from_pdf(b"dummy_pdf_content")


# --- Tests for process_web_image ---
@pytest.fixture
def mock_storage_service():
    return MockStorage()


@pytest.mark.asyncio
async def test_process_web_image_keep_link(mock_storage_service):
    image_url = "http://example.com/image.png"
    result = await process_web_image(
        image_url, strategy="keep_link", storage=mock_storage_service
    )

    assert isinstance(result, ImageCreate)
    assert result.source_url == image_url
    assert result.type == "linked"
    assert result.format == "png"
    assert result.s3_key is None


@pytest.mark.asyncio
@patch("app.utils.image_processor.httpx.AsyncClient")
async def test_process_web_image_download_success(
    mock_async_client, mock_storage_service
):
    image_url = "http://example.com/image.jpg"
    user_id = uuid.uuid4()

    # Mock httpx response
    mock_response = MagicMock()
    mock_response.content = b"fake_image_data"
    mock_response.headers = {"Content-Type": "image/jpeg"}
    mock_response.raise_for_status = MagicMock()  # Ensure this doesn't raise error

    # Configure the mock client's get method to return an AsyncMock
    mock_get = AsyncMock(return_value=mock_response)
    mock_async_client.return_value.__aenter__.return_value.get = mock_get

    # Mock storage upload_file
    mock_storage_service.upload_file = AsyncMock(
        return_value=f"mock_public_url/user_images/{user_id}/some_uuid.jpg"
    )

    result = await process_web_image(
        image_url, strategy="download", user_id=user_id, storage=mock_storage_service
    )

    assert isinstance(result, ImageCreate)
    assert result.source_url == image_url
    assert result.type == "stored_web"
    assert result.format == "jpg"
    assert result.s3_key is not None
    assert str(user_id) in result.s3_key
    assert result.size == len(b"fake_image_data")

    mock_get.assert_called_once_with(image_url)
    mock_storage_service.upload_file.assert_called_once()


@pytest.mark.asyncio
@patch("app.utils.image_processor.httpx.AsyncClient")
async def test_process_web_image_download_failure(
    mock_async_client, mock_storage_service
):
    image_url = "http://example.com/nonexistent.png"
    user_id = uuid.uuid4()

    mock_async_client.return_value.__aenter__.return_value.get.side_effect = Exception(
        "Download failed"
    )

    result = await process_web_image(
        image_url, strategy="download", user_id=user_id, storage=mock_storage_service
    )
    assert result is None


# --- Tests for process_base64_image ---
@pytest.mark.asyncio
async def test_process_base64_image_success(mock_storage_service):
    user_id = uuid.uuid4()
    base64_string = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAABAADCAYAAACCxI/AAAAAElFTkSuQmCC"  # Minimal PNG

    mock_storage_service.upload_file = AsyncMock(
        return_value=f"mock_public_url/user_images/{user_id}/some_uuid.png"
    )

    result = await process_base64_image(base64_string, user_id, mock_storage_service)

    assert isinstance(result, ImageCreate)
    assert result.type == "stored_base64"
    assert result.format == "png"
    assert result.s3_key is not None
    assert str(user_id) in result.s3_key
    assert result.size > 0
    mock_storage_service.upload_file.assert_called_once()


@pytest.mark.asyncio
async def test_process_base64_image_invalid_string(mock_storage_service):
    user_id = uuid.uuid4()
    base64_string = "not_base64_at_all"
    result = await process_base64_image(base64_string, user_id, mock_storage_service)
    assert result is None


# --- Tests for assess_image_importance ---
def test_assess_image_importance():
    assert assess_image_importance(image_size=50 * 1024) == "medium"  # 50KB
    assert assess_image_importance(image_size=150 * 1024) == "high"  # 150KB
    assert (
        assess_image_importance(image_size=5 * 1024) == "medium"
    )  # 5KB - based on current logic
    assert assess_image_importance(image_size=None) == "medium"


# --- Tests for check_image_accessibility ---
@pytest.mark.asyncio
@patch("app.utils.image_processor.httpx.AsyncClient")
async def test_check_image_accessibility_reachable(mock_async_client):
    image_url = "http://example.com/reachable.png"

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_head = AsyncMock(return_value=mock_response)
    mock_async_client.return_value.__aenter__.return_value.head = mock_head

    assert await check_image_accessibility(image_url) is True
    mock_head.assert_called_once_with(image_url, timeout=5.0)


@pytest.mark.asyncio
@patch("app.utils.image_processor.httpx.AsyncClient")
async def test_check_image_accessibility_unreachable(mock_async_client):
    image_url = "http://example.com/unreachable.png"

    mock_async_client.return_value.__aenter__.return_value.head.side_effect = Exception(
        "HTTP Error"
    )

    assert await check_image_accessibility(image_url) is False


@pytest.mark.asyncio
async def test_check_image_accessibility_no_url():
    assert await check_image_accessibility(None) is True


# Add more tests for edge cases, different image formats, error conditions etc.
