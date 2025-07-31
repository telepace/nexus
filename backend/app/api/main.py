from fastapi import APIRouter

from app.api.routes import (
    ai_conversations,  # Add AI conversations router
    chat,  # Add chat router
    content,  # Add content router
    conversations,  # Add conversations router
    dashboard,  # Add dashboard router
    deep_research,  # Add deep research router
    extension_stream,  # Add extension stream router
    favorites,  # Add favorites router
    google_oauth,
    health,  # Import health router separately
    images,  # Added images router
    items,
    llm_service,
    login,
    preprocessing,  # Add preprocessing router
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
api_router.include_router(health.router, tags=["health"])  # Include health router
api_router.include_router(prompts.router, prefix="/prompts", tags=["prompts"])
api_router.include_router(llm_service.router, prefix="/llm", tags=["llm"])
api_router.include_router(
    chat.router, prefix="/chat", tags=["chat"]
)  # Include chat router
api_router.include_router(
    content.router, prefix="/content", tags=["content"]
)  # Include content router
api_router.include_router(
    extension_stream.router, prefix="/extension", tags=["extension"]
)  # Include extension stream router
api_router.include_router(
    favorites.router, prefix="/favorites", tags=["favorites"]
)  # Include favorites router
api_router.include_router(
    images.router, prefix="/images", tags=["images"]
)  # Include images router
api_router.include_router(
    dashboard.router, prefix="/dashboard", tags=["dashboard"]
)  # Include dashboard router
api_router.include_router(
    preprocessing.router, prefix="/preprocessing", tags=["preprocessing"]
)  # Include preprocessing router
api_router.include_router(
    ai_conversations.router, prefix="/ai/conversations", tags=["ai-conversations"]
)  # Include AI conversations router
api_router.include_router(
    conversations.router, prefix="/conversations", tags=["conversations"]
)  # Include conversations router
api_router.include_router(
    deep_research.router, prefix="/deep-research", tags=["deep-research"]
)  # Include deep research router

if settings.ENVIRONMENT == "local":
    api_router.include_router(private.router)
