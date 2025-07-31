
from fastapi import APIRouter

from app.api.api_v1.endpoints import (
    auth,
    chats,
    health,
    integrations,
    models,
    organizations,
    prompt_collections,
    prompts,
    stats,
    user_favorite_prompts,
    users,
)
from app.api.routes import user_settings

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(models.router, prefix="/models", tags=["models"])
api_router.include_router(prompts.router, prefix="/prompts", tags=["prompts"])
api_router.include_router(
    prompt_collections.router,
    prefix="/prompt-collections",
    tags=["prompt-collections"],
)
api_router.include_router(chats.router, prefix="/chats", tags=["chats"])
api_router.include_router(
    integrations.router, prefix="/integrations", tags=["integrations"]
)
api_router.include_router(
    organizations.router, prefix="/organizations", tags=["organizations"]
)
api_router.include_router(stats.router, prefix="/stats", tags=["stats"])
api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(
    user_favorite_prompts.router,
    prefix="/user-favorite-prompts",
    tags=["user-favorite-prompts"],
)
api_router.include_router(
    user_settings.router,
    prefix="/user-settings",
    tags=["user-settings"],
)


