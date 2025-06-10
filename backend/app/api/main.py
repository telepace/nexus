from fastapi import APIRouter

from app.api.routes import (
    chat,  # Add chat router
    content,  # Add content router
    dashboard,  # Add dashboard router
    google_oauth,
    images,  # Added images router
    items,
    llm_service,
    login,
    private,
    prompts,
    users,
    utils,
)
from app.core.config import settings

api_router = APIRouter()
api_router.include_router(login.router)
api_router.include_router(users.router)
api_router.include_router(utils.router)
api_router.include_router(items.router)
api_router.include_router(google_oauth.router)
api_router.include_router(prompts.router, prefix="/prompts", tags=["prompts"])
api_router.include_router(llm_service.router, prefix="/llm", tags=["llm"])
api_router.include_router(
    chat.router, prefix="/chat", tags=["chat"]
)  # Include chat router
api_router.include_router(
    content.router, prefix="/content", tags=["content"]
)  # Include content router
api_router.include_router(
    images.router, prefix="/images", tags=["images"]
)  # Include images router
api_router.include_router(
    dashboard.router, prefix="/dashboard", tags=["dashboard"]
)  # Include dashboard router


if settings.ENVIRONMENT == "local":
    api_router.include_router(private.router)
