"""
依赖注入模块
提供应用程序的依赖项注入功能
"""

from app.services.ai.chat_service import ChatService

# 全局ChatService实例
_chat_service: ChatService | None = None


def get_chat_service() -> ChatService:
    """
    获取ChatService实例

    Returns:
        ChatService: 聊天服务实例
    """
    global _chat_service

    if _chat_service is None:
        _chat_service = ChatService()

    return _chat_service


def get_chat_service_instance() -> ChatService:
    """
    获取ChatService实例（用于后台任务等非FastAPI上下文）

    Returns:
        ChatService: 聊天服务实例
    """
    return get_chat_service()


def reset_dependencies():
    """重置所有依赖项（主要用于测试）"""
    global _chat_service
    _chat_service = None
