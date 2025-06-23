"""
AI聊天服务
提供基于模板的AI内容生成功能
"""

import json
import logging
import os
import random
from pathlib import Path
from typing import Any

import httpx
from jinja2 import Environment, FileSystemLoader

from app.core.config import settings

logger = logging.getLogger(__name__)


class ChatService:
    """AI聊天服务类"""

    def __init__(self):
        """初始化聊天服务"""
        # 设置模板目录
        template_dir = Path(__file__).parent.parent.parent / "prompt_templates"
        self.template_env = Environment(
            loader=FileSystemLoader(str(template_dir)), autoescape=False
        )

    async def generate_with_template(
        self, template_name: str, context: dict[str, Any]
    ) -> dict[str, Any]:
        """
        使用模板生成AI响应

        Args:
            template_name: 模板文件名
            context: 模板上下文变量

        Returns:
            dict: AI生成的响应结果
        """
        try:
            # 加载模板
            template = self.template_env.get_template(template_name)

            # 渲染模板得到 prompt
            prompt: str = template.render(**context)

            # 新策略：将原始内容作为 system prompt，将渲染后的模板作为 user prompt
            system_content: str = context.get("content", "")

            logger.info(
                f"Using template {template_name} to build prompt, system_content_length={len(system_content)}, user_prompt_length={len(prompt)}"
            )

            # ---- 使用 LiteLLM 代理调用 LLM ----
            try:
                ai_content = await self._call_litellm_proxy(system_content, prompt)

                # 针对不同模板的解析策略
                if template_name == "labels.j2" or template_name == "segment_aware_chat.j2":
                    # 这两种模板要求输出有效 JSON
                    try:
                        # 处理被markdown代码块包裹的JSON
                        json_content = ai_content.strip()
                        if json_content.startswith("```json"):
                            # 提取```json和```之间的内容
                            start_idx = json_content.find("```json") + 7
                            end_idx = json_content.rfind("```")
                            if end_idx > start_idx:
                                json_content = json_content[start_idx:end_idx].strip()
                        elif json_content.startswith("```"):
                            # 处理普通代码块
                            start_idx = json_content.find("```") + 3
                            end_idx = json_content.rfind("```")
                            if end_idx > start_idx:
                                json_content = json_content[start_idx:end_idx].strip()
                        
                        parsed = json.loads(json_content)
                        logger.info(f"✅ {template_name} JSON parsing successful")
                        return parsed  # type: ignore[return-value]
                    except json.JSONDecodeError as json_err:
                        logger.warning(
                            f"Expected JSON output for {template_name} but failed to parse: {json_err}"
                        )
                        logger.debug(f"Raw AI content that failed to parse: {ai_content[:500]}")
                        # JSON 解析失败时，回退到 mock 而不是返回空字典
                        raise Exception(f"JSON parsing failed for {template_name}: {json_err}")
                elif template_name == "summary.j2":
                    result = {"summary": {"text": ai_content}}
                    logger.info(f"✅ {template_name} processing successful, result keys: {list(result.keys())}")
                    return result
                elif template_name == "key_points.j2":
                    result = {"key_points": {"text": ai_content}}
                    logger.info(f"✅ {template_name} processing successful, result keys: {list(result.keys())}")
                    return result
                else:
                    result = {"text": ai_content}
                    logger.info(f"✅ {template_name} processing successful (default)")
                    return result
            except Exception as lite_err:
                logger.error(f"LiteLLM proxy call failed: {lite_err}; falling back to mock")

            # --- fallback mock ---
            if template_name == "summary.j2":
                return await self._generate_mock_summary(context)
            elif template_name == "key_points.j2":
                return await self._generate_mock_key_points(context)
            elif template_name == "labels.j2":
                return await self._generate_mock_labels(context)
            else:
                return {"result": "mock response"}

        except Exception as e:
            logger.error(f"模板生成失败: {template_name}, 错误: {str(e)}")
            return {}

    async def _call_litellm_proxy(self, system_content: str, user_prompt: str) -> str:
        """通过LiteLLM代理调用LLM"""
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                # 构建请求数据
                request_data = {
                    "model": settings.DEFAULT_LLM_MODEL,
                    "messages": [
                        {"role": "system", "content": system_content},
                        {"role": "user", "content": user_prompt},
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
                    f"Calling LiteLLM proxy: {url} with model: {settings.DEFAULT_LLM_MODEL}"
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
                logger.info(f"✅ LLM response received, content length: {len(content)}")
                logger.debug(f"🔍 LLM response content preview: {content[:200]}")
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

    async def _generate_mock_summary(self, context: dict[str, Any]) -> dict[str, Any]:
        """生成模拟摘要"""
        content = context.get("content", "")
        sentences = content.split("。")[:3]

        return {
            "summary": {
                "main_thesis": sentences[0] if sentences else "主要观点",
                "key_arguments": sentences[1:3]
                if len(sentences) > 1
                else ["关键论点1", "关键论点2"],
                "word_count": len(" ".join(sentences).split()),
            }
        }

    async def _generate_mock_key_points(
        self, context: dict[str, Any]
    ) -> dict[str, Any]:
        """生成模拟关键点"""
        return {
            "key_points": {
                "core_concepts": [
                    {"point": "关键概念1", "category": "main", "priority": "high"},
                    {
                        "point": "关键概念2",
                        "category": "secondary",
                        "priority": "medium",
                    },
                ],
                "total_points": 2,
            }
        }

    async def _generate_mock_labels(self, context: dict[str, Any]) -> dict[str, Any]:
        """生成模拟标签、评分和阅读时间（适配新版标签Prompt）"""
        content = context.get("content", "")

        # 简单关键词提取作为示例
        keywords = [
            "ai",
            "machine learning",
            "data",
            "python",
            "analysis",
        ]

        tags = [
            kw.replace(" ", "-") for kw in keywords if kw.lower() in content.lower()
        ] or [
            "general",
            "content",
        ]

        # 生成 0~5 的随机评分（示例），真实场景应由模型给出
        score = round(random.uniform(3.0, 5.0), 1)
        
        # 基于内容长度生成阅读时间估算
        word_count = len(content.split())
        # 改进的阅读时间估算：根据内容复杂度和类型调整
        content_type = context.get("content_type", "").lower()
        
        # 基础阅读速度根据内容类型调整
        if "学术" in content_type or "论文" in content_type or "研究" in content_type:
            # 学术内容阅读较慢
            base_reading_time = max(1, word_count // 120)
        elif "技术" in content_type or "专业" in content_type:
            # 技术内容中等速度
            base_reading_time = max(1, word_count // 140)
        else:
            # 普通内容正常速度
            base_reading_time = max(1, word_count // 180)
            
        # 根据专业术语密度进一步调整
        technical_terms = ["算法", "量子", "神经网络", "深度学习", "机器学习", "人工智能", "计算机", "程序", "数据"]
        term_count = sum(1 for term in technical_terms if term in content)
        if term_count >= 3:
            base_reading_time = int(base_reading_time * 1.5)
        elif term_count >= 1:
            base_reading_time = int(base_reading_time * 1.2)
            
        reading_time_minutes = max(1, base_reading_time)

        return {
            "tags": tags[:8],
            "score": score,
            "reading_time_minutes": reading_time_minutes,
        }
