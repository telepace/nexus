import base64
import io
import uuid
from pathlib import Path
from typing import Any, List, Optional, Tuple

import httpx # For web image fetching and accessibility check

# Attempt to import PyMuPDF (fitz)
try:
    import fitz  # PyMuPDF
    PYMUPDF_AVAILABLE = True
except ImportError:
    PYMUPDF_AVAILABLE = False
    # Create a dummy fitz object to avoid NameError if not installed
    class DummyFitzPage:
        def get_images(self, full=True):
            return []

    class DummyFitzDoc:
        def __init__(self, *args, **kwargs):
            pass
        def close(self):
            pass
        @property
        def page_count(self): # Use @property for page_count
            return 0
        def load_page(self, page_num):
            # Should return a dummy page object that can have get_images called on it
            # For simplicity, or raise if this path indicates a problem
            # raise RuntimeError("PyMuPDF (fitz) is not installed, cannot load page.")
            return DummyFitzPage() # Return a dummy page
        def extract_image(self, xref):
             return None # Or a dict with an empty "image" key if expected by caller

    class DummyFitz:
        def open(self, *args, **kwargs):
            # print("Warning: PyMuPDF (fitz) is not installed. PDF processing will not be available.")
            return DummyFitzDoc()

    fitz = DummyFitz()


from sqlalchemy.ext.asyncio import AsyncSession # Placeholder

from app.core.storage import StorageInterface
from app.schemas.image import ImageCreate


# --- 1. PDF Image Extraction ---
def extract_images_from_pdf(pdf_content: bytes) -> list[bytes]:
    """
    Extracts images from PDF content.
    Requires PyMuPDF (fitz) to be installed.
    """
    if not PYMUPDF_AVAILABLE:
        raise RuntimeError("PyMuPDF (fitz) is not installed. PDF processing unavailable.")

    images_bytes_list: list[bytes] = []
    pdf_document = None # Initialize to None
    try:
        pdf_document = fitz.open(stream=pdf_content, filetype="pdf")
        for page_num in range(pdf_document.page_count): # Use property
            page = pdf_document.load_page(page_num)
            image_list = page.get_images(full=True)

            for img_info in image_list:
                xref = img_info[0]
                base_image = pdf_document.extract_image(xref)
                if base_image and base_image.get("image"):
                    images_bytes_list.append(base_image["image"])
    except Exception as e:
        # print(f"Error processing PDF: {e}") # Consider proper logging
        # Depending on desired behavior, you might re-raise, or return partial results, or empty.
        # For now, returns what was collected before error.
        pass # Fall through to finally block
    finally:
        if pdf_document:
            pdf_document.close()
    return images_bytes_list


# --- 2. Web Image Handling ---
async def process_web_image(
    image_url: str,
    strategy: str = "keep_link",
    user_id: Optional[uuid.UUID] = None,
    storage: Optional[StorageInterface] = None,
    # db: Optional[AsyncSession] = None, # db not used directly here
) -> Optional[ImageCreate]:
    """
    Processes an image from a URL based on the given strategy.
    """
    if strategy == "keep_link":
        image_format: Optional[str] = Path(image_url).suffix[1:].lower() or None
        return ImageCreate(
            source_url=image_url,
            type='linked',
            format=image_format,
            s3_key=None # Explicitly None for linked images
        )

    elif strategy == "download":
        if not all([user_id, storage]):
            # print("Error: For 'download' strategy, user_id and storage service must be provided.")
            return None # Or raise ValueError
        
        try:
            async with httpx.AsyncClient(follow_redirects=True) as client:
                response = await client.get(image_url)
                response.raise_for_status()
            
            image_content = response.content
            image_size = len(image_content)
            
            content_type = response.headers.get("Content-Type", "")
            if "image/jpeg" in content_type or "image/jpg" in content_type:
                image_format = "jpg"
            elif "image/png" in content_type:
                image_format = "png"
            elif "image/gif" in content_type:
                image_format = "gif"
            elif "image/webp" in content_type:
                image_format = "webp"
            else:
                image_format = Path(image_url).suffix[1:].lower() or "bin"

            s3_key = f"user_images/{user_id}/{uuid.uuid4()}.{image_format}"
            
            storage_content_type = f"image/{image_format}"
            if image_format == "bin":
                storage_content_type = "application/octet-stream"

            await storage.upload_file(
                file_content=image_content,
                destination_blob_name=s3_key,
                content_type=storage_content_type
            )
            
            return ImageCreate(
                source_url=image_url,
                s3_key=s3_key,
                type='stored_web',
                size=image_size,
                format=image_format,
            )
        except httpx.HTTPStatusError as e:
            # print(f"HTTP error downloading image {image_url}: {e.response.status_code}")
            return None
        except httpx.RequestError as e:
            # print(f"Network error downloading image {image_url}: {e}")
            return None
        except Exception as e:
            # print(f"Error processing web image {image_url} with 'download' strategy: {e}")
            return None
    else:
        # print(f"Unknown image processing strategy: {strategy}")
        return None


# --- 3. Base64 Image Handling ---
def _extract_format_from_base64_prefix(base64_string: str) -> Tuple[Optional[str], str]:
    if base64_string.startswith("data:image/"):
        try:
            header, data = base64_string.split(",", 1)
            mime_type_part = header.split(";")[0]
            if "/" in mime_type_part:
                image_format = mime_type_part.split("/")[1]
                return image_format.lower(), data
            return None, base64_string # Malformed prefix
        except ValueError:
            return None, base64_string
    return None, base64_string


async def process_base64_image(
    base64_string: str,
    user_id: uuid.UUID,
    storage: StorageInterface,
    # db: Optional[AsyncSession] = None, # db not used directly here
) -> Optional[ImageCreate]:
    try:
        image_format, raw_base64_data = _extract_format_from_base64_prefix(base64_string)
        image_content = base64.b64decode(raw_base64_data)
        image_size = len(image_content)

        if not image_format:
            image_format = "bin" # Default if format cannot be determined

        s3_key = f"user_images/{user_id}/{uuid.uuid4()}.{image_format}"
        
        content_type_for_storage = f"image/{image_format}"
        if image_format == "bin":
            content_type_for_storage = "application/octet-stream"

        await storage.upload_file(
            file_content=image_content,
            destination_blob_name=s3_key,
            content_type=content_type_for_storage
        )
        
        return ImageCreate(
            s3_key=s3_key,
            type='stored_base64',
            size=image_size,
            format=image_format,
            source_url=None # No external source URL for base64
        )
    except base64.binascii.Error as e:
        # print(f"Base64 decoding error: {e}")
        return None
    except Exception as e:
        # print(f"Error processing base64 image: {e}")
        return None


# --- 4. Image Importance Assessment (Placeholder/Basic) ---
def assess_image_importance(
    image_size: Optional[int] = None,
    image_format: Optional[str] = None, # Parameter kept for future use
    context: Optional[str] = None # Parameter kept for future use
) -> str:
    """
    Basic assessment of image importance based on size.
    'image_format' and 'context' are placeholders for future, more advanced logic.
    """
    if image_size is not None:
        if image_size > 100 * 1024:  # > 100KB
            return "high"
    return "medium" # Default if size is not provided or not over threshold


# --- 5. Image Accessibility Check (Placeholder/Basic) ---
async def check_image_accessibility(image_url: Optional[str]) -> bool:
    """
    Basic check for image accessibility (if it's a URL).
    Attempts a HEAD request to see if the URL is reachable.
    """
    if not image_url:
        # For stored images or images without a direct public URL,
        # accessibility might be determined by other factors (e.g., alt text presence).
        # For this specific check (URL reachability), if no URL, assume not checkable this way.
        # Or return True if "no URL" means it's a local/stored asset assumed to be fine.
        # Let's be explicit: if no URL, this specific check cannot pass.
        # However, the prompt said "assume it's accessible (True)" if no image_url.
        return True 

    try:
        async with httpx.AsyncClient(follow_redirects=True) as client:
            response = await client.head(image_url, timeout=5.0)
            return 200 <= response.status_code < 300
    except (httpx.HTTPStatusError, httpx.RequestError, httpx.TimeoutException):
        return False
    except Exception: # Catch any other unexpected errors
        return False

# Example usage (for testing, would be removed or in a test file)
# async def main():
#     # This is just for demonstration if run directly, not part of the module's API
#     print(f"PyMuPDF available: {PYMUPDF_AVAILABLE}")
#     # Test assess_image_importance
#     print(f"Importance (200KB): {assess_image_importance(image_size=200*1024)}")
#     print(f"Importance (50KB): {assess_image_importance(image_size=50*1024)}")
#     print(f"Importance (None): {assess_image_importance(image_size=None)}")

#     # Test check_image_accessibility
#     accessible = await check_image_accessibility("https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png")
#     print(f"Google logo accessible: {accessible}")
#     not_accessible = await check_image_accessibility("https://example.com/nonexistent.png")
#     print(f"Nonexistent image accessible: {not_accessible}")
#     no_url_accessible = await check_image_accessibility(None)
#     print(f"No URL accessible: {no_url_accessible}")
    
# if __name__ == "__main__":
#     import asyncio
#     asyncio.run(main())
