import asyncio
import json
import uuid
from concurrent.futures import ThreadPoolExecutor

from sqlmodel import Session

from app.core.db import engine
from app.models.content import ContentItem
from app.utils.content_processors import ContentProcessorFactory
from app.utils.events import content_event_manager
from app.utils.timezone import now_utc


class BackgroundTaskManager:
    """后台任务管理器"""

    def __init__(self):
        self._tasks = {}
        self._executor = ThreadPoolExecutor(max_workers=4)

    def start_content_processing(self, content_id: str, user_id: str):
        """启动内容处理任务"""

        def run_async_task():
            # 创建新的事件循环
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                # 运行异步任务
                loop.run_until_complete(
                    self._process_content_async(content_id, user_id)
                )
            finally:
                loop.close()

        # 在线程池中运行
        future = self._executor.submit(run_async_task)
        self._tasks[content_id] = future
        return future

    async def _process_content_async(self, content_id: str, user_id: str):
        """异步处理内容"""
        try:
            # 通知开始处理
            await content_event_manager.notify_content_status(
                user_id=user_id, content_id=content_id, status="processing", progress=0
            )

            # 获取数据库会话
            with Session(engine) as session:
                # 获取内容项
                content_item = session.get(ContentItem, uuid.UUID(content_id))
                if not content_item:
                    await content_event_manager.notify_content_status(
                        user_id=user_id,
                        content_id=content_id,
                        status="failed",
                        error_message="Content item not found",
                    )
                    return

                # 更新状态为处理中
                content_item.processing_status = "processing"
                content_item.updated_at = now_utc()
                session.add(content_item)
                session.commit()

                try:
                    # 获取合适的处理器
                    processor = ContentProcessorFactory.get_processor(content_item.type)

                    # 通知处理进度
                    await content_event_manager.notify_content_status(
                        user_id=user_id,
                        content_id=content_id,
                        status="processing",
                        progress=25,
                    )

                    # 处理内容
                    result = processor.process_content(content_item, session)

                    if result.success:
                        # 更新内容
                        content_item.content_text = result.markdown_content
                        if result.metadata:
                            content_item.meta_info = json.dumps(result.metadata)
                        content_item.processing_status = "completed"

                        # 通知处理进度
                        await content_event_manager.notify_content_status(
                            user_id=user_id,
                            content_id=content_id,
                            status="processing",
                            progress=75,
                        )

                        # 如果有标题提取，更新标题
                        if hasattr(result, "title") and result.title:
                            content_item.title = result.title

                        # 如果有摘要提取，更新摘要
                        if hasattr(result, "summary") and result.summary:
                            content_item.summary = result.summary
                    else:
                        content_item.processing_status = "failed"
                        content_item.error_message = (
                            result.error_message or "Processing failed"
                        )

                    content_item.updated_at = now_utc()
                    session.add(content_item)
                    session.commit()
                    session.refresh(content_item)

                    # 通知最终状态
                    await content_event_manager.notify_content_status(
                        user_id=user_id,
                        content_id=content_id,
                        status=content_item.processing_status,
                        title=content_item.title,
                        error_message=content_item.error_message,
                        progress=100
                        if content_item.processing_status == "completed"
                        else None,
                    )

                except Exception as e:
                    # 处理失败
                    content_item.processing_status = "failed"
                    content_item.error_message = str(e)
                    content_item.updated_at = now_utc()
                    session.add(content_item)
                    session.commit()

                    # 通知失败状态
                    await content_event_manager.notify_content_status(
                        user_id=user_id,
                        content_id=content_id,
                        status="failed",
                        error_message=str(e),
                    )

        except Exception as e:
            # 通知失败状态
            await content_event_manager.notify_content_status(
                user_id=user_id,
                content_id=content_id,
                status="failed",
                error_message=f"Task execution failed: {str(e)}",
            )
        finally:
            # 清理任务记录
            if content_id in self._tasks:
                del self._tasks[content_id]

    def get_task_status(self, content_id: str) -> str | None:
        """获取任务状态"""
        if content_id in self._tasks:
            future = self._tasks[content_id]
            if future.done():
                return "completed"
            else:
                return "running"
        return None


# 全局任务管理器实例
background_task_manager = BackgroundTaskManager()
