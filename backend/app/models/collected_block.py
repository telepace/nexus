import datetime
import uuid
from typing import Any

from sqlmodel import JSON, Column, Field, SQLModel


class CollectedBlock(SQLModel, table=True):
    __tablename__ = "collected_blocks"

    id: int = Field(default=None, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id")
    block_content: dict[str, Any] = Field(sa_column=Column(JSON))
    block_type: str
    source_analysis_id: str
    source_document_id: str = Field(nullable=True)
    created_at: datetime.datetime = Field(default_factory=datetime.datetime.utcnow)
