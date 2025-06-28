import asyncio
import json
import logging
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta

from sqlmodel import Session, delete

from app.core.db import engine
from app.models.content import ContentItem, Segment
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
            # 通知开始处理 - 进度0%
            logger.info(f"开始处理内容 {content_id} for user {user_id}")
            await content_event_manager.notify_content_status(
                user_id=user_id,
                content_id=content_id,
                status="processing",
                progress=0,
                title="新内容",
            )

            # 获取数据库会话
            with Session(engine) as session:
                # 获取内容项
                content_item = session.get(ContentItem, uuid.UUID(content_id))
                if not content_item:
                    logger.error(f"Content item {content_id} not found")
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

                # 更新状态为处理中 - 进度10%
                content_item.processing_status = "processing"
                content_item.updated_at = now_utc()
                content_item.error_message = None  # 清除之前的错误信息
                session.add(content_item)
                session.commit()

                logger.info(f"内容 {content_id} 状态已更新为处理中")
                await content_event_manager.notify_content_status(
                    user_id=user_id,
                    content_id=content_id,
                    status="processing",
                    progress=10,
                    title=content_item.title or "新内容",
                )

                try:
                    # 获取合适的处理器 - 进度20%
                    processor = ContentProcessorFactory.get_processor(content_item.type)
                    logger.info(
                        f"Using processor {type(processor).__name__} for content {content_id}"
                    )

                    await content_event_manager.notify_content_status(
                        user_id=user_id,
                        content_id=content_id,
                        status="processing",
                        progress=20,
                        title=content_item.title or "新内容",
                    )

                    # 开始内容处理 - 进度30%
                    logger.info(f"开始使用 {type(processor).__name__} 处理内容")
                    await content_event_manager.notify_content_status(
                        user_id=user_id,
                        content_id=content_id,
                        status="processing",
                        progress=30,
                        title=content_item.title or "新内容",
                    )

                    # 处理内容
                    result = processor.process_content(content_item, session)

                    if result.success:
                        # 内容处理完成 - 进度50%
                        logger.info("内容处理成功，开始更新数据库")
                        await content_event_manager.notify_content_status(
                            user_id=user_id,
                            content_id=content_id,
                            status="processing",
                            progress=50,
                            title=content_item.title or "新内容",
                        )

                        # 更新内容
                        content_item.content_text = result.markdown_content
                        if result.metadata:
                            content_item.meta_info = json.dumps(result.metadata)
                        content_item.processing_status = "completed"

                        # 如果有标题提取，更新标题
                        if hasattr(result, "title") and result.title:
                            content_item.title = result.title

                        # 如果有摘要提取，更新摘要
                        if hasattr(result, "summary") and result.summary:
                            # 摘要现在存储在 AIResult 表中，不再直接存储在 ContentItem 中
                            pass

                        # 开始内容分段 - 进度60%
                        await content_event_manager.notify_content_status(
                            user_id=user_id,
                            content_id=content_id,
                            status="processing",
                            progress=60,
                            title=content_item.title or "新内容",
                        )

                        # 添加内容分段逻辑 - 确保所有处理器都生成chunks
                        if (
                            result.markdown_content
                            and len(result.markdown_content.strip()) > 0
                        ):
                            try:
                                from app.utils.content_chunker import (
                                    chunk_content_for_item,
                                )
                                from app.utils.content_processors import (
                                    clean_content_for_db,
                                )

                                # 清理内容确保数据库安全
                                cleaned_content = clean_content_for_db(
                                    result.markdown_content
                                )

                                # 创建内容分段
                                chunks = chunk_content_for_item(
                                    content_item.id, cleaned_content
                                )

                                # ---------------- 长期优化：幂等写入 ----------------
                                # 在写入新分段之前，删除当前内容项已存在的分段，
                                # 确保重复执行不会触发唯一索引冲突 (uix_content_segment_idx)。
                                # NOTE: 该删除与后续插入放在同一事务中，最终只提交一次。

                                # 删除旧分段（如果有）
                                session.exec(
                                    delete(Segment).where(
                                        Segment.content_item_id == content_item.id
                                    )
                                )

                                # 批量插入新分段
                                session.add_all(chunks)

                                # ---------------- 统一AI处理：只使用PreprocessingPipeline ----------------
                                try:
                                    from app.core.dependencies import (
                                        get_chat_service_instance,
                                    )
                                    from app.services.preprocessing_pipeline import (
                                        ContentType,
                                        DocumentMetadata,
                                        PreprocessingPipeline,
                                    )

                                    logger.info(
                                        f"Triggering AI preprocessing pipeline for content {content_id}"
                                    )

                                    # 开始AI分析 - 进度70%
                                    await content_event_manager.notify_content_status(
                                        user_id=user_id,
                                        content_id=content_id,
                                        status="processing",
                                        progress=70,
                                        title=content_item.title or "新内容",
                                    )

                                    # 获取ChatService实例
                                    chat_service = get_chat_service_instance()
                                    preprocessing_pipeline = PreprocessingPipeline(
                                        chat_service
                                    )

                                    # 构建文档元数据
                                    metadata = DocumentMetadata(
                                        title=content_item.title or "新内容",
                                        author=None,
                                        source_url=content_item.source_uri
                                        if content_item.type == "url"
                                        else None,
                                        content_type=ContentType.ARTICLE,  # 可以根据实际情况调整
                                        language="auto",
                                        domain="general",
                                    )

                                    # 执行AI预处理（只执行AI初始化层，不重复做存储）
                                    preprocessing_result = await preprocessing_pipeline._ai_initialization_layer(
                                        cleaned_content, metadata, user_preferences=None
                                    )

                                    # AI分析完成 - 进度85%
                                    await content_event_manager.notify_content_status(
                                        user_id=user_id,
                                        content_id=content_id,
                                        status="processing",
                                        progress=85,
                                        title=content_item.title or "新内容",
                                    )

                                    ai_results, ai_stats = preprocessing_result

                                    # 计算阅读时间（优先使用LLM生成的，否则算法估算）
                                    ai_reading_time = None
                                    # 尝试从content_analysis中获取LLM生成的阅读时间
                                    content_analysis = ai_results.get(
                                        "content_analysis", {}
                                    )
                                    if "reading_time_minutes" in content_analysis:
                                        ai_reading_time = content_analysis.get(
                                            "reading_time_minutes"
                                        )

                                    # 如果没有，使用算法估算
                                    if (
                                        not ai_reading_time
                                        or not isinstance(ai_reading_time, int)
                                        or ai_reading_time <= 0
                                    ):
                                        ai_reading_time = max(
                                            1, len(cleaned_content.split()) // 200
                                        )

                                    # 获取 AI 优化的标题和描述
                                    optimized_title = ai_results.get("optimized_title")
                                    brief_description = ai_results.get(
                                        "brief_description"
                                    )

                                    # 如果有AI优化的标题，更新ContentItem的标题
                                    if (
                                        optimized_title
                                        and isinstance(optimized_title, str)
                                        and optimized_title.strip()
                                    ):
                                        content_item.title = optimized_title.strip()[
                                            :255
                                        ]  # 确保长度限制
                                        logger.info(
                                            f"✅ 应用AI优化标题: {content_item.title}"
                                        )

                                    # 直接更新或创建AIResult
                                    from sqlmodel import select

                                    from app.models.content import AIResult

                                    existing_ai_result = session.exec(
                                        select(AIResult).where(
                                            AIResult.content_item_id == content_item.id
                                        )
                                    ).first()

                                    if existing_ai_result:
                                        # 更新现有结果
                                        existing_ai_result.optimized_title = (
                                            optimized_title
                                        )
                                        existing_ai_result.brief_description = (
                                            brief_description
                                        )
                                        existing_ai_result.summary = ai_results.get(
                                            "summary"
                                        )
                                        existing_ai_result.key_points = ai_results.get(
                                            "key_points"
                                        )
                                        existing_ai_result.labels = ai_results.get(
                                            "labels"
                                        )
                                        existing_ai_result.content_analysis = (
                                            ai_results.get("content_analysis")
                                        )
                                        existing_ai_result.reading_time_minutes = (
                                            ai_reading_time
                                        )
                                        existing_ai_result.difficulty_level = (
                                            ai_results.get("content_analysis", {}).get(
                                                "difficulty_level", "intermediate"
                                            )
                                        )
                                        existing_ai_result.content_quality_score = preprocessing_pipeline._calculate_quality_score(
                                            cleaned_content, ai_results, metadata
                                        )
                                        existing_ai_result.updated_at = now_utc()
                                        session.add(existing_ai_result)
                                        logger.info(
                                            f"Updated AI results for content {content_id}"
                                        )
                                    else:
                                        # 创建新结果
                                        ai_result = AIResult(
                                            content_item_id=content_item.id,
                                            optimized_title=optimized_title,
                                            brief_description=brief_description,
                                            summary=ai_results.get("summary"),
                                            key_points=ai_results.get("key_points"),
                                            labels=ai_results.get("labels"),
                                            content_analysis=ai_results.get(
                                                "content_analysis"
                                            ),
                                            reading_time_minutes=ai_reading_time,
                                            difficulty_level=ai_results.get(
                                                "content_analysis", {}
                                            ).get("difficulty_level", "intermediate"),
                                            content_quality_score=preprocessing_pipeline._calculate_quality_score(
                                                cleaned_content, ai_results, metadata
                                            ),
                                        )
                                        session.add(ai_result)
                                        logger.info(
                                            f"Created new AI results for content {content_id}"
                                        )

                                    # 保存AI结果 - 进度95%
                                    await content_event_manager.notify_content_status(
                                        user_id=user_id,
                                        content_id=content_id,
                                        status="processing",
                                        progress=95,
                                        title=content_item.title or "新内容",
                                    )

                                except Exception as preprocessing_err:
                                    logger.error(
                                        f"Failed to run AI preprocessing pipeline for {content_id}: {preprocessing_err}"
                                    )
                                    # 不让AI分析失败影响整体处理状态

                                logger.info(
                                    f"Replaced segments for {content_id} (total {len(chunks)})"
                                )

                            except Exception as chunk_error:
                                logger.error(
                                    f"Failed to create chunks for {content_id}: {chunk_error}"
                                )
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
                        title=content_item.title or "新内容",
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
                # 安全地创建清理任务，避免 "Task was destroyed but it is pending" 警告
                try:
                    cleanup_task = asyncio.create_task(
                        self._cleanup_task_record(content_id)
                    )
                    # 将任务添加到后台集合中以防止被垃圾回收
                    # 或者使用 asyncio.ensure_future() 并妥善处理
                    if not hasattr(self, "_cleanup_tasks"):
                        self._cleanup_tasks = set()
                    self._cleanup_tasks.add(cleanup_task)
                    cleanup_task.add_done_callback(self._cleanup_tasks.discard)
                except Exception as e:
                    logger.warning(
                        f"Failed to create cleanup task for {content_id}: {e}"
                    )
                    # 直接删除任务记录作为备用方案
                    if content_id in self._tasks:
                        del self._tasks[content_id]

    async def _cleanup_task_record(self, content_id: str, delay_seconds: int = 60):
        """延迟清理任务记录"""
        try:
            await asyncio.sleep(delay_seconds)
            if content_id in self._tasks:
                del self._tasks[content_id]
                logger.debug(f"Cleaned up task record for content {content_id}")
        except asyncio.CancelledError:
            logger.debug(f"Cleanup task for content {content_id} was cancelled")
        except Exception as e:
            logger.error(f"Error during cleanup of task record {content_id}: {e}")

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
