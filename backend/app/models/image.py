import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlmodel import Field, Relationship, SQLModel

# 导入时区工具
from app.utils.timezone import now_utc

# 避免循环导入
if TYPE_CHECKING:
    from app.base import User


class Image(SQLModel, table=True):
    __tablename__ = "images"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    source_url: str | None = None
    s3_key: str | None = None  # Key for S3 or R2 storage

    # Type of image: e.g., 'embedded', 'linked', 'stored'
    type: str | None = None
    size: int | None = None  # Size in bytes
    format: str | None = None  # E.g., 'png', 'jpeg', 'gif'
    alt_text: str | None = None

    # Importance: e.g., 'high', 'medium', 'low'
    importance: str | None = None
    last_checked: datetime | None = None  # Last time the image was checked
    is_accessible: bool | None = Field(
        default=False
    )  # If the image is currently accessible

    # Foreign key to User table
    owner_id: uuid.UUID = Field(foreign_key="user.id")

    # Relationship to User
    owner: Optional["User"] = Relationship(back_populates="images")

    created_at: datetime = Field(default_factory=now_utc)
    updated_at: datetime = Field(default_factory=now_utc)

    def __repr__(self):
        return f"<Image(id={self.id}, type='{self.type}', format='{self.format}', owner_id='{self.owner_id}')>"
