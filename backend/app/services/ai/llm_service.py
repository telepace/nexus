"""
LLM服务模块
提供大语言模型的对话接口
"""

import logging
from typing import Any

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


class LLMService:
    """大语言模型服务类"""

    @staticmethod
    async def chat_completion(
        messages: list[dict[str, str]],
        model: str | None = None,
        temperature: float = 0.7,
        max_tokens: int = 2000,
    ) -> str:
        """
        调用LLM进行对话完成

        Args:
            messages: 对话消息列表，每个消息包含role和content
            model: 使用的模型名称，默认使用配置中的模型
            temperature: 响应的随机性，0-1之间
            max_tokens: 最大生成token数

        Returns:
            str: LLM生成的回复内容

        Raises:
            Exception: 当LLM调用失败时
        """
        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                # 构建请求数据
                request_data = {
                    "model": model or settings.DEFAULT_LLM_MODEL,
                    "messages": messages,
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                }

                # 准备请求头，包含认证信息
                headers = {"Content-Type": "application/json"}
                if settings.LITELLM_MASTER_KEY:
                    headers["Authorization"] = f"Bearer {settings.LITELLM_MASTER_KEY}"

                # 调用LiteLLM代理
                base_url = str(settings.LITELLM_PROXY_URL).rstrip("/")
                url = f"{base_url}/v1/chat/completions"

                logger.debug(f"Calling LLM: {url} with model: {request_data['model']}")

                response = await client.post(
                    url,
                    json=request_data,
                    headers=headers,
                    timeout=120.0,
                )

                response.raise_for_status()
                response_data = response.json()

                # 提取LLM响应内容
                if "choices" not in response_data or not response_data["choices"]:
                    raise ValueError("Invalid LLM response: missing choices")

                content = response_data["choices"][0]["message"]["content"]
                logger.info(f"✅ LLM response received, content length: {len(content)}")
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

    @staticmethod
    async def generate_context_aware_response(
        user_message: str,
        context: str,
        conversation_history: list[dict[str, str]] | None = None,
        system_prompt: str | None = None,
    ) -> str:
        """
        生成基于上下文的AI回复

        Args:
            user_message: 用户消息
            context: 相关的上下文内容（如文档内容）
            conversation_history: 历史对话记录
            system_prompt: 系统提示词

        Returns:
            str: AI生成的回复
        """
        messages = []

        # 构建系统消息
        if system_prompt:
            system_content = system_prompt
        else:
            system_content = f"""你是一个智能助手，专门帮助用户理解和分析内容。

相关内容:
{context}

请基于上述内容回答用户的问题。如果问题与内容不相关，请礼貌地引导用户回到主题。"""

        messages.append({"role": "system", "content": system_content})

        # 添加历史对话
        if conversation_history:
            messages.extend(conversation_history)

        # 添加当前用户消息
        messages.append({"role": "user", "content": user_message})

        return await LLMService.chat_completion(messages)

    @staticmethod
    async def analyze_content(
        content: str,
        analysis_type: str,
        custom_prompt: str | None = None,
    ) -> dict[str, Any]:
        """
        对内容进行AI分析

        Args:
            content: 要分析的内容
            analysis_type: 分析类型 (summary, key_points, questions, insights, action_items)
            custom_prompt: 自定义分析提示词

        Returns:
            dict: 分析结果
        """
        if custom_prompt:
            user_prompt = custom_prompt
        else:
            prompts = {
                "summary": "请为以下内容生成一个简洁的摘要（200-300字）：",
                "key_points": "请提取以下内容的关键要点（5-8个要点）：",
                "questions": "基于以下内容，请生成5个深度思考问题：",
                "insights": "请分析以下内容并提供深度见解和观点：",
                "action_items": "基于以下内容，请生成具体的行动建议：",
            }
            user_prompt = prompts.get(
                analysis_type, f"请分析以下内容（{analysis_type}）："
            )

        messages = [
            {"role": "system", "content": content},
            {"role": "user", "content": user_prompt},
        ]

        response = await LLMService.chat_completion(messages, temperature=0.3)

        return {
            "type": analysis_type,
            "result": response,
            "metadata": {
                "content_length": len(content),
                "analysis_type": analysis_type,
            },
        }
