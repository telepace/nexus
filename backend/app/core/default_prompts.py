"""
默认 Prompts 配置文件
集中管理所有默认的 prompt 模板，避免在多个地方重复定义
"""

from typing import List, Dict, Any
from app.models import PromptType, Visibility

# 默认标签配置
DEFAULT_TAGS = [
    {
        "name": "文章分析",
        "description": "用于分析文章内容的提示词",
        "color": "#3B82F6",
    },
    {
        "name": "内容理解", 
        "description": "帮助理解复杂内容的提示词",
        "color": "#10B981",
    },
    {
        "name": "学习辅助",
        "description": "辅助学习和记忆的提示词",
        "color": "#F59E0B",
    },
    {
        "name": "思维拓展",
        "description": "拓展思维和讨论的提示词", 
        "color": "#8B5CF6",
    },
]

# 默认 Prompts 配置
DEFAULT_PROMPTS = [
    {
        "name": "总结全文",
        "description": "快速为当前文章生成一段简洁明了的核心内容摘要，帮助用户在短时间内把握文章主旨和关键信息。",
        "content": """请将以下文章浓缩成一段150-250字的摘要，突出其核心论点、主要发现/信息和结论。摘要应清晰、连贯，避免不必要的细节和专业术语（除非是文章核心概念）。

目标是快速理解"这篇文章讲了什么？"以及"最重要的信息是什么？"

文章内容：
{content}

请提供简洁明了的摘要：""",
        "type": PromptType.TEMPLATE,
        "visibility": Visibility.PUBLIC,
        "enabled": False,
        "input_vars": [
            {"name": "content", "description": "文章内容", "required": True}
        ],
        "tags": ["文章分析", "内容理解"],
    },
    {
        "name": "提取核心要点",
        "description": "从文章中识别并列出最重要的几个核心观点、论据、数据或洞察，以项目符号或编号列表的形式呈现，方便用户快速浏览和记忆。",
        "content": """请从以下文章中提取3-7个最核心的要点。每个要点应简明扼要，能独立表达一个清晰的观点或信息。请使用项目符号列表（bullet points）或编号列表（numbered list）格式输出。

目标是结构化地展示文章的"精华骨架"。

文章内容：
{content}

请提取核心要点：""",
        "type": PromptType.TEMPLATE,
        "visibility": Visibility.PUBLIC,
        "enabled": False,
        "input_vars": [
            {"name": "content", "description": "文章内容", "required": True}
        ],
        "tags": ["文章分析", "学习辅助"],
    },
    {
        "name": "用大白话解释",
        "description": "当用户圈选文章中的特定词语、句子或段落时，或针对全文，用通俗易懂、简单明了的语言解释其含义，尤其适用于复杂概念、专业术语或晦涩难懂的表达。",
        "content": """请用简单易懂的语言解释以下选定文本。假设解释对象是对该领域不熟悉的人。可以使用类比、简化示例等方式来帮助理解。

目标是帮助用户"扫清理解障碍"。

需要解释的内容：
{content}

请用大白话解释：""",
        "type": PromptType.TEMPLATE,
        "visibility": Visibility.PUBLIC,
        "enabled": False,
        "input_vars": [
            {"name": "content", "description": "需要解释的内容", "required": True}
        ],
        "tags": ["内容理解", "学习辅助"],
    },
    {
        "name": "生成讨论问题",
        "description": "基于文章内容，生成若干具有启发性的开放式问题，帮助用户深入思考文章主题、检验理解程度，或作为后续讨论、研究的起点。",
        "content": """请根据以下文章内容，提出3-5个能激发深入思考的讨论问题。这些问题应鼓励批判性思维，探讨文章的潜在含义、局限性或不同观点。

问题可以涉及：
- 文章观点的延伸
- 对不同情境的应用
- 潜在的反驳观点
- 作者未明确说明的假设

目标是"促进深度思考和互动"。

文章内容：
{content}

请生成讨论问题：""",
        "type": PromptType.TEMPLATE,
        "visibility": Visibility.PUBLIC,
        "enabled": False,
        "input_vars": [
            {"name": "content", "description": "文章内容", "required": True}
        ],
        "tags": ["思维拓展", "学习辅助"],
    },
    # 启用的 prompts
    {
        "name": "生成摘要",
        "description": "为内容生成简洁的摘要",
        "content": "请为以下内容生成一个简洁明了的摘要，突出主要观点和关键信息：\n\n{content}",
        "type": PromptType.TEMPLATE,
        "visibility": Visibility.PUBLIC,
        "enabled": True,
        "input_vars": [
            {"name": "content", "description": "内容", "required": True}
        ],
        "tags": ["文章分析", "内容理解"],
    },
    {
        "name": "提取要点",
        "description": "提取内容中的关键要点",
        "content": "请从以下内容中提取关键要点，以清晰的列表形式呈现：\n\n{content}",
        "type": PromptType.TEMPLATE,
        "visibility": Visibility.PUBLIC,
        "enabled": True,
        "input_vars": [
            {"name": "content", "description": "内容", "required": True}
        ],
        "tags": ["文章分析", "学习辅助"],
    },
    {
        "name": "生成问题",
        "description": "基于内容生成思考问题",
        "content": "基于以下内容，生成一些深入思考的问题，帮助更好地理解和分析：\n\n{content}",
        "type": PromptType.TEMPLATE,
        "visibility": Visibility.PUBLIC,
        "enabled": True,
        "input_vars": [
            {"name": "content", "description": "内容", "required": True}
        ],
        "tags": ["思维拓展", "学习辅助"],
    },
    {
        "name": "深度洞察",
        "description": "提供深度的分析和洞察",
        "content": "请对以下内容进行深度分析，并且提供有价值的洞察和观点：\n\n{content}",
        "type": PromptType.TEMPLATE,
        "visibility": Visibility.PUBLIC,
        "enabled": True,
        "input_vars": [
            {"name": "content", "description": "内容", "required": True}
        ],
        "tags": ["文章分析", "思维拓展"],
    },
]


def get_default_tags() -> List[Dict[str, Any]]:
    """获取默认标签配置"""
    return DEFAULT_TAGS.copy()


def get_default_prompts() -> List[Dict[str, Any]]:
    """获取默认 prompts 配置"""
    return DEFAULT_PROMPTS.copy()


def get_enabled_prompts() -> List[Dict[str, Any]]:
    """获取默认启用的 prompts"""
    return [prompt for prompt in DEFAULT_PROMPTS if prompt.get("enabled", False)]


def get_disabled_prompts() -> List[Dict[str, Any]]:
    """获取默认禁用的 prompts"""
    return [prompt for prompt in DEFAULT_PROMPTS if not prompt.get("enabled", False)] 