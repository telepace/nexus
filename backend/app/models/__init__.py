# 项目采用单文件 base.py，这个目录只用于自定义模型

# Import models

# 从自定义模型导出
from app.base import (
    Item,
    ItemBase,
    ItemCreate,
    ItemPublic,
    ItemsPublic,
    ItemUpdate,
    Message,
    NewPassword,
    Token,
    TokenBlacklist,
    TokenPayload,
    UpdatePassword,
    User,
    UserBase,
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

# 定义__all__列表，包含所有导入的模型
__all__ = [
    "Item",
    "ItemBase",
    "ItemCreate",
    "ItemPublic",
    "ItemsPublic",
    "ItemUpdate",
    "Message",
    "NewPassword",
    "Token",
    "TokenBlacklist",
    "TokenPayload",
    "UpdatePassword",
    "User",
    "UserBase",
    "UserCreate",
    "UserPublic",
    "UserRegister",
    "UsersPublic",
    "UserUpdate",
    "UserUpdateMe",
    "Prompt",
    "PromptTagLink",
    "PromptVersion",
    "Tag",
    "PromptType",
    "Visibility",
    "Image",  # Added Image model
    # Content aggregation models
    "ContentItem",
    "ContentAsset",
    "ProcessingJob",
    "AIConversation",
]

# Import content aggregation models
from .content import (
    AIConversation,
    ContentAsset,
    ContentItem,
    ProcessingJob,
)

# Import the new Image model
from .image import Image
