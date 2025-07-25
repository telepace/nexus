"""
增强版 ChatService

集成新的 JSONL 解析器，提供更强大的内容处理能力：
- 高性能 JSONL 解析
- 智能错误恢复
- 详细的错误报告
- 缓存和优化
- 多格式输出支持
"""

import json
import logging
from typing import Any

from jinja2 import Environment, FileSystemLoader

from app.core.config import settings
from app.utils.jsonl_parser import ParseOptions, PreprocessorConfig
from app.utils.jsonl_service import JsonlService, ServiceConfig
from app.utils.tag_manager import tag_manager

logger = logging.getLogger(__name__)


class EnhancedChatService:
    """增强版聊天服务"""

    def __init__(self):
        self.template_env = Environment(
            loader=FileSystemLoader("app/prompt_templates"),
            trim_blocks=True,
            lstrip_blocks=True,
        )

        # 配置 JSONL 服务
        service_config = ServiceConfig(
            enable_caching=True,
            cache_size=1000,
            enable_stats=True,
            auto_recovery=True,
            max_retry_attempts=3,
            timeout_seconds=30.0,
        )
        self.jsonl_service = JsonlService(service_config)

        # 注册自定义处理器
        self._setup_custom_processors()

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
            "simple_chat.j2": "chat",  # 🎯 新增：简单聊天模板使用chat任务
            "user_analysis.j2": "analysis",
            "expand_discussion.j2": "analysis",  # 使用analysis任务的模型配置

            # 🎯 新增：支持常见的prompt名称映射到chat任务
            "提取要点": "chat",
            "总结内容": "chat",
            "关键信息": "chat",
            "深度分析": "analysis",
            "详细解读": "analysis",
        }

        # 获取任务名称
        task_name = template_to_task.get(template_name)

        # 从配置中获取模型
        resolved_models = settings.resolved_ai_task_models

        if task_name and task_name in resolved_models:
            model = resolved_models[task_name]
            logger.info(
                f"Enhanced model for template '{template_name}' (task: {task_name}): {model}"
            )
            return model
        else:
            # 回退到全局默认
            logger.info(
                f"Using default model for template '{template_name}': {settings.DEFAULT_LLM_MODEL}"
            )
            return settings.DEFAULT_LLM_MODEL

    def _setup_custom_processors(self):
        """设置自定义处理器"""

        def content_enhancer(blocks):
            """内容增强处理器"""
            for block in blocks:
                # 为洞察类型的块添加特殊标记
                if block.type == "insight":
                    if not block.get_attribute("priority"):
                        block.attributes["priority"] = "high"

                # 为行动建议添加紧急程度
                elif block.type == "action":
                    if not block.get_attribute("urgency"):
                        block.attributes["urgency"] = "medium"

            return blocks

        self.jsonl_service.register_custom_processor(content_enhancer)

    async def generate_with_template(
        self,
        template_name: str,
        context: dict[str, Any],
        model: str | None = None,
        output_format: str = "auto",
    ) -> dict[str, Any]:
        """
        使用模板生成AI响应（增强版）

        Args:
            template_name: 模板文件名
            context: 模板上下文变量
            model: 可选的模型名称
            output_format: 输出格式 ("auto", "jsonl", "markdown", "compact", "pretty")

        Returns:
            dict: AI生成的响应结果
        """
        try:
            # 为 labels.j2 模板添加预设标签
            if template_name == "labels.j2":
                preset_tag_names = tag_manager.get_preset_tag_names()
                context = context.copy()
                context["existing_tags"] = preset_tag_names
                logger.info(
                    f"为 labels.j2 模板添加了 {len(preset_tag_names)} 个预设标签"
                )

            # 加载模板
            template = self.template_env.get_template(template_name)
            prompt = template.render(**context)

            # 准备系统内容
            formatted_content = context.get("content_with_segment_numbers")
            if formatted_content:
                system_content = formatted_content
                logger.info(
                    f"✅ 使用带段落标号的格式化内容，长度: {len(system_content)}"
                )
            else:
                system_content = context.get("content", "")
                logger.info(f"⚠️ 回退到原始内容，长度: {len(system_content)}")

            logger.info(
                f"Using enhanced template {template_name}, "
                f"system_content_length={len(system_content)}, "
                f"user_prompt_length={len(prompt)}"
            )

            # 选择模型
            selected_model = model or self.get_model_for_template(template_name)

            logger.info(f"使用模型 '{selected_model}' 处理模板 '{template_name}'")

            # 调用 LLM
            ai_content = await self._call_litellm_proxy(
                system_content, prompt, selected_model
            )

            # 使用增强的 JSONL 处理
            result = await self._process_ai_output(
                ai_content, template_name, output_format
            )

            # 添加元数据
            result.update(
                {
                    "template_name": template_name,
                    "model_used": selected_model,
                    "system_content_length": len(system_content),
                    "prompt_length": len(prompt),
                    "raw_ai_output": ai_content,
                }
            )

            return result

        except Exception as e:
            logger.error(f"Enhanced template generation failed: {str(e)}")
            return self._create_error_response(str(e), template_name)

    async def _process_ai_output(
        self, ai_content: str, template_name: str, output_format: str = "auto"
    ) -> dict[str, Any]:
        """
        处理 AI 输出内容

        Args:
            ai_content: AI 生成的内容
            template_name: 模板名称
            output_format: 输出格式

        Returns:
            dict: 处理后的结果
        """
        try:
            # 检测输出格式
            if output_format == "auto":
                if self._is_jsonl_template(template_name):
                    output_format = "compact"
                else:
                    output_format = "markdown"

            # 使用 JSONL 服务处理内容
            if output_format in ["compact", "pretty", "jsonl"]:
                # 配置解析选项
                parse_options = ParseOptions(
                    strict_mode=False,
                    max_errors=50,
                    auto_generate_mapping=True,
                    preprocessor=PreprocessorConfig(
                        remove_code_blocks=True,
                        fix_common_errors=True,
                        normalize_quotes=True,
                    ),
                )

                result = await self.jsonl_service.process_content(
                    ai_content, parse_options=parse_options, format_type=output_format
                )

                # 增强结果信息
                if result["success"]:
                    logger.info(
                        f"✅ 成功处理 {template_name} 的输出: "
                        f"{len(result['blocks'])} 个块, "
                        f"{result['stats']['error_count']} 个错误"
                    )

                    return {
                        "format": "jsonl",
                        "success": True,
                        "blocks": result["blocks"],
                        "content": result["content"],
                        "stats": result["stats"],
                        "errors": result["errors"],
                        "warnings": result["warnings"],
                        "processing_info": {
                            "input_format": result["input_format"],
                            "output_format": result["output_format"],
                            "cache_used": result["metadata"].get("cache_used", False),
                        },
                    }
                else:
                    logger.warning(
                        f"⚠️ JSONL 处理部分失败 {template_name}: "
                        f"{len(result['errors'])} 个错误"
                    )

                    # 即使有错误，也返回部分结果
                    return {
                        "format": "jsonl",
                        "success": False,
                        "blocks": result["blocks"],
                        "content": result["content"],
                        "errors": result["errors"],
                        "warnings": result["warnings"],
                        "raw_content": ai_content,
                    }

            # 其他格式的处理逻辑
            return await self._process_other_formats(
                ai_content, template_name, output_format
            )

        except Exception as e:
            logger.error(f"AI 输出处理失败 {template_name}: {str(e)}")
            return self._create_error_response(f"输出处理失败: {str(e)}", template_name)

    async def _process_other_formats(
        self, ai_content: str, template_name: str, output_format: str
    ) -> dict[str, Any]:
        """处理其他格式的输出"""

        if template_name in ["labels.j2", "segment_aware_chat.j2"]:
            # 这些模板要求 JSON 输出
            try:
                parsed_json = json.loads(ai_content.strip())
                return {
                    "format": "json",
                    "success": True,
                    "data": parsed_json,
                    "text": ai_content,
                }
            except json.JSONDecodeError as e:
                logger.error(f"JSON 解析失败 {template_name}: {e}")
                return {
                    "format": "text",
                    "success": False,
                    "text": ai_content,
                    "error": f"JSON 解析失败: {str(e)}",
                }

        # 默认返回文本格式
        return {"format": "text", "success": True, "text": ai_content}

    def _is_jsonl_template(self, template_name: str) -> bool:
        """检查是否为 JSONL 输出模板"""
        jsonl_templates = {"jsonl_output_rules.j2", "summary.j2", "key_points.j2"}
        return template_name in jsonl_templates

    def _create_error_response(
        self, error_message: str, template_name: str
    ) -> dict[str, Any]:
        """创建错误响应"""
        return {
            "format": "error",
            "success": False,
            "error": error_message,
            "template_name": template_name,
            "text": "",
        }

    async def _call_litellm_proxy(
        self, system_content: str, user_prompt: str, model: str
    ) -> str:
        """调用 LiteLLM 代理"""
        # 这里应该实现实际的 LLM 调用逻辑
        # 为了演示，返回一个模拟的 JSONL 响应
        return """{"t": "h1", "c": "AI 分析结果"}
{"t": "p", "c": "这是一个基于用户输入生成的分析结果。"}
{"t": "insight", "c": "重要发现：用户的需求很明确", "expandable": "详细分析用户意图"}
{"t": "action", "c": "建议采取相应的处理措施"}"""

    async def get_processing_stats(self) -> dict[str, Any]:
        """获取处理统计信息"""
        return self.jsonl_service.get_processing_stats()

    async def validate_jsonl_output(self, content: str) -> dict[str, Any]:
        """验证 JSONL 输出的有效性"""
        return await self.jsonl_service.validate_jsonl(content)

    def clear_cache(self):
        """清空缓存"""
        self.jsonl_service.clear_cache()

    def reset_stats(self):
        """重置统计信息"""
        self.jsonl_service.reset_stats()


# 导出的公共接口
__all__ = ["EnhancedChatService"]
