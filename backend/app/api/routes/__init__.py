from fastapi import APIRouter

from .content import router as content_router
from .extension_auth import router as extension_auth_router

# from .github import router as github_router
from .google_oauth import router as google_oauth_router
from .items import router as items_router
from .llm_service import router as llm_service_router
from .login import router as login_router
from .prompts import router as prompts_router

# from .profile import router as profile_router
# from .upload import router as upload_router
from .users import router as users_router

api_router = APIRouter()
api_router.include_router(login_router)
api_router.include_router(users_router, prefix="/users")
# api_router.include_router(profile_router, prefix="/profile")
# api_router.include_router(upload_router, prefix="/upload")
api_router.include_router(items_router, prefix="/items")
# api_router.include_router(github_router, prefix="/github")
api_router.include_router(google_oauth_router)
api_router.include_router(extension_auth_router)
api_router.include_router(prompts_router, prefix="/prompts")
api_router.include_router(content_router, prefix="/content")
api_router.include_router(llm_service_router, prefix="/llm")
