import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


# Base Pydantic model for common image attributes
class ImageBase(BaseModel):
    source_url: Optional[str] = None
    s3_key: Optional[str] = None
    type: Optional[str] = None  # E.g., 'embedded', 'linked', 'user_uploaded'
    size: Optional[int] = None  # Size in bytes
    format: Optional[str] = None  # E.g., 'png', 'jpeg', 'gif', 'webp'
    alt_text: Optional[str] = None
    importance: Optional[str] = None  # E.g., 'decorative', 'informative', 'critical'
    is_accessible: Optional[bool] = False

    class Config:
        from_attributes = True # Replaces orm_mode = True in Pydantic v2


# Schema for creating an image (input)
class ImageCreate(ImageBase):
    # owner_id will be set from the current user in the API endpoint
    s3_key: Optional[str] = None # Made optional to support 'keep_link' strategy
    # type might also be determined or validated server-side
    # format might be determined server-side


# Schema for updating an image (input)
# All fields are optional for updates
class ImageUpdate(ImageBase):
    source_url: Optional[str] = None
    s3_key: Optional[str] = None
    type: Optional[str] = None
    size: Optional[int] = None
    format: Optional[str] = None
    alt_text: Optional[str] = None
    importance: Optional[str] = None
    is_accessible: Optional[bool] = None


# Schema for returning an image (output)
class ImageResponse(ImageBase):
    id: uuid.UUID
    owner_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    last_checked: Optional[datetime] = None

    # If you want to include the full owner object, you would add:
    # owner: Optional[UserResponse] = None # Assuming UserResponse schema exists

# Schema for requesting a presigned URL
class PresignedURLRequest(BaseModel):
    filename: str
    content_type: str

# Schema for the response containing the presigned URL
class PresignedURLResponse(BaseModel):
    presigned_url: str
    s3_key: str # This is the destination_blob_name
    # client_upload_url: str # Optional: if you want to return the URL the client should use for the PUT request (same as presigned_url)
    # public_access_url: str # Optional: if you want to return the final public URL after upload (might not be known yet)
