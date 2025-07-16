"""
Prompt template helpers for rendering user analysis instructions.
"""

import os

from jinja2 import Environment, FileSystemLoader


def render_user_analysis_prompt(analysis_instruction: str) -> str:
    """
    渲染用户分析prompt，将用户指令与JSONL输出规则结合

    Args:
        analysis_instruction: 用户的分析指令

    Returns:
        str: 渲染后的完整prompt
    """
    # 获取模板目录路径
    template_dir = os.path.join(
        os.path.dirname(os.path.dirname(__file__)), "prompt_templates"
    )

    # 创建Jinja2环境
    env = Environment(loader=FileSystemLoader(template_dir))

    # 加载用户分析模板
    template = env.get_template("user_analysis.j2")

    # 渲染模板
    rendered_prompt = template.render(analysis_instruction=analysis_instruction)

    return rendered_prompt


def render_template_prompt(template_name: str, **kwargs) -> str:
    """
    通用模板渲染函数

    Args:
        template_name: 模板文件名（包含.j2扩展名）
        **kwargs: 模板变量

    Returns:
        str: 渲染后的prompt
    """
    # 获取模板目录路径
    template_dir = os.path.join(
        os.path.dirname(os.path.dirname(__file__)), "prompt_templates"
    )

    # 创建Jinja2环境
    env = Environment(loader=FileSystemLoader(template_dir))

    # 加载模板
    template = env.get_template(template_name)

    # 渲染模板
    rendered_prompt = template.render(**kwargs)

    return rendered_prompt
