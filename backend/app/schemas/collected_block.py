from typing import Any, Dict, Optional
from sqlmodel import Field, SQLModel
import datetime
import uuid

class CollectedBlockBase(SQLModel):
    block_content: Dict[str, Any]
    block_type: str
    source_analysis_id: str
    source_document_id: Optional[str] = None

class CollectedBlockCreate(CollectedBlockBase):
    pass

class CollectedBlockPublic(CollectedBlockBase):
    id: int
    user_id: uuid.UUID
    created_at: datetime.datetime

class CollectedBlocksPublic(SQLModel):
    data: list[CollectedBlockPublic]
    count: int

