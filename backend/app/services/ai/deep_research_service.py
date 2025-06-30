import asyncio
import json
import logging
import os
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import HTTPException
from gpt_researcher import GPTResearcher
from sqlmodel import Session

from app.core.database import engine
from app.models.content_item import ContentItem
from app.schemas.deep_research import DeepResearchRequest, DeepResearchResponse
from app.services.ai.preprocessing_pipeline import PreprocessingPipeline

logger = logging.getLogger(__name__)


class DeepResearchService:
    def __init__(self):
        self.preprocessing_pipeline = PreprocessingPipeline()
        # 保存原始环境变量
        self._original_openai_api_key = os.environ.get("OPENAI_API_KEY")
        self._original_openai_base_url = os.environ.get("OPENAI_BASE_URL")
        self._original_litellm_proxy_url = os.environ.get("LITELLM_PROXY_URL")

    def _setup_embedding_env(self):
        """为embedding设置直接的OpenAI API环境"""
        # 为embedding使用直接的OpenAI API
        if self._original_openai_api_key:
            os.environ["OPENAI_API_KEY"] = self._original_openai_api_key
        if self._original_openai_base_url:
            os.environ["OPENAI_BASE_URL"] = self._original_openai_base_url
        # 临时移除LiteLLM proxy URL，让embedding直接使用OpenAI
        if "LITELLM_PROXY_URL" in os.environ:
            del os.environ["LITELLM_PROXY_URL"]

    def _restore_original_env(self):
        """恢复原始环境变量"""
        if self._original_litellm_proxy_url:
            os.environ["LITELLM_PROXY_URL"] = self._original_litellm_proxy_url

    async def _conduct_research(self, query: str, report_type: str = "research_report") -> str:
        """使用GPT Researcher进行深度研究"""
        try:
            # 设置embedding环境
            self._setup_embedding_env()
            
            logger.info(f"开始深度研究: {query}")
            
            # 配置研究参数
            config = {
                "llm_provider": "openai",
                "fast_llm_model": "gpt-4o-mini",
                "smart_llm_model": "gpt-4o",
                "embedding_provider": "openai",
                "embedding_model": "text-embedding-3-small",
                "search_provider": "tavily",
                "max_iterations": 3,
                "max_subtopics": 5,
                "report_format": "markdown",
                "total_words": 2000,
            }
            
            # 创建研究实例
            researcher = GPTResearcher(
                query=query,
                report_type=report_type,
                config_path=None,
                **config
            )
            
            # 执行研究
            logger.info("正在执行GPT Researcher...")
            research_result = await researcher.conduct_research()
            logger.info("GPT Researcher研究完成")
            
            # 生成报告
            logger.info("正在生成研究报告...")
            report = await researcher.write_report()
            logger.info(f"研究报告生成完成，长度: {len(report)} 字符")
            
            if not report or report.strip() == "":
                raise ValueError("生成的研究报告为空")
                
            return report
            
        except Exception as e:
            logger.error(f"深度研究过程中发生错误: {str(e)}")
            raise HTTPException(status_code=500, detail=f"深度研究失败: {str(e)}")
        finally:
            # 恢复原始环境变量
            self._restore_original_env()

    async def _create_content_item_for_research(
        self, 
        query: str, 
        research_report: str, 
        user_id: int
    ) -> ContentItem:
        """为研究报告创建内容项"""
        try:
            # 创建临时markdown文件
            with tempfile.NamedTemporaryFile(mode='w', suffix='.md', delete=False, encoding='utf-8') as temp_file:
                temp_file.write(research_report)
                temp_file_path = temp_file.name

            try:
                # 使用预处理管道处理markdown文件
                logger.info("开始处理研究报告...")
                result = await self.preprocessing_pipeline.process_file(
                    file_path=temp_file_path,
                    user_id=user_id,
                    source_type="deep_research",
                    metadata={
                        "research_query": query,
                        "generated_at": datetime.utcnow().isoformat(),
                        "report_type": "research_report"
                    }
                )
                
                if not result.success:
                    raise ValueError(f"处理研究报告失败: {result.error}")
                
                logger.info(f"研究报告处理完成，创建了内容项 ID: {result.content_item.id}")
                return result.content_item
                
            finally:
                # 清理临时文件
                try:
                    os.unlink(temp_file_path)
                except OSError:
                    pass
                    
        except Exception as e:
            logger.error(f"创建研究报告内容项时发生错误: {str(e)}")
            raise HTTPException(status_code=500, detail=f"创建研究报告内容项失败: {str(e)}")

    async def process_deep_research(self, request: DeepResearchRequest, user_id: int) -> DeepResearchResponse:
        """处理深度研究请求"""
        try:
            logger.info(f"用户 {user_id} 开始深度研究: {request.query}")
            
            # 进行深度研究
            research_report = await self._conduct_research(
                query=request.query,
                report_type=request.report_type or "research_report"
            )
            
            # 创建内容项
            content_item = await self._create_content_item_for_research(
                query=request.query,
                research_report=research_report,
                user_id=user_id
            )
            
            # 保存研究报告到静态文件
            research_dir = Path("static/deep_research")
            research_dir.mkdir(exist_ok=True)
            
            timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
            filename = f"research_{content_item.id}_{timestamp}.md"
            file_path = research_dir / filename
            
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(research_report)
            
            logger.info(f"深度研究完成，报告已保存到: {file_path}")
            
            return DeepResearchResponse(
                success=True,
                content_item_id=content_item.id,
                report_path=str(file_path),
                message="深度研究完成"
            )
            
        except Exception as e:
            logger.error(f"深度研究处理失败: {str(e)}")
            return DeepResearchResponse(
                success=False,
                error=str(e),
                message="深度研究失败"
            ) 