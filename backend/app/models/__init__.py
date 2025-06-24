# 项目采用单文件 base.py，这个目录只用于自定义模型

# Import models

# 从自定义模型导出
from app.base import (
    Message,
    NewPassword,
    Token,
    TokenBlacklist,
    TokenPayload,
    UpdatePassword,
    User,
    UserCreate,
    UserPublic,
    UserRegister,
    UsersPublic,
    UserUpdate,
    UserUpdateMe,
)
from app.models.prompt import (
    Prompt,
    PromptTagLink,
    PromptType,
    PromptVersion,
    Tag,
    Visibility,
)

# Import content aggregation models
from .content import (
    AIConversation,
    AIResult,
    ContentAsset,
    ContentItem,
    ContentShare,
    MessageSegmentReference,
    Segment,
)

# Import favorite model
from .favorite import Favorite

# Import the new Image model
from .image import Image

# Import project and routing models
from .project import (
    ContentItemTag,
    Project,
    ProjectCreate,
    ProjectPublic,
    ProjectsPublic,
    ProjectUpdate,
    QueryRoute,
    QueryRouteBase,
    QueryRouteCreate,
    QueryRoutePublic,
    SmartRoutingRequest,
    SmartRoutingResponse,
)

# 定义__all__列表，包含所有导入的模型
__all__ = [
    "User",
    "UserCreate",
    "UserPublic",
    "UserRegister",
    "UserUpdate",
    "UserUpdateMe",
    "UsersPublic",
    "Message",
    "Token",
    "TokenPayload",
    "TokenBlacklist",
    "NewPassword",
    "UpdatePassword",
    "Item",
    "ItemCreate",
    "ItemPublic",
    "ItemUpdate",
    "ItemsPublic",
    "Project",
    "ProjectCreate",
    "ProjectPublic",
    "ProjectUpdate",
    "ProjectsPublic",
    "Favorite",
    "FavoriteCreate",
    "FavoritePublic",
    "FavoritesPublic",
    "ContentItem",
    "ContentAsset",
    "ContentShare",
    "AIResult",
    "AIConversation",
    "Segment",
    "MessageSegmentReference",
    "ImageBase",
    "Image",
    "ImageCreate",
    "ImagePublic",
    "Prompt",
    "PromptCreate",
    "PromptUpdate",
    "PromptPublic",
    "PromptsPublic",
    "LLMServiceHealth",
    "LLMServiceHealthPublic",
    "PromptTagLink",
    "PromptVersion",
    "Tag",
    "PromptType",
    "Visibility",
    "ContentItemTag",
    "QueryRoute",
    "QueryRouteBase",
    "QueryRouteCreate",
    "QueryRoutePublic",
    "SmartRoutingRequest",
    "SmartRoutingResponse",
]
