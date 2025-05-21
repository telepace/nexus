from fastapi import APIRouter

from app.api.routes import google_oauth, items, login, private, prompts, users, utils
from app.core.config import settings

api_router = APIRouter()
api_router.include_router(login.router)
api_router.include_router(users.router)
api_router.include_router(utils.router)
api_router.include_router(items.router)
api_router.include_router(google_oauth.router)
api_router.include_router(prompts.router, prefix="/prompts", tags=["prompts"])


if settings.ENVIRONMENT == "local":
    api_router.include_router(private.router)
