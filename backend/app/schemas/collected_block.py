import datetime
import uuid
from typing import Any

from sqlmodel import SQLModel


class CollectedBlockBase(SQLModel):
    block_content: dict[str, Any]
    block_type: str
    source_analysis_id: str
    source_document_id: str | None = None

class CollectedBlockCreate(CollectedBlockBase):
    pass

class CollectedBlockPublic(CollectedBlockBase):
    id: int
    user_id: uuid.UUID
    created_at: datetime.datetime

class CollectedBlocksPublic(SQLModel):
    data: list[CollectedBlockPublic]
    count: int

