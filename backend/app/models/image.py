import uuid

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.db import Base  # Assuming Base is in app.core.db


class Image(Base):
    __tablename__ = "images"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_url = Column(String, nullable=True)
    s3_key = Column(String, nullable=True)  # Key for S3 or R2 storage

    # Type of image: e.g., 'embedded', 'linked', 'stored'
    type = Column(String, nullable=True)
    size = Column(Integer, nullable=True)  # Size in bytes
    format = Column(String, nullable=True)  # E.g., 'png', 'jpeg', 'gif'
    alt_text = Column(String, nullable=True)

    # Importance: e.g., 'high', 'medium', 'low'
    importance = Column(String, nullable=True)
    last_checked = Column(DateTime, nullable=True)  # Last time the image was checked (e.g., for accessibility or existence)
    is_accessible = Column(Boolean, default=False, nullable=True) # If the image is currently accessible

    # Foreign key to User table (assuming User model exists and has a UUID id)
    # Assuming user.id is also of type UUID. If it's Integer, change accordingly.
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False) # Changed users.id from user.id
    
    # Relationship to User (optional, but good for ORM features)
    # The name 'owner' will be used to access the related User object from an Image instance
    owner = relationship("User", back_populates="images") # Assumes User model has an 'images' relationship

    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    def __repr__(self):
        return f"<Image(id={self.id}, type='{self.type}', format='{self.format}', owner_id='{self.owner_id}')>"
