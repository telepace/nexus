"""Base schemas and mixins for the application."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel
from sqlmodel import SQLModel


class TimestampMixin(SQLModel):
    """Mixin for models with timestamp fields."""
    
    created_at: datetime
    updated_at: datetime


class BaseSchema(BaseModel):
    """Base schema with common configuration."""
    
    class Config:
        from_attributes = True
        populate_by_name = True 