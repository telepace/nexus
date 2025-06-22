import asyncio
import json
import logging
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta

from sqlmodel import Session

from app.core.db import engine
from app.models.content import ContentItem
from app.utils.content_processors import ContentProcessorFactory
from app.utils.events import content_event_manager
from app.utils.timezone import now_utc

logger = logging.getLogger(__name__)


class BackgroundTaskManager:
    """后台任务管理器 - 改进版本，包含超时检测和监控"""

    def __init__(self, max_workers: int = 4, task_timeout_minutes: int = 30):
        self._tasks: dict[str, dict] = {}  # 存储任务信息，包括Future和元数据
        self._executor = ThreadPoolExecutor(max_workers=max_workers)
        self.task_timeout_minutes = task_timeout_minutes

        # 启动监控任务
        self._monitoring_task = None
        self._start_monitoring()

    def _start_monitoring(self):
        """启动任务监控"""

        def start_monitoring_loop():
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                loop.run_until_complete(self._monitoring_loop())
            except Exception as e:
                logger.error(f"Monitoring loop error: {e}")
            finally:
                loop.close()

        # 在单独线程中运行监控循环
        import threading

        monitoring_thread = threading.Thread(target=start_monitoring_loop, daemon=True)
        monitoring_thread.start()

    async def _monitoring_loop(self):
        """监控循环，定期检查超时任务"""
        while True:
            try:
                await self._check_timeout_tasks()
                await asyncio.sleep(300)  # 每5分钟检查一次
            except Exception as e:
                logger.error(f"Error in monitoring loop: {e}")
                await asyncio.sleep(60)  # 出错后等待1分钟再重试

    async def _check_timeout_tasks(self):
        """检查超时任务"""
        current_time = datetime.now()
        timeout_threshold = timedelta(minutes=self.task_timeout_minutes)

        tasks_to_cleanup = []

        for content_id, task_info in self._tasks.items():
            start_time = task_info.get("start_time")
            if start_time and (current_time - start_time) > timeout_threshold:
                future = task_info.get("future")
                if future and not future.done():
                    logger.warning(
                        f"Task {content_id} has been running for more than {self.task_timeout_minutes} minutes, marking as timeout"
                    )
                    tasks_to_cleanup.append(content_id)

        # 清理超时任务
        for content_id in tasks_to_cleanup:
            await self._handle_timeout_task(content_id)

    async def _handle_timeout_task(self, content_id: str):
        """处理超时任务"""
        try:
            task_info = self._tasks.get(content_id)
            if not task_info:
                return

            user_id = task_info.get("user_id")
            future = task_info.get("future")

            # 尝试取消任务
            if future and not future.done():
                future.cancel()

            # 更新数据库状态
            with Session(engine) as session:
                content_item = session.get(ContentItem, uuid.UUID(content_id))
                if content_item and content_item.processing_status == "processing":
                    content_item.processing_status = "failed"
                    content_item.error_message = (
                        f"Task timeout after {self.task_timeout_minutes} minutes"
                    )
                    content_item.updated_at = now_utc()
                    session.add(content_item)
                    session.commit()

                    logger.info(f"Marked timeout task {content_id} as failed")

            # 通知前端
            if user_id:
                await content_event_manager.notify_content_status(
                    user_id=user_id,
                    content_id=content_id,
                    status="failed",
                    error_message=f"Task timeout after {self.task_timeout_minutes} minutes",
                )

            # 清理任务记录
            if content_id in self._tasks:
                del self._tasks[content_id]

        except Exception as e:
            logger.error(f"Error handling timeout task {content_id}: {e}")

    def start_content_processing(self, content_id: str, user_id: str):
        """启动内容处理任务"""

        # 检查是否已有相同任务在运行
        if content_id in self._tasks:
            existing_task = self._tasks[content_id]
            if existing_task.get("future") and not existing_task["future"].done():
                logger.warning(f"Task {content_id} is already running")
                return existing_task["future"]

        def run_async_task():
            # 创建新的事件循环
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                # 运行异步任务
                loop.run_until_complete(
                    self._process_content_async(content_id, user_id)
                )
            except Exception as e:
                logger.error(f"Task execution failed for {content_id}: {e}")
            finally:
                loop.close()

        # 在线程池中运行
        future = self._executor.submit(run_async_task)

        # 记录任务信息
        self._tasks[content_id] = {
            "future": future,
            "user_id": user_id,
            "start_time": datetime.now(),
            "status": "running",
        }

        logger.info(f"Started processing task for content {content_id}")
        return future

    async def _process_content_async(self, content_id: str, user_id: str):
        """异步处理内容 - 改进版本"""
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

                # 检查是否已经在处理中（防止重复处理）
                if content_item.processing_status == "completed":
                    logger.info(
                        f"Content {content_id} is already completed, skipping processing"
                    )
                    await content_event_manager.notify_content_status(
                        user_id=user_id,
                        content_id=content_id,
                        status="completed",
                        title=content_item.title,
                        progress=100,
                    )
                    return

                # 更新状态为处理中
                content_item.processing_status = "processing"
                content_item.updated_at = now_utc()
                content_item.error_message = None  # 清除之前的错误信息
                session.add(content_item)
                session.commit()

                try:
                    # 获取合适的处理器
                    processor = ContentProcessorFactory.get_processor(content_item.type)
                    logger.info(
                        f"Using processor {type(processor).__name__} for content {content_id}"
                    )

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
                            # 摘要现在存储在 AIResult 表中，不再直接存储在 ContentItem 中
                            pass

                        # 添加内容分段逻辑 - 确保所有处理器都生成chunks
                        if result.markdown_content and len(result.markdown_content.strip()) > 0:
                            try:
                                from app.utils.content_chunker import chunk_content_for_item
                                from app.utils.content_processors import clean_content_for_db
                                
                                # 清理内容确保数据库安全
                                cleaned_content = clean_content_for_db(result.markdown_content)
                                
                                # 创建内容分段
                                chunks = chunk_content_for_item(content_item.id, cleaned_content)
                                
                                # 添加到数据库会话
                                for chunk in chunks:
                                    session.add(chunk)
                                
                                logger.info(f"Created {len(chunks)} content chunks for {content_id}")
                                
                            except Exception as chunk_error:
                                logger.error(f"Failed to create chunks for {content_id}: {chunk_error}")
                                # 不让分段失败影响整体处理状态

                        logger.info(f"Successfully processed content {content_id}")
                    else:
                        content_item.processing_status = "failed"
                        content_item.error_message = (
                            result.error_message or "Processing failed"
                        )
                        logger.error(
                            f"Processing failed for content {content_id}: {content_item.error_message}"
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
                    error_msg = str(e)
                    logger.error(
                        f"Processing error for content {content_id}: {error_msg}"
                    )

                    content_item.processing_status = "failed"
                    content_item.error_message = error_msg
                    content_item.updated_at = now_utc()
                    session.add(content_item)
                    session.commit()

                    # 通知失败状态
                    await content_event_manager.notify_content_status(
                        user_id=user_id,
                        content_id=content_id,
                        status="failed",
                        error_message=error_msg,
                    )

        except Exception as e:
            # 通知失败状态
            error_msg = f"Task execution failed: {str(e)}"
            logger.error(f"Task execution failed for content {content_id}: {error_msg}")

            await content_event_manager.notify_content_status(
                user_id=user_id,
                content_id=content_id,
                status="failed",
                error_message=error_msg,
            )
        finally:
            # 清理任务记录
            if content_id in self._tasks:
                self._tasks[content_id]["status"] = "completed"
                # 延迟删除任务记录，以便监控
                asyncio.create_task(self._cleanup_task_record(content_id))

    async def _cleanup_task_record(self, content_id: str, delay_seconds: int = 60):
        """延迟清理任务记录"""
        await asyncio.sleep(delay_seconds)
        if content_id in self._tasks:
            del self._tasks[content_id]
            logger.debug(f"Cleaned up task record for content {content_id}")

    def get_task_status(self, content_id: str) -> str | None:
        """获取任务状态"""
        if content_id in self._tasks:
            task_info = self._tasks[content_id]
            future = task_info.get("future")
            if future:
                if future.done():
                    return "completed"
                else:
                    return "running"
        return None

    def get_active_tasks_count(self) -> int:
        """获取活跃任务数量"""
        active_count = 0
        for task_info in self._tasks.values():
            future = task_info.get("future")
            if future and not future.done():
                active_count += 1
        return active_count

    def get_task_info(self, content_id: str) -> dict | None:
        """获取任务详细信息"""
        return self._tasks.get(content_id)

    def cancel_task(self, content_id: str) -> bool:
        """取消任务"""
        if content_id in self._tasks:
            task_info = self._tasks[content_id]
            future = task_info.get("future")
            if future and not future.done():
                success = future.cancel()
                if success:
                    logger.info(f"Cancelled task for content {content_id}")
                return success
        return False

    def cleanup_completed_tasks(self):
        """清理已完成的任务"""
        completed_tasks = []
        for content_id, task_info in self._tasks.items():
            future = task_info.get("future")
            if future and future.done():
                completed_tasks.append(content_id)

        for content_id in completed_tasks:
            del self._tasks[content_id]
            logger.debug(f"Cleaned up completed task {content_id}")

        return len(completed_tasks)


# 全局任务管理器实例
background_task_manager = BackgroundTaskManager()
