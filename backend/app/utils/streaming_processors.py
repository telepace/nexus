"""
流式AI内容处理器 - 支持实时流式输出的内容分析

本模块提供流式AI分析功能：
1. StreamChunk数据结构用于流式数据传输
2. StreamingAIProcessor基类提供流式处理能力
3. 支持摘要和关键要点的流式生成
4. 为插件端提供实时反馈
"""

import json
import logging
from collections.abc import AsyncGenerator
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Literal

import httpx
from jinja2 import Environment, FileSystemLoader
from sqlmodel import Session

from app.core.config import settings
from app.models.content import ContentItem

logger = logging.getLogger(__name__)


@dataclass
class StreamChunk:
    """流式数据块，用于传输分析结果"""

    type: Literal["summary", "key_points", "content", "metadata", "error"]
    content: str
    finished: bool = False
    metadata: dict[str, Any] | None = None
    timestamp: str | None = None

    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.utcnow().isoformat()

    def to_json(self) -> str:
        """转换为JSON字符串"""
        return json.dumps(asdict(self), ensure_ascii=False)


class StreamingAIProcessor:
    """流式AI处理器基类"""

    def __init__(self):
        """初始化流式处理器"""
        # 设置模板环境
        template_dir = Path(__file__).parent.parent / "prompt_templates"
        self.template_env = Environment(
            loader=FileSystemLoader(str(template_dir)), autoescape=False
        )

        # LLM配置
        self.llm_base_url = settings.LITELLM_PROXY_URL
        self.llm_model = settings.DEFAULT_LLM_MODEL
        self.llm_timeout = 30.0

    async def process_streaming(
        self,
        content_item: ContentItem,
        analysis_type: Literal["summary", "key_points"],
        session: Session,
    ) -> AsyncGenerator[StreamChunk, None]:
        """
        流式处理内容分析

        Args:
            content_item: 要分析的内容项
            analysis_type: 分析类型（summary 或 key_points）
            session: 数据库会话

        Yields:
            StreamChunk: 流式数据块
        """
        try:
            # 发送开始信号
            yield StreamChunk(
                type="metadata",
                content="",
                metadata={
                    "status": "started",
                    "analysis_type": analysis_type,
                    "content_id": str(content_item.id),
                },
            )

            # 渲染模板
            prompt = await self._render_template(content_item, analysis_type)

            # 流式调用LLM - 传入系统消息（文章内容）和用户消息（提示词）
            accumulated_content = ""
            async for chunk_content in self._stream_llm_call(
                content_item.content_text or "", prompt
            ):
                accumulated_content += chunk_content

                yield StreamChunk(
                    type=analysis_type, content=chunk_content, finished=False
                )

            # 发送完成信号
            yield StreamChunk(
                type=analysis_type,
                content="",
                finished=True,
                metadata={
                    "total_length": len(accumulated_content),
                    "word_count": len(accumulated_content.split()),
                    "analysis_type": analysis_type,
                    "model_used": self.llm_model,
                },
            )

        except Exception as e:
            logger.error(f"流式处理失败: {str(e)}")
            yield StreamChunk(
                type="error",
                content=str(e),
                finished=True,
                metadata={"error_type": "processing_error"},
            )

    async def _render_template(
        self, content_item: ContentItem, analysis_type: str
    ) -> str:
        """渲染提示词模板"""
        try:
            # 选择模板文件
            template_name = f"{analysis_type}.j2"
            template = self.template_env.get_template(template_name)

            # 准备模板上下文
            context = {
                "content": content_item.content_text or "",
                "document_metadata": {
                    "title": content_item.title,
                    "source_url": content_item.source_uri,
                    "content_type": content_item.type,
                    "created_at": content_item.created_at.isoformat()
                    if content_item.created_at
                    else None,
                },
                "content_type": self._get_content_type_display(content_item.type),
                "context_history": [],  # 暂时为空，后续可以添加历史分析
            }

            # 渲染模板
            prompt = template.render(**context)
            return prompt

        except Exception as e:
            logger.error(f"模板渲染失败: {str(e)}")
            raise

    async def _stream_llm_call(
        self, system_content: str, user_prompt: str
    ) -> AsyncGenerator[str, None]:
        """流式调用LLM API

        Args:
            system_content: 作为系统提示传递的文章内容
            user_prompt: 作为用户提示传递的任务指令
        """
        if not self.llm_base_url:
            raise ValueError("LLM API URL 未配置")

        try:
            async with httpx.AsyncClient(timeout=self.llm_timeout) as client:
                # 构建请求数据
                request_data = {
                    "model": self.llm_model,
                    "messages": [
                        {"role": "system", "content": system_content},
                        {"role": "user", "content": user_prompt},
                    ],
                    "stream": True,
                    "temperature": 0.7,
                    "max_tokens": 8000,
                }

                # 发送流式请求
                async with client.stream(
                    "POST",
                    f"{self.llm_base_url}/v1/chat/completions",
                    json=request_data,
                    headers={"Content-Type": "application/json"},
                ) as response:
                    response.raise_for_status()

                    async for line in response.aiter_lines():
                        if line.startswith("data: "):
                            data_str = line[6:]  # 去掉 "data: " 前缀

                            if data_str.strip() == "[DONE]":
                                break

                            try:
                                data = json.loads(data_str)
                                choices = data.get("choices", [])

                                if choices and "delta" in choices[0]:
                                    delta = choices[0]["delta"]
                                    if "content" in delta:
                                        content = delta["content"]
                                        if content:
                                            yield content

                            except json.JSONDecodeError:
                                continue

        except Exception as e:
            logger.error(f"LLM流式调用失败: {str(e)}")
            raise

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


class StreamingSummaryProcessor(StreamingAIProcessor):
    """流式摘要处理器"""

    async def generate_summary_stream(
        self, content_item: ContentItem, session: Session
    ) -> AsyncGenerator[StreamChunk, None]:
        """生成流式摘要"""
        async for chunk in self.process_streaming(content_item, "summary", session):
            yield chunk


class StreamingKeyPointsProcessor(StreamingAIProcessor):
    """流式关键要点处理器"""

    async def generate_key_points_stream(
        self, content_item: ContentItem, session: Session
    ) -> AsyncGenerator[StreamChunk, None]:
        """生成流式关键要点"""
        async for chunk in self.process_streaming(content_item, "key_points", session):
            yield chunk
