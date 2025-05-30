import abc
import logging

# Configure basic logging for the mock storage
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class StorageInterface(abc.ABC):
    """
    Abstract Base Class for storage operations.
    """

    @abc.abstractmethod
    async def upload_file(
        self,
        file_content: bytes,
        destination_blob_name: str,
        content_type: str | None = None,
    ) -> str:
        """
        Uploads file content to destination_blob_name.
        Returns the public URL or identifier of the uploaded file.
        """
        pass

    @abc.abstractmethod
    async def download_file(self, source_blob_name: str) -> bytes:
        """
        Downloads a file from source_blob_name.
        Returns file content as bytes.
        """
        pass

    @abc.abstractmethod
    async def get_public_url(self, blob_name: str) -> str:
        """
        Returns a publicly accessible URL for the given blob_name.
        """
        pass

    @abc.abstractmethod
    async def delete_file(self, blob_name: str) -> None:
        """
        Deletes a file from storage.
        """
        pass

    @abc.abstractmethod
    async def get_presigned_url(self, blob_name: str, content_type: str) -> str:
        """
        Generates a presigned URL for uploading a file.
        """
        pass


class MockStorage(StorageInterface):
    """
    Mock implementation of the StorageInterface.
    Simulates storage operations without actual network calls.
    Uses an in-memory dictionary to simulate storage for more robust mocking if needed,
    but primarily logs actions and returns predefined values.
    """

    def __init__(self, bucket_name: str = "mock-bucket"):
        self.bucket_name = bucket_name
        self.mock_db: dict[str, bytes] = {}  # In-memory storage
        logger.info(f"MockStorage initialized for bucket: {self.bucket_name}")

    async def upload_file(
        self,
        file_content: bytes,
        destination_blob_name: str,
        content_type: str | None = None,
    ) -> str:
        self.mock_db[destination_blob_name] = file_content
        public_url = f"mock_r2_url/{self.bucket_name}/{destination_blob_name}"
        logger.info(
            f"Mock Upload: File '{destination_blob_name}' (content_type: {content_type}, size: {len(file_content)} bytes) "
            f"uploaded to {public_url}. Content stored in mock_db."
        )
        return public_url

    async def download_file(self, source_blob_name: str) -> bytes:
        if source_blob_name in self.mock_db:
            content = self.mock_db[source_blob_name]
            logger.info(
                f"Mock Download: File '{source_blob_name}' downloaded from mock_db (size: {len(content)} bytes)."
            )
            return content
        else:
            logger.warning(
                f"Mock Download: File '{source_blob_name}' not found in mock_db. Returning empty bytes."
            )
            return b""

    async def get_public_url(self, blob_name: str) -> str:
        # Check if the blob actually "exists" in our mock_db for a slightly more realistic mock
        if blob_name in self.mock_db:
            url = f"https://{self.bucket_name}.mock.r2.dev/{blob_name}"
            logger.info(f"Mock Get URL: Public URL for '{blob_name}' is {url}")
            return url
        else:
            # Still return a plausible URL, but log that it's for a non-existent file
            url = f"https://{self.bucket_name}.mock.r2.dev/{blob_name}"
            logger.info(
                f"Mock Get URL: Public URL for non-existent file '{blob_name}' is {url} (file not in mock_db)"
            )
            return url

    async def delete_file(self, blob_name: str) -> None:
        if blob_name in self.mock_db:
            del self.mock_db[blob_name]
            logger.info(f"Mock Delete: File '{blob_name}' deleted from mock_db.")
        else:
            logger.warning(
                f"Mock Delete: File '{blob_name}' not found in mock_db. No action taken."
            )

    async def get_presigned_url(self, blob_name: str, content_type: str) -> str:
        url = f"mock_presigned_url/{self.bucket_name}/{blob_name}?content_type={content_type}"
        logger.info(
            f"Mock Get Presigned URL: Presigned URL for '{blob_name}' with content_type '{content_type}' is {url}"
        )
        return url


# Factory function to get the appropriate storage implementation
def get_storage() -> StorageInterface:
    """Get the storage service implementation based on configuration.

    Currently returns a MockStorage instance, but in production this would
    return the appropriate storage implementation based on configuration.

    Returns:
        StorageInterface: The storage service implementation
    """
    # TODO: In production, choose the appropriate storage implementation based on configuration
    # For now, return a MockStorage instance
    return MockStorage()


print("StorageInterface and MockStorage created in backend/app/core/storage.py")
