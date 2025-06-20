"""
AI聊天服务
提供基于模板的AI内容生成功能
"""

import logging
from pathlib import Path
from typing import Any

from jinja2 import Environment, FileSystemLoader

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

            # 渲染模板
            template.render(**context)

            logger.info(f"使用模板 {template_name} 生成提示词")

            # 模拟AI响应（在实际项目中这里会调用真实的AI服务）
            if template_name == "summary.j2":
                return await self._generate_mock_summary(context)
            elif template_name == "key_points.j2":
                return await self._generate_mock_key_points(context)
            elif template_name == "labels.j2":
                return await self._generate_mock_labels(context)
            else:
                return {"result": "模拟AI响应"}

        except Exception as e:
            logger.error(f"模板生成失败: {template_name}, 错误: {str(e)}")
            return {}

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
        """生成模拟标签"""
        content = context.get("content", "")

        # 简单的关键词提取
        tech_terms = [
            "技术",
            "AI",
            "人工智能",
            "机器学习",
            "深度学习",
            "算法",
            "数据",
            "系统",
        ]
        found_terms = [term for term in tech_terms if term in content]

        return {
            "primary_tags": {
                "topics": found_terms[:3] if found_terms else ["技术", "分析"],
                "concepts": ["核心概念", "理论框架"],
                "industries": ["科技", "信息技术"],
            },
            "secondary_tags": {
                "skills": ["技术能力", "分析能力"],
                "tools": ["工具应用"],
                "methodologies": ["方法论"],
            },
        }
