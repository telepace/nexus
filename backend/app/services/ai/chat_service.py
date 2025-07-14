"""
AI聊天服务
提供基于模板的AI内容生成功能
"""

import asyncio
import json
import logging
import random
from pathlib import Path
from typing import Any

import requests
from jinja2 import Environment, FileSystemLoader

from app.core.config import settings
from app.utils.tag_manager import tag_manager

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
    
    def get_model_for_template(self, template_name: str) -> str:
        """
        根据模板名称获取对应的模型
        
        Args:
            template_name: 模板文件名，如 "summary.j2"
            
        Returns:
            str: 模型名称
        """
        # 从模板名称映射到任务名称
        template_to_task = {
            "summary.j2": "summary",
            "key_points.j2": "key_points", 
            "labels.j2": "labels",
            "segment_aware_chat.j2": "chat",
            "user_analysis.j2": "analysis",
            "expand_discussion.j2": "analysis",  # 使用analysis任务的模型配置
        }
        
        # 获取任务名称
        task_name = template_to_task.get(template_name)
        
        # 从配置中获取模型
        resolved_models = settings.resolved_ai_task_models
        
        if task_name and task_name in resolved_models:
            model = resolved_models[task_name]
            logger.info(f"Model for template '{template_name}' (task: {task_name}): {model}")
            return model
        else:
            # 回退到全局默认
            logger.info(f"Using default model for template '{template_name}': {settings.DEFAULT_LLM_MODEL}")
            return settings.DEFAULT_LLM_MODEL

    def _is_jsonl_content(self, content: str) -> bool:
        """
        检测内容是否为JSONL格式

        Args:
            content: 待检测的内容字符串

        Returns:
            bool: 如果是JSONL格式返回True，否则返回False
        """
        if not content or not content.strip():
            return False

        # 预处理：如果内容被代码块包裹，先去除代码块标记
        cleaned_content = content.strip()

        # 检查是否是被代码块包裹的内容
        if cleaned_content.startswith('```'):
            # 匹配 ```jsonl、```json 或者 ``` 开头，``` 结尾的代码块
            # 注意：jsonl 必须在 json 前面，避免 jsonl 被误匹配为 json
            import re
            code_block_pattern = r'^```(?:jsonl|json)?\s*\n?(.*?)\n?```$'
            match = re.match(code_block_pattern, cleaned_content, re.DOTALL)
            if match:
                cleaned_content = match.group(1).strip()
        else:
            # 改进：检查内容中是否包含被代码块包裹的JSONL
            import re
            # 查找任何位置的代码块，而不只是开头
            code_block_pattern = r'```(?:jsonl|json)?\s*\n?(.*?)\n?```'
            match = re.search(code_block_pattern, cleaned_content, re.DOTALL)
            if match:
                cleaned_content = match.group(1).strip()

        lines = [line.strip() for line in cleaned_content.split('\n') if line.strip()]
        if not lines:
            return False

        # 检查第一行是否为有效JSON
        try:
            first_line = lines[0]
            parsed = json.loads(first_line)
            # 检查是否包含JSONL块的基本字段
            return (
                isinstance(parsed, dict) and
                ("type" in parsed or "t" in parsed) and
                ("content" in parsed or "c" in parsed)
            )
        except (json.JSONDecodeError, TypeError):
            return False

    def _parse_jsonl_content(self, content: str) -> list[dict[str, Any]]:
        """
        解析JSONL内容为块列表

        Args:
            content: JSONL格式的内容字符串

        Returns:
            List[Dict[str, Any]]: 解析后的块列表

        Raises:
            ValueError: 当JSONL格式无效时抛出
        """
        if not content or not content.strip():
            return []

        # 预处理：如果内容被代码块包裹，先去除代码块标记
        cleaned_content = content.strip()

        # 检查是否是被代码块包裹的内容
        if cleaned_content.startswith('```'):
            # 匹配 ```jsonl、```json 或者 ``` 开头，``` 结尾的代码块
            # 注意：jsonl 必须在 json 前面，避免 jsonl 被误匹配为 json
            import re
            code_block_pattern = r'^```(?:jsonl|json)?\s*\n?(.*?)\n?```$'
            match = re.match(code_block_pattern, cleaned_content, re.DOTALL)
            if match:
                cleaned_content = match.group(1).strip()
        else:
            # 改进：检查内容中是否包含被代码块包裹的JSONL
            import re
            # 查找任何位置的代码块，而不只是开头
            code_block_pattern = r'```(?:jsonl|json)?\s*\n?(.*?)\n?```'
            match = re.search(code_block_pattern, cleaned_content, re.DOTALL)
            if match:
                cleaned_content = match.group(1).strip()

        blocks = []
        lines = cleaned_content.split('\n')

        for line_num, line in enumerate(lines, 1):
            line = line.strip()
            if not line:
                continue

            try:
                block = json.loads(line)
                if not isinstance(block, dict):
                    logger.warning(f"JSONL line {line_num} is not a dictionary: {line}")
                    # 将非字典内容包装为段落块
                    block = {"type": "p", "content": str(block), "mapping": f"auto_{line_num}"}

                # 确保基本字段存在
                if "type" not in block and "t" not in block:
                    block["type"] = "p"  # 默认为段落
                if "content" not in block and "c" not in block:
                    block["content"] = ""  # 默认空内容
                if "mapping" not in block:
                    block["mapping"] = f"auto_{line_num}"

                blocks.append(block)

            except json.JSONDecodeError as e:
                logger.warning(f"Invalid JSON at line {line_num}: {line}, error: {e}")
                # 将无效JSON行包装为段落块
                blocks.append({
                    "type": "p",
                    "content": line,
                    "mapping": f"error_{line_num}"
                })

        return blocks

    def _format_jsonl_output(self, blocks: list[dict[str, Any]]) -> str:
        """
        将块列表格式化为JSONL字符串

        Args:
            blocks: 块列表

        Returns:
            str: JSONL格式的字符串
        """
        if not blocks:
            return ""

        lines = []
        for block in blocks:
            try:
                line = json.dumps(block, ensure_ascii=False, separators=(',', ':'))
                lines.append(line)
            except (TypeError, ValueError) as e:
                logger.error(f"Failed to serialize block to JSON: {block}, error: {e}")
                # 回退到简单的段落块
                fallback_block = {
                    "type": "p",
                    "content": str(block.get("content", "")),
                    "mapping": block.get("mapping", "fallback")
                }
                lines.append(json.dumps(fallback_block, ensure_ascii=False, separators=(',', ':')))

        return '\n'.join(lines)

    async def generate_with_template(
        self, template_name: str, context: dict[str, Any], model: str | None = None
    ) -> dict[str, Any]:
        """
        使用模板生成AI响应

        Args:
            template_name: 模板文件名
            context: 模板上下文变量
            model: 可选的模型名称，如果不指定则使用模板映射或全局默认

        Returns:
            dict: AI生成的响应结果
        """
        try:
            # 为 labels.j2 模板添加预设标签
            if template_name == "labels.j2":
                preset_tag_names = tag_manager.get_preset_tag_names()
                context = context.copy()  # 避免修改原始context
                context["existing_tags"] = preset_tag_names
                logger.info(
                    f"为 labels.j2 模板添加了 {len(preset_tag_names)} 个预设标签"
                )

            # 加载模板
            template = self.template_env.get_template(template_name)

            # 渲染模板得到 prompt
            prompt: str = template.render(**context)

            # 新策略：优先使用带标号的内容作为 system prompt，如果没有则回退到原始内容
            formatted_content = context.get("content_with_segment_numbers")
            if formatted_content:
                system_content = formatted_content
                logger.info(f"✅ 使用带段落标号的格式化内容，长度: {len(system_content)}")
            else:
                system_content = context.get("content", "")
                logger.info(f"⚠️ 回退到原始内容，长度: {len(system_content)}")

            logger.info(
                f"Using template {template_name} to build prompt, system_content_length={len(system_content)}, user_prompt_length={len(prompt)}"
            )

            # ---- 使用 LiteLLM 代理调用 LLM ----
            try:
                # 选择模型：优先级为 传入的model > 模板映射 > 全局默认
                selected_model = (
                    model
                    or self.get_model_for_template(template_name)
                )

                logger.info(
                    f"Using model '{selected_model}' for template '{template_name}' "
                    f"(source: {'explicit' if model else 'config_mapping' if selected_model != settings.DEFAULT_LLM_MODEL else 'default'})"
                )

                ai_content = await self._call_litellm_proxy(
                    system_content, prompt, selected_model
                )

                # 针对不同模板的解析策略 - 模板特定处理优先
                if (
                    template_name == "labels.j2"
                    or template_name == "segment_aware_chat.j2"
                ):
                    # 这两种模板要求输出有效 JSON
                    try:
                        # 处理被markdown代码块包裹的JSON
                        json_content = ai_content.strip()
                        if json_content.startswith("```jsonl") or json_content.startswith("```json"):
                            # 提取```json/```jsonl和```之间的内容
                            # 注意：必须先检查jsonl，因为```jsonl也会匹配```json
                            if json_content.startswith("```jsonl"):
                                start_idx = json_content.find("```jsonl") + 8
                            else:
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
                        else:
                            # 改进：检查内容中是否包含被代码块包裹的JSONL
                            import re
                            # 查找任何位置的代码块，而不只是开头
                            code_block_pattern = r'```(?:jsonl|json)?\s*\n?(.*?)\n?```'
                            match = re.search(code_block_pattern, json_content, re.DOTALL)
                            if match:
                                json_content = match.group(1).strip()

                        parsed = json.loads(json_content)

                        # 如果是 labels.j2 模板，对AI生成的标签进行预设标签匹配和过滤
                        if template_name == "labels.j2" and "tags" in parsed:
                            ai_generated_tags = parsed["tags"]
                            if isinstance(ai_generated_tags, list):
                                # 使用标签管理器进行匹配和过滤
                                matched_tags = tag_manager.filter_and_match_preset_tags(
                                    ai_generated_tags
                                )
                                parsed["tags"] = matched_tags
                                logger.info(
                                    f"标签匹配完成: {ai_generated_tags} -> {matched_tags}"
                                )

                        logger.info(f"✅ {template_name} JSON parsing successful")
                        return parsed  # type: ignore[return-value]
                    except json.JSONDecodeError as json_err:
                        logger.warning(
                            f"Expected JSON output for {template_name} but failed to parse: {json_err}"
                        )
                        logger.debug(
                            f"Raw AI content that failed to parse: {ai_content[:500]}"
                        )
                        # JSON 解析失败时，回退到 mock 而不是返回空字典
                        raise Exception(
                            f"JSON parsing failed for {template_name}: {json_err}"
                        )
                elif template_name == "summary.j2":
                    # 处理 summary.j2 模板 - 支持 JSONL 和代码块包裹的内容
                    try:
                        # 先尝试处理被 markdown 代码块包裹的内容
                        extracted_content = ai_content.strip()
                        
                        # 统一的代码块提取逻辑
                        if extracted_content.startswith("```jsonl") or extracted_content.startswith("```json"):
                            # 提取```json/```jsonl和```之间的内容
                            # 注意：必须先检查jsonl，因为```jsonl也会匹配```json
                            if extracted_content.startswith("```jsonl"):
                                start_idx = extracted_content.find("```jsonl") + 8
                            else:
                                start_idx = extracted_content.find("```json") + 7
                            end_idx = extracted_content.rfind("```")
                            if end_idx > start_idx:
                                extracted_content = extracted_content[start_idx:end_idx].strip()
                        elif extracted_content.startswith("```"):
                            # 处理普通代码块
                            start_idx = extracted_content.find("```") + 3
                            end_idx = extracted_content.rfind("```")
                            if end_idx > start_idx:
                                extracted_content = extracted_content[start_idx:end_idx].strip()
                        else:
                            # 检查内容中是否包含被代码块包裹的JSONL
                            import re
                            # 查找任何位置的代码块，而不只是开头
                            code_block_pattern = r'```(?:jsonl|json)?\s*\n?(.*?)\n?```'
                            match = re.search(code_block_pattern, extracted_content, re.DOTALL)
                            if match:
                                extracted_content = match.group(1).strip()

                        # 尝试解析提取的内容为 JSONL
                        if self._is_jsonl_content(extracted_content):
                            logger.info(f"✅ Detected JSONL content for {template_name}")
                            try:
                                blocks = self._parse_jsonl_content(extracted_content)
                                logger.info(f"✅ Parsed {len(blocks)} JSONL blocks for {template_name}")

                                return {
                                    "format": "jsonl",
                                    "blocks": blocks,
                                    "raw_content": extracted_content,
                                    "text": extracted_content
                                }
                            except Exception as jsonl_err:
                                logger.warning(f"JSONL parsing failed for {template_name}: {jsonl_err}")
                                # 继续到文本包装处理

                        # 如果不是JSONL或解析失败，回退到原有逻辑
                        result = {"summary": {"text": ai_content}}
                        logger.info(
                            f"✅ {template_name} processing successful (text format), result keys: {list(result.keys())}"
                        )
                        return result

                    except Exception as e:
                        logger.warning(f"Code block extraction failed for {template_name}: {e}")
                        # 回退到原有逻辑
                        result = {"summary": {"text": ai_content}}
                        logger.info(
                            f"✅ {template_name} processing successful (fallback), result keys: {list(result.keys())}"
                        )
                        return result

                elif template_name == "key_points.j2":
                    # 处理 key_points.j2 模板 - 支持 JSONL 和代码块包裹的内容
                    try:
                        # 先尝试处理被 markdown 代码块包裹的内容
                        extracted_content = ai_content.strip()
                        
                        # 统一的代码块提取逻辑
                        if extracted_content.startswith("```jsonl") or extracted_content.startswith("```json"):
                            # 提取```json/```jsonl和```之间的内容
                            # 注意：必须先检查jsonl，因为```jsonl也会匹配```json
                            if extracted_content.startswith("```jsonl"):
                                start_idx = extracted_content.find("```jsonl") + 8
                            else:
                                start_idx = extracted_content.find("```json") + 7
                            end_idx = extracted_content.rfind("```")
                            if end_idx > start_idx:
                                extracted_content = extracted_content[start_idx:end_idx].strip()
                        elif extracted_content.startswith("```"):
                            # 处理普通代码块
                            start_idx = extracted_content.find("```") + 3
                            end_idx = extracted_content.rfind("```")
                            if end_idx > start_idx:
                                extracted_content = extracted_content[start_idx:end_idx].strip()
                        else:
                            # 检查内容中是否包含被代码块包裹的JSONL
                            import re
                            # 查找任何位置的代码块，而不只是开头
                            code_block_pattern = r'```(?:jsonl|json)?\s*\n?(.*?)\n?```'
                            match = re.search(code_block_pattern, extracted_content, re.DOTALL)
                            if match:
                                extracted_content = match.group(1).strip()

                        # 尝试解析提取的内容为 JSONL
                        if self._is_jsonl_content(extracted_content):
                            logger.info(f"✅ Detected JSONL content for {template_name}")
                            try:
                                blocks = self._parse_jsonl_content(extracted_content)
                                logger.info(f"✅ Parsed {len(blocks)} JSONL blocks for {template_name}")

                                return {
                                    "format": "jsonl",
                                    "blocks": blocks,
                                    "raw_content": extracted_content,
                                    "text": extracted_content
                                }
                            except Exception as jsonl_err:
                                logger.warning(f"JSONL parsing failed for {template_name}: {jsonl_err}")
                                # 继续到文本包装处理

                        # 如果不是JSONL或解析失败，回退到原有逻辑
                        result = {"key_points": {"text": ai_content}}
                        logger.info(
                            f"✅ {template_name} processing successful (text format), result keys: {list(result.keys())}"
                        )
                        return result

                    except Exception as e:
                        logger.warning(f"Code block extraction failed for {template_name}: {e}")
                        # 回退到原有逻辑
                        result = {"key_points": {"text": ai_content}}
                        logger.info(
                            f"✅ {template_name} processing successful (fallback), result keys: {list(result.keys())}"
                        )
                        return result
                else:
                    # 通用JSONL检测 - 仅用于其他模板
                    if self._is_jsonl_content(ai_content):
                        logger.info(f"✅ Detected JSONL output for {template_name}")
                        try:
                            # 解析JSONL内容
                            blocks = self._parse_jsonl_content(ai_content)
                            logger.info(f"✅ Parsed {len(blocks)} JSONL blocks for {template_name}")

                            # 返回结构化结果
                            return {
                                "format": "jsonl",
                                "blocks": blocks,
                                "raw_content": ai_content,
                                "text": ai_content  # 保持向后兼容
                            }
                        except Exception as jsonl_err:
                            logger.warning(f"JSONL parsing failed for {template_name}: {jsonl_err}")
                            # 如果JSONL解析失败，回退到原始内容处理
                    
                    # 默认处理
                    result = {"text": ai_content}  # type: ignore[dict-item]
                    logger.info(f"✅ {template_name} processing successful (default)")
                    return result
            except Exception as lite_err:
                logger.error(
                    f"LiteLLM proxy call failed: {lite_err}; falling back to mock"
                )

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

    async def _call_litellm_proxy(
        self, system_content: str, user_prompt: str, model: str | None = None
    ) -> str:
        """通过LiteLLM代理调用LLM"""

        def sync_request():
            """同步的requests调用"""
            # 选择模型：使用传入的model参数或全局默认
            selected_model = model or settings.DEFAULT_LLM_MODEL

            # 构建请求数据
            request_data = {
                "model": selected_model,
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

            logger.debug(f"Calling LiteLLM proxy: {url} with model: {selected_model}")

            response = requests.post(
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

        try:
            # 在线程池中运行同步请求，避免阻塞异步事件循环
            loop = asyncio.get_event_loop()
            return await loop.run_in_executor(None, sync_request)

        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 401:
                logger.error(
                    "LLM API authentication failed. Check LITELLM_MASTER_KEY configuration."
                )
                raise Exception(f"LLM API authentication failed: {e}")
            else:
                logger.error(f"LLM API HTTP error {e.response.status_code}: {e}")
                raise Exception(f"LLM API error: {e}")
        except requests.exceptions.RequestException as e:
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

        # 从预设标签中随机选择一些作为mock结果
        preset_tag_names = tag_manager.get_preset_tag_names()

        if preset_tag_names:
            # 基于内容关键词匹配预设标签
            content_lower = content.lower()
            matched_tags = []

            # 技术相关关键词映射
            tech_keywords = {
                "ai": ["人工智能", "机器学习", "深度学习"],
                "machine learning": ["机器学习", "人工智能", "数据科学"],
                "programming": ["编程开发", "前端开发", "后端开发"],
                "web": ["Web开发", "前端开发", "后端开发"],
                "data": ["数据科学", "数据分析", "数据库"],
                "design": ["设计", "用户体验"],
                "business": ["产品管理", "项目管理", "市场营销"],
                "research": ["学术研究", "案例研究"],
                "教育": ["教育培训", "个人成长"],
                "工具": ["效率工具", "工具推荐"],
            }

            # 匹配相关标签
            for keyword, related_tags in tech_keywords.items():
                if keyword in content_lower:
                    for tag in related_tags:
                        if tag in preset_tag_names and tag not in matched_tags:
                            matched_tags.append(tag)

            # 如果没有匹配到，随机选择一些通用标签
            if not matched_tags:
                general_tags = ["技术文档", "工具推荐", "个人成长", "效率工具"]
                matched_tags = [tag for tag in general_tags if tag in preset_tag_names][
                    :3
                ]

            # 限制标签数量在3-6个
            tags = (
                matched_tags[:6]
                if len(matched_tags) >= 3
                else matched_tags + ["技术文档"][:6]
            )
        else:
            # 回退到原始关键词方式
            keywords = ["技术文档", "学习资源", "工具推荐"]
            tags = keywords[:3]

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
        technical_terms = [
            "算法",
            "量子",
            "神经网络",
            "深度学习",
            "机器学习",
            "人工智能",
            "计算机",
            "程序",
            "数据",
        ]
        term_count = sum(1 for term in technical_terms if term in content)
        if term_count >= 3:
            base_reading_time = int(base_reading_time * 1.5)
        elif term_count >= 1:
            base_reading_time = int(base_reading_time * 1.2)

        reading_time_minutes = max(1, base_reading_time)

        # 生成优化标题和简短描述
        optimized_title = content.split("。")[0][:30] + "..." if content else "内容分析"
        brief_description = content[:80] + "..." if len(content) > 80 else content

        return {
            "optimized_title": optimized_title,
            "brief_description": brief_description or "暂无描述",
            "tags": tags,
            "score": score,
            "reading_time_minutes": reading_time_minutes,
        }
