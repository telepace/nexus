"""
AI内容处理器 - 使用Jinja2模板和LLM进行智能分析

本模块提供AI驱动的内容分析功能：
1. 使用summary.j2模板生成内容总结
2. 使用key_points.j2模板提取关键要点
3. 集成到ProcessingPipeline中进行自动化处理
4. 支持多种AI模型和错误处理
"""

import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Any

import httpx
from jinja2 import Environment, FileSystemLoader
from sqlmodel import select

from app.core.config import settings
from app.models.content import ContentItem, ProcessingJob
from app.utils.content_processors import (
    ProcessingContext,
    ProcessingResult,
    ProcessingStep,
)

logger = logging.getLogger(__name__)


class AIProcessorBase(ProcessingStep):
    """AI处理器基类，提供模板渲染和LLM调用的通用功能"""

    def __init__(self, template_name: str, processor_name: str):
        """
        初始化AI处理器

        Args:
            template_name: Jinja2模板文件名（如 'summary.j2'）
            processor_name: 处理器名称（用于ProcessingJob记录）
        """
        self.template_name = template_name
        self.processor_name = processor_name

        # 设置模板环境
        template_dir = Path(__file__).parent.parent / "prompt_templates"
        self.template_env = Environment(
            loader=FileSystemLoader(str(template_dir)), autoescape=False
        )

    def can_handle(self, content_type: str) -> bool:
        """AI处理器可以处理任何已经转换为markdown的内容"""
        return True

    async def process(
        self, context: ProcessingContext, result: ProcessingResult
    ) -> ProcessingResult:
        """
        执行AI分析处理

        Args:
            context: 处理上下文
            result: 前一步的处理结果

        Returns:
            ProcessingResult: AI分析结果
        """
        content_item = context.content_item

        # 检查是否有markdown内容可供分析
        if not result.markdown_content and not content_item.content_text:
            logger.warning(f"No content available for AI analysis: {content_item.id}")
            result.success = False
            result.error_message = "No markdown content available for AI analysis"
            return result

        # 使用最新的markdown内容
        content_to_analyze = result.markdown_content or content_item.content_text

        try:
            # 创建专门的ProcessingJob来跟踪AI分析
            ai_job = ProcessingJob(
                content_item_id=content_item.id,
                processor_name=self.processor_name,
                status="in_progress",
                started_at=datetime.utcnow(),
                parameters=json.dumps(
                    {
                        "template": self.template_name,
                        "model": settings.DEFAULT_LLM_MODEL,
                        "content_length": len(content_to_analyze),
                    }
                ),
            )
            context.session.add(ai_job)
            context.session.commit()

            # 渲染提示词模板
            prompt = await self._render_template(
                content_item, content_to_analyze, context
            )

            # 调用LLM进行分析
            ai_result = await self._call_llm(prompt)

            # 解析AI响应
            parsed_result = self._parse_ai_response(ai_result)

            # 更新ProcessingJob状态
            ai_job.status = "completed"
            ai_job.completed_at = datetime.utcnow()
            ai_job.result = json.dumps(
                {
                    "success": True,
                    "analysis_result": parsed_result,
                    "model_used": settings.DEFAULT_LLM_MODEL,
                    "processed_at": datetime.utcnow().isoformat(),
                }
            )

            context.session.add(ai_job)
            context.session.commit()

            # 更新result对象
            result.success = True
            result.metadata = result.metadata or {}
            result.metadata[f"{self.processor_name}_result"] = parsed_result

            logger.info(
                f"Successfully completed {self.processor_name} for content {content_item.id}"
            )

        except Exception as e:
            logger.error(
                f"{self.processor_name} failed for content {content_item.id}: {str(e)}"
            )

            # 更新失败状态
            ai_job.status = "failed"
            ai_job.completed_at = datetime.utcnow()
            ai_job.error_message = str(e)
            context.session.add(ai_job)
            context.session.commit()

            # 不要让AI分析失败影响整个处理流程
            result.success = True  # 保持主流程成功
            result.metadata = result.metadata or {}
            result.metadata[f"{self.processor_name}_error"] = str(e)

        return result

    async def _render_template(
        self, content_item: ContentItem, content: str, context: ProcessingContext
    ) -> str:
        """渲染Jinja2模板生成提示词"""
        try:
            template = self.template_env.get_template(self.template_name)

            # 准备模板上下文 - 明确类型为接受任何值的字典
            template_context: dict[str, Any] = {
                "content": content,
                "content_type": self._get_content_type_display(content_item.type),
                "document_metadata": {
                    "title": content_item.title,
                    "source_url": content_item.source_uri,
                    "created_at": content_item.created_at.isoformat()
                    if content_item.created_at
                    else None,
                },
                "target_length": "200-300",  # 默认目标长度
            }

            # 添加上下文历史（如果有其他已完成的分析）
            context_history = self._get_context_history(content_item, context)
            if context_history:
                template_context["context_history"] = context_history

            return template.render(**template_context)

        except Exception as e:
            logger.error(
                f"Template rendering failed for {self.template_name}: {str(e)}"
            )
            raise

    def _get_context_history(
        self, content_item: ContentItem, context: ProcessingContext
    ) -> list[dict]:
        """获取已完成的AI分析历史，用于模板上下文"""
        try:
            # 查询已完成的AI处理任务
            statement = select(ProcessingJob).where(
                ProcessingJob.content_item_id == content_item.id,
                ProcessingJob.status == "completed",
                ProcessingJob.processor_name.in_(
                    ["summarizer", "key_points_extractor"]
                ),
            )
            completed_jobs = context.session.exec(statement).all()

            history = []
            for job in completed_jobs:
                if job.result:
                    try:
                        result_data = json.loads(job.result)
                        history.append(
                            {
                                "operation_type": job.processor_name,
                                "output_summary": str(
                                    result_data.get("analysis_result", "")
                                )[:100]
                                + "...",
                            }
                        )
                    except json.JSONDecodeError:
                        continue

            return history
        except Exception as e:
            logger.warning(f"Failed to get context history: {str(e)}")
            return []

    def _get_content_type_display(self, content_type: str) -> str:
        """将内容类型转换为用户友好的显示名称"""
        type_mapping = {
            "url": "网页文章",
            "pdf": "PDF文档",
            "docx": "Word文档",
            "text": "文本内容",
            "plugin": "插件内容",
        }
        return type_mapping.get(content_type, "文档")

    async def _call_llm(self, prompt: str) -> str:
        """调用LLM API进行内容分析"""
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                # 构建请求数据
                request_data = {
                    "model": settings.DEFAULT_LLM_MODEL,
                    "messages": [
                        {
                            "role": "system",
                            "content": "You are a professional content analyst. Always respond with valid JSON format as specified in the prompt.",
                        },
                        {"role": "user", "content": prompt},
                    ],
                    "temperature": 0.3,
                    "max_tokens": 2000,
                }

                # 准备请求头，包含认证信息
                headers = {"Content-Type": "application/json"}
                if settings.LITELLM_MASTER_KEY:
                    headers["Authorization"] = f"Bearer {settings.LITELLM_MASTER_KEY}"

                # 调用LiteLLM代理
                base_url = str(settings.LITELLM_PROXY_URL).rstrip("/")
                url = f"{base_url}/v1/chat/completions"

                logger.debug(
                    f"Calling LiteLLM API: {url} with model: {settings.DEFAULT_LLM_MODEL}"
                )

                response = await client.post(
                    url,
                    json=request_data,
                    headers=headers,
                    timeout=60.0,
                )

                response.raise_for_status()
                response_data = response.json()

                # 提取LLM响应内容
                if "choices" not in response_data or not response_data["choices"]:
                    raise ValueError("Invalid LLM response: missing choices")

                content = response_data["choices"][0]["message"]["content"]
                return content.strip()

        except httpx.HTTPStatusError as e:
            if e.response.status_code == 401:
                logger.error(
                    "LLM API authentication failed. Check LITELLM_MASTER_KEY configuration."
                )
                raise Exception(f"LLM API authentication failed: {e}")
            else:
                logger.error(f"LLM API HTTP error {e.response.status_code}: {e}")
                raise Exception(f"LLM API error: {e}")
        except httpx.RequestError as e:
            logger.error(f"LLM API request failed: {e}")
            raise Exception(f"LLM API request failed: {e}")
        except Exception as e:
            logger.error(f"LLM API call failed: {str(e)}")
            raise

    def _parse_ai_response(self, ai_response: str) -> dict[str, Any]:
        """解析AI返回的JSON响应"""
        try:
            # 尝试提取JSON内容（处理可能的markdown代码块）
            if "```json" in ai_response:
                start = ai_response.find("```json") + 7
                end = ai_response.find("```", start)
                json_content = ai_response[start:end].strip()
            elif ai_response.strip().startswith("{"):
                json_content = ai_response.strip()
            else:
                # 如果没有找到JSON，返回原始响应
                return {"raw_response": ai_response}

            return json.loads(json_content)

        except json.JSONDecodeError as e:
            logger.warning(f"Failed to parse AI response as JSON: {str(e)}")
            return {"raw_response": ai_response, "parse_error": str(e)}


class SummaryProcessor(AIProcessorBase):
    """内容总结处理器 - 使用summary.j2模板生成智能总结"""

    def __init__(self):
        super().__init__(template_name="summary.j2", processor_name="summarizer")


class KeyPointsProcessor(AIProcessorBase):
    """要点提取处理器 - 使用key_points.j2模板提取关键要点"""

    def __init__(self):
        super().__init__(
            template_name="key_points.j2", processor_name="key_points_extractor"
        )
