"""
Token管理器模块

提供简化的token限制管理功能：
- 基于任务类型获取token限制
- 基本的token使用统计
"""

import logging

from app.core.config import settings

logger = logging.getLogger(__name__)


class TokenManager:
    """Token管理器（简化版）"""

    @staticmethod
    def get_token_limit(
        task_type: str = "default",
        content_length: int | None = None,
        content_text: str | None = None,
        base_tokens: int | None = None,
        model_name: str | None = None
    ) -> int:
        """
        获取token限制（简化版）

        Args:
            task_type: 任务类型 (chat, summary, analysis, etc.)
            content_length: 输入内容长度（已弃用，保留兼容性）
            content_text: 输入内容文本（已弃用，保留兼容性）
            base_tokens: 基础token数（覆盖默认配置）
            model_name: 模型名称（已弃用，保留兼容性）

        Returns:
            int: token限制
        """
        # 使用配置的方法获取token限制
        token_limit = settings.get_token_limit(
            task_type=task_type,
            base_tokens=base_tokens
        )

        logger.debug(f"Token限制: 任务={task_type}, 限制={token_limit}")

        return token_limit

    @staticmethod
    def estimate_input_tokens(content: str) -> int:
        """
        估算输入内容的token数量

        Args:
            content: 输入内容

        Returns:
            int: 估算的token数量
        """
        # 粗略估算：中文约1.5字符/token，英文约4字符/token
        # 这里使用保守估算：平均2.5字符/token
        estimated_tokens = len(content) // 2.5
        return int(estimated_tokens)

    @staticmethod
    def estimate_total_tokens(input_content: str, max_output_tokens: int) -> int:
        """
        估算总token使用量（输入+输出）

        Args:
            input_content: 输入内容
            max_output_tokens: 最大输出token数

        Returns:
            int: 估算的总token数量
        """
        input_tokens = TokenManager.estimate_input_tokens(input_content)
        total_tokens = input_tokens + max_output_tokens

        logger.debug(f"Token估算: 输入={input_tokens}, 输出={max_output_tokens}, "
                    f"总计={total_tokens}")

        return total_tokens

    @staticmethod
    def get_recommended_settings(
        task_type: str,
        content_text: str,
        target_quality: str = "balanced"  # "fast", "balanced", "high"
    ) -> dict:
        """
        获取推荐的LLM调用设置（简化版）

        Args:
            task_type: 任务类型
            content_text: 输入内容
            target_quality: 目标质量 ("fast", "balanced", "high")

        Returns:
            dict: 推荐的设置参数
        """
        content_length = len(content_text)

        # 获取token限制
        max_tokens = TokenManager.get_token_limit(task_type=task_type)

        # 根据质量目标调整参数
        quality_settings = {
            "fast": {
                "temperature": 0.3,
                "top_p": 0.8,
            },
            "balanced": {
                "temperature": 0.7,
                "top_p": 0.9,
            },
            "high": {
                "temperature": 0.9,
                "top_p": 0.95,
            },
        }

        settings_config = quality_settings.get(target_quality, quality_settings["balanced"])

        recommended_settings = {
            "max_tokens": max_tokens,
            "temperature": settings_config["temperature"],
            "top_p": settings_config["top_p"],
            "estimated_input_tokens": TokenManager.estimate_input_tokens(content_text),
            "estimated_total_tokens": TokenManager.estimate_total_tokens(content_text, max_tokens),
        }

        logger.info(f"推荐设置: 任务={task_type}, 质量={target_quality}, "
                   f"内容长度={content_length}, 设置={recommended_settings}")

        return recommended_settings

    @staticmethod
    def validate_token_request(
        input_content: str,
        requested_max_tokens: int,
        task_type: str = "default"
    ) -> tuple[bool, str, int]:
        """
        验证token请求是否合理（简化版）

        Args:
            input_content: 输入内容
            requested_max_tokens: 请求的最大token数
            task_type: 任务类型

        Returns:
            tuple: (是否有效, 错误信息, 建议的token数)
        """
        # 获取推荐的token限制
        recommended_tokens = TokenManager.get_token_limit(task_type=task_type)

        # 检查是否超过系统最大限制
        system_max = 100000  # 系统绝对最大值
        if requested_max_tokens > system_max:
            return False, f"请求的token数({requested_max_tokens})超过系统最大限制({system_max})", recommended_tokens

        # 检查是否低于最小值
        system_min = 100  # 系统最小值
        if requested_max_tokens < system_min:
            return False, f"请求的token数({requested_max_tokens})低于系统最小限制({system_min})", recommended_tokens

        # 基本验证通过
        return True, "", requested_max_tokens


# 保持向后兼容的函数
def get_token_limit(
    task_type: str = "default",
    content_length: int | None = None,
    content_text: str | None = None,
    base_tokens: int | None = None,
    model_name: str | None = None
) -> int:
    """向后兼容的token限制获取函数"""
    return TokenManager.get_token_limit(
        task_type=task_type,
        content_length=content_length,
        content_text=content_text,
        base_tokens=base_tokens,
        model_name=model_name
    )


def get_recommended_settings(
    task_type: str,
    content_text: str,
    target_quality: str = "balanced"
) -> dict:
    """向后兼容的推荐设置获取函数"""
    return TokenManager.get_recommended_settings(
        task_type=task_type,
        content_text=content_text,
        target_quality=target_quality
    )


def validate_token_request(
    input_content: str,
    requested_max_tokens: int,
    task_type: str = "default"
) -> tuple[bool, str, int]:
    """向后兼容的token请求验证函数"""
    return TokenManager.validate_token_request(
        input_content=input_content,
        requested_max_tokens=requested_max_tokens,
        task_type=task_type
    )
