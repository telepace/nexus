
from app.crud.base import CRUDBase
from app.models.user_favorite_prompt import UserFavoritePrompt
from app.schemas.user_favorite_prompt import (
    UserFavoritePromptCreate,
    UserFavoritePromptUpdate,
)


class CRUDUserFavoritePrompt(CRUDBase[UserFavoritePrompt, UserFavoritePromptCreate, UserFavoritePromptUpdate]):
    pass


user_favorite_prompt = CRUDUserFavoritePrompt(UserFavoritePrompt)

