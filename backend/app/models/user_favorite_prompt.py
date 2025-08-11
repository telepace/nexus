import uuid
from datetime import datetime

from sqlmodel import Field, SQLModel


class UserFavoritePrompt(SQLModel, table=True):
    __tablename__ = "user_favorite_prompts"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id")
    prompt_id: uuid.UUID = Field(foreign_key="prompts.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
