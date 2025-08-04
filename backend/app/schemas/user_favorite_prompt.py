
import uuid

from pydantic import BaseModel


class UserFavoritePromptBase(BaseModel):
    prompt_id: uuid.UUID


class UserFavoritePromptCreate(UserFavoritePromptBase):
    pass


class UserFavoritePromptUpdate(UserFavoritePromptBase):
    pass


class UserFavoritePromptInDBBase(UserFavoritePromptBase):
    id: uuid.UUID
    user_id: uuid.UUID

    class Config:
        from_attributes = True


class UserFavoritePrompt(UserFavoritePromptInDBBase):
    pass

