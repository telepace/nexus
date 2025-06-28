"""
Deep Research Service
使用 GPT Researcher 进行深度研究的服务
"""

import logging
import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any

from sqlmodel import Session

from app.core.config import settings
from app.core.db import engine
from app.models.content import ContentItem, DeepResearchJob
from app.services.preprocessing_pipeline import DocumentMetadata, PreprocessingPipeline
from app.utils.timezone import now_utc

logger = logging.getLogger(__name__)


class DeepResearchService:
    """深度研究服务，使用 GPT Researcher 进行深度研究"""

    def __init__(self):
        self.storage_dir = Path("static/deep_research")
        self.storage_dir.mkdir(parents=True, exist_ok=True)

    async def process_deep_research(self, job_id: uuid.UUID) -> bool:
        """
        处理深度研究任务

        Args:
            job_id: 研究任务ID

        Returns:
            bool: 处理是否成功
        """
        try:
            with Session(engine) as session:
                # 获取任务
                job = session.get(DeepResearchJob, job_id)
                if not job:
                    logger.error(f"Deep research job {job_id} not found")
                    return False

                # 更新状态为处理中
                job.status = "processing"
                job.updated_at = now_utc()
                session.add(job)
                session.commit()

                logger.info(f"开始处理深度研究任务: {job.query}")

                # 执行深度研究
                markdown_content, research_meta = await self._conduct_research(
                    query=job.query, depth=job.depth, breadth=job.breadth
                )

                # 保存markdown文件
                markdown_path = await self._save_markdown(job_id, markdown_content)

                # 创建ContentItem以便复用现有的预处理流程
                await self._create_content_item_for_research(
                    session, job, markdown_content, markdown_path
                )

                # 创建文档元数据
                metadata = DocumentMetadata(
                    title=f"深度研究: {job.query[:100]}",
                    source_url=f"deep_research:{job.id}",
                    content_type="deep_research",
                    language="zh",
                    author="GPT Researcher",
                    description=f"关于 '{job.query}' 的深度研究报告",
                )

                # 使用PreprocessingPipeline的AI初始化层进行预处理
                pipeline = PreprocessingPipeline()
                ai_results, ai_stats = await pipeline._ai_initialization_layer(
                    markdown_content, metadata
                )

                # 更新任务状态和结果
                job.status = "completed"
                job.markdown_path = markdown_path
                job.research_meta = {
                    "research_meta": research_meta,
                    "ai_results": ai_results,
                    "ai_stats": ai_stats,
                }
                job.completed_at = now_utc()
                job.updated_at = now_utc()
                session.add(job)
                session.commit()

                logger.info(f"深度研究任务完成: {job_id}")
                return True

        except Exception as e:
            logger.error(f"深度研究任务失败: {job_id}, 错误: {str(e)}")
            await self._mark_job_failed(job_id, str(e))
            return False

    async def _conduct_research(
        self, query: str, depth: int = 3, breadth: int = 2
    ) -> tuple[str, dict[str, Any]]:
        """
        使用 GPT Researcher 进行深度研究

        Args:
            query: 研究查询
            depth: 研究深度
            breadth: 研究广度

        Returns:
            tuple: (markdown_content, research_meta)
        """
        try:
            # 动态导入gpt_researcher以避免启动时的依赖问题
            from gpt_researcher import GPTResearcher

            # 设置环境变量使用项目的LiteLLM proxy
            original_api_key = os.environ.get("OPENAI_API_KEY")
            original_base_url = os.environ.get("OPENAI_API_BASE")

            try:
                # 配置使用LiteLLM proxy
                if settings.LITELLM_MASTER_KEY:
                    os.environ["OPENAI_API_KEY"] = settings.LITELLM_MASTER_KEY
                else:
                    # 如果没有设置master key，使用默认占位符
                    os.environ["OPENAI_API_KEY"] = "dummy-key"

                # 设置base URL为LiteLLM proxy
                base_url = str(settings.LITELLM_PROXY_URL).rstrip("/")
                os.environ["OPENAI_API_BASE"] = f"{base_url}/v1"

                logger.info(f"配置GPT Researcher使用LiteLLM proxy: {base_url}")

                # 如果还没有设置搜索API密钥，给出警告
                if not os.getenv("TAVILY_API_KEY"):
                    logger.warning(
                        "TAVILY_API_KEY not set, deep research may have limited search capabilities"
                    )

                # 配置研究参数
                researcher = GPTResearcher(
                    query=query,
                    report_type="research_report",
                    source_urls=None,
                    config_path=None,
                )

                logger.info(f"开始深度研究: {query}")

                # 执行研究
                await researcher.conduct_research()

                # 生成报告
                markdown_content = await researcher.write_report()

                # 收集元数据
                research_meta = {
                    "query": query,
                    "depth": depth,
                    "breadth": breadth,
                    "sources_count": len(getattr(researcher, "visited_urls", [])),
                    "research_duration": getattr(researcher, "research_time", 0),
                    "model_used": settings.DEFAULT_LLM_MODEL,
                    "report_type": "research_report",
                    "generated_at": datetime.now().isoformat(),
                    "litellm_proxy_used": True,
                    "proxy_url": base_url,
                }

                logger.info(f"深度研究完成, 生成内容长度: {len(markdown_content)} 字符")

                return markdown_content, research_meta

            finally:
                # 恢复原始环境变量
                if original_api_key is not None:
                    os.environ["OPENAI_API_KEY"] = original_api_key
                elif "OPENAI_API_KEY" in os.environ:
                    del os.environ["OPENAI_API_KEY"]

                if original_base_url is not None:
                    os.environ["OPENAI_API_BASE"] = original_base_url
                elif "OPENAI_API_BASE" in os.environ:
                    del os.environ["OPENAI_API_BASE"]

        except ImportError as e:
            logger.error(f"无法导入 gpt_researcher: {e}")
            raise Exception("GPT Researcher 依赖未安装或配置错误")
        except Exception as e:
            logger.error(f"深度研究执行失败: {e}")
            raise

    async def _save_markdown(self, job_id: uuid.UUID, content: str) -> str:
        """
        保存markdown内容到文件

        Args:
            job_id: 任务ID
            content: markdown内容

        Returns:
            str: 文件路径
        """
        filename = f"deep_research_{job_id}.md"
        file_path = self.storage_dir / filename

        # 确保目录存在
        file_path.parent.mkdir(parents=True, exist_ok=True)

        # 写入文件
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)

        # 返回相对路径
        return str(file_path.relative_to(Path("static")))

    async def _create_content_item_for_research(
        self,
        session: Session,
        job: DeepResearchJob,
        markdown_content: str,
        markdown_path: str,
    ) -> ContentItem:
        """
        为深度研究创建ContentItem，以便复用现有的预处理流程

        Args:
            session: 数据库会话
            job: 深度研究任务
            markdown_content: markdown内容
            markdown_path: markdown文件路径

        Returns:
            ContentItem: 创建的内容项
        """
        content_item = ContentItem(
            user_id=job.user_id,
            type="text",  # 设置为text类型
            source_uri=f"deep_research:{job.id}",
            title=f"深度研究: {job.query[:100]}",
            content_text=markdown_content,
            processing_status="completed",  # 直接设置为已完成
            last_processed_at=now_utc(),
            meta_info={
                "deep_research_job_id": str(job.id),
                "research_query": job.query,
                "markdown_path": markdown_path,
                "content_type": "deep_research",
            },
        )

        session.add(content_item)
        session.commit()
        session.refresh(content_item)

        return content_item

    async def _mark_job_failed(self, job_id: uuid.UUID, error_message: str):
        """标记任务为失败状态"""
        try:
            with Session(engine) as session:
                job = session.get(DeepResearchJob, job_id)
                if job:
                    job.status = "failed"
                    job.error_message = error_message
                    job.updated_at = now_utc()
                    session.add(job)
                    session.commit()
        except Exception as e:
            logger.error(f"Failed to mark job {job_id} as failed: {e}")

    async def get_job_result(self, job_id: uuid.UUID) -> dict[str, Any] | None:
        """
        获取任务结果

        Args:
            job_id: 任务ID

        Returns:
            dict: 任务结果，如果任务不存在返回None
        """
        try:
            with Session(engine) as session:
                job = session.get(DeepResearchJob, job_id)
                if not job:
                    return None

                result = {
                    "status": job.status,
                    "error_message": job.error_message,
                    "progress": self._calculate_progress(job.status),
                }

                # 如果任务完成，添加结果信息
                if job.status == "completed" and job.markdown_path:
                    # 读取markdown内容
                    try:
                        markdown_content = await self._read_markdown_file(
                            job.markdown_path
                        )
                        result["markdown_content"] = markdown_content
                    except Exception as e:
                        logger.error(f"Failed to read markdown file: {e}")
                        result["markdown_content"] = None

                    # 添加研究元数据和AI结果
                    if job.research_meta:
                        result["research_meta"] = job.research_meta.get(
                            "research_meta", {}
                        )
                        ai_results = job.research_meta.get("ai_results", {})

                        # 展开AI结果到顶级字段
                        result.update(
                            {
                                "title": ai_results.get("title"),
                                "summary": ai_results.get("summary"),
                                "key_points": ai_results.get("key_points"),
                                "labels": ai_results.get("labels"),
                                "reading_time_minutes": ai_results.get(
                                    "reading_time_minutes"
                                ),
                                "difficulty_level": ai_results.get("difficulty_level"),
                                "content_quality_score": ai_results.get(
                                    "content_quality_score"
                                ),
                            }
                        )

                return result

        except Exception as e:
            logger.error(f"Failed to get job result for {job_id}: {e}")
            return None

    async def _read_markdown_file(self, markdown_path: str) -> str:
        """读取markdown文件内容"""
        full_path = Path("static") / markdown_path
        with open(full_path, encoding="utf-8") as f:
            return f.read()

    def _calculate_progress(self, status: str) -> int:
        """根据状态计算进度"""
        progress_map = {
            "pending": 0,
            "processing": 50,
            "completed": 100,
            "failed": 0,
        }
        return progress_map.get(status, 0)


# 全局服务实例
deep_research_service = DeepResearchService()
