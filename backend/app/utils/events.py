import asyncio
import json
import uuid
from collections import defaultdict
from typing import Any

from app.utils.timezone import now_utc


class ContentEventManager:
    """管理内容处理事件的SSE推送"""

    def __init__(self):
        # 用户连接池：user_id -> list of queues
        self._connections: dict[str, list[asyncio.Queue[dict[str, Any]]]] = defaultdict(
            list
        )

    async def add_connection(self, user_id: str) -> asyncio.Queue[dict[str, Any]]:
        """为用户添加SSE连接"""
        queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue(maxsize=100)
        self._connections[user_id].append(queue)
        return queue

    async def remove_connection(
        self, user_id: str, queue: asyncio.Queue[dict[str, Any]]
    ):
        """移除用户的SSE连接"""
        if user_id in self._connections:
            try:
                self._connections[user_id].remove(queue)
                if not self._connections[user_id]:
                    del self._connections[user_id]
            except ValueError:
                pass

    async def broadcast_to_user(self, user_id: str, event_data: dict[str, Any]):
        """向特定用户广播事件"""
        if user_id not in self._connections:
            return

        # 准备事件数据
        formatted_data = {
            "id": str(uuid.uuid4()),
            "timestamp": now_utc().isoformat(),
            **event_data,
        }

        # 发送到所有该用户的连接
        disconnected_queues = []
        for queue in self._connections[user_id][:]:  # 创建副本避免修改迭代中的列表
            try:
                await queue.put(formatted_data)
            except Exception:
                # 连接已断开，标记待移除
                disconnected_queues.append(queue)

        # 清理断开的连接
        for queue in disconnected_queues:
            await self.remove_connection(user_id, queue)

    async def notify_content_status(
        self,
        user_id: str,
        content_id: str,
        status: str,
        title: str | None = None,
        error_message: str | None = None,
        progress: int | None = None,
    ):
        """通知内容状态变更"""
        event_data = {
            "type": "content_status_update",
            "content_id": content_id,
            "status": status,
            "title": title,
            "error_message": error_message,
            "progress": progress,
        }
        await self.broadcast_to_user(user_id, event_data)


# 全局事件管理器实例
content_event_manager = ContentEventManager()


def format_sse_message(data: dict[str, Any]) -> str:
    """格式化SSE消息"""
    return f"data: {json.dumps(data, ensure_ascii=False, default=str)}\n\n"


async def create_sse_generator(user_id: str):
    """创建SSE数据流生成器"""
    import os

    # 检测是否在测试模式下
    is_testing = os.getenv("TESTING") == "true" or os.getenv("TEST_MODE") == "true"

    queue = await content_event_manager.add_connection(user_id)

    try:
        # 发送连接确认
        initial_data = {
            "type": "connection_established",
            "message": "SSE connection established",
        }
        yield format_sse_message(initial_data)

        # 在测试模式下，发送初始消息后就退出，避免无限循环
        if is_testing:
            return

        # 保持连接并发送事件
        while True:
            try:
                # 等待新事件，设置超时以定期发送心跳
                event_data = await asyncio.wait_for(queue.get(), timeout=30.0)
                yield format_sse_message(event_data)
            except asyncio.TimeoutError:
                # 发送心跳
                heartbeat_data = {
                    "type": "heartbeat",
                    "timestamp": now_utc().isoformat(),
                }
                yield format_sse_message(heartbeat_data)
    except Exception:
        pass
    finally:
        await content_event_manager.remove_connection(user_id, queue)
