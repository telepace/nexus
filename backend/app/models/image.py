import uuid
from datetime import datetime
from typing import Optional, TYPE_CHECKING, List, Any

from sqlmodel import Field, SQLModel, Relationship

# 避免循环导入
if TYPE_CHECKING:
    from app.models.user import User


class Image(SQLModel, table=True):
    __tablename__ = "images"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    source_url: Optional[str] = None
    s3_key: Optional[str] = None  # Key for S3 or R2 storage

    # Type of image: e.g., 'embedded', 'linked', 'stored'
    type: Optional[str] = None
    size: Optional[int] = None  # Size in bytes
    format: Optional[str] = None  # E.g., 'png', 'jpeg', 'gif'
    alt_text: Optional[str] = None

    # Importance: e.g., 'high', 'medium', 'low'
    importance: Optional[str] = None
    last_checked: Optional[datetime] = None  # Last time the image was checked
    is_accessible: Optional[bool] = Field(default=False)  # If the image is currently accessible

    # Foreign key to User table
    owner_id: uuid.UUID = Field(foreign_key="users.id")

    # Relationship to User
    owner: Optional["User"] = Relationship(back_populates="images")

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    def __repr__(self):
        return f"<Image(id={self.id}, type='{self.type}', format='{self.format}', owner_id='{self.owner_id}')>"
