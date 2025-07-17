"""
Token管理器模块

提供智能的token限制管理功能：
- 基于任务类型获取token限制
- 动态调整token限制
- 内容长度估算
- Token使用统计
"""

import logging
from typing import Optional

from app.core.config import settings

logger = logging.getLogger(__name__)


class TokenManager:
    """Token管理器"""
    
    @staticmethod
    def get_token_limit(
        task_type: str = "default",
        content_length: Optional[int] = None,
        content_text: Optional[str] = None,
        base_tokens: Optional[int] = None,
        model_name: Optional[str] = None
    ) -> int:
        """
        获取智能的token限制
        
        Args:
            task_type: 任务类型 (chat, summary, analysis, etc.)
            content_length: 输入内容长度（字符数）
            content_text: 输入内容文本（自动计算长度）
            base_tokens: 基础token数（覆盖默认配置）
            model_name: 模型名称（用于模型特定的调整）
            
        Returns:
            int: 推荐的token限制
        """
        # 如果提供了content_text但没有content_length，自动计算
        if content_text and content_length is None:
            content_length = len(content_text)
            
        # 使用配置的方法获取token限制
        token_limit = settings.get_token_limit(
            task_type=task_type,
            content_length=content_length,
            base_tokens=base_tokens
        )
        
        # 可以根据模型类型进行进一步调整
        if model_name:
            token_limit = TokenManager._adjust_for_model(token_limit, model_name)
            
        logger.debug(f"Token限制计算: 任务={task_type}, 内容长度={content_length}, "
                    f"模型={model_name}, 最终限制={token_limit}")
        
        return token_limit
    
    @staticmethod
    def _adjust_for_model(token_limit: int, model_name: str) -> int:
        """
        根据模型类型调整token限制
        
        Args:
            token_limit: 基础token限制
            model_name: 模型名称
            
        Returns:
            int: 调整后的token限制
        """
        # 不同模型的token处理能力调整因子
        model_adjustments = {
            # GPT系列
            "gpt-4": 1.2,           # GPT-4可以处理更多token
            "gpt-4o": 1.3,          # GPT-4o更强
            "gpt-3.5": 0.9,         # GPT-3.5稍微保守一些
            
            # Claude系列
            "claude": 1.1,          # Claude处理能力强
            "claude-3": 1.2,
            
            # DeepSeek系列
            "deepseek": 1.0,        # 标准处理
            "deepseek-v3": 1.1,     # V3版本更强
            
            # Gemini系列
            "gemini": 1.0,
            "gemini-2": 1.1,
            "gemini-pro": 1.2,
            
            # 开源模型通常更保守
            "llama": 0.8,
            "mistral": 0.9,
        }
        
        # 查找匹配的模型调整因子
        adjustment_factor = 1.0
        for model_key, factor in model_adjustments.items():
            if model_key.lower() in model_name.lower():
                adjustment_factor = factor
                break
                
        adjusted_limit = int(token_limit * adjustment_factor)
        
        # 确保不超过绝对最大值
        max_tokens = settings.MAX_OUTPUT_TOKENS
        adjusted_limit = min(adjusted_limit, max_tokens)
        
        if adjustment_factor != 1.0:
            logger.debug(f"模型调整: {model_name} -> 因子={adjustment_factor}, "
                        f"原始={token_limit}, 调整后={adjusted_limit}")
        
        return adjusted_limit
    
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
        获取推荐的LLM调用设置
        
        Args:
            task_type: 任务类型
            content_text: 输入内容
            target_quality: 目标质量 ("fast", "balanced", "high")
            
        Returns:
            dict: 推荐的设置参数
        """
        content_length = len(content_text)
        
        # 获取token限制
        max_tokens = TokenManager.get_token_limit(
            task_type=task_type,
            content_length=content_length
        )
        
        # 根据质量目标调整参数
        quality_settings = {
            "fast": {
                "temperature": 0.3,
                "top_p": 0.8,
                "max_tokens_multiplier": 0.8,
            },
            "balanced": {
                "temperature": 0.7,
                "top_p": 0.9,
                "max_tokens_multiplier": 1.0,
            },
            "high": {
                "temperature": 0.9,
                "top_p": 0.95,
                "max_tokens_multiplier": 1.2,
            },
        }
        
        settings_config = quality_settings.get(target_quality, quality_settings["balanced"])
        
        # 应用multiplier
        adjusted_max_tokens = int(max_tokens * settings_config["max_tokens_multiplier"])
        adjusted_max_tokens = min(adjusted_max_tokens, settings.MAX_OUTPUT_TOKENS)
        
        recommended_settings = {
            "max_tokens": adjusted_max_tokens,
            "temperature": settings_config["temperature"],
            "top_p": settings_config["top_p"],
            "estimated_input_tokens": TokenManager.estimate_input_tokens(content_text),
            "estimated_total_tokens": TokenManager.estimate_total_tokens(content_text, adjusted_max_tokens),
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
        验证token请求是否合理
        
        Args:
            input_content: 输入内容
            requested_max_tokens: 请求的最大token数
            task_type: 任务类型
            
        Returns:
            tuple: (是否有效, 错误信息, 建议的token数)
        """
        # 估算输入token
        input_tokens = TokenManager.estimate_input_tokens(input_content)
        
        # 获取推荐的token限制
        recommended_tokens = TokenManager.get_token_limit(
            task_type=task_type,
            content_length=len(input_content)
        )
        
        # 检查是否超过绝对最大值
        if requested_max_tokens > settings.MAX_OUTPUT_TOKENS:
            return False, f"请求的token数({requested_max_tokens})超过系统最大限制({settings.MAX_OUTPUT_TOKENS})", recommended_tokens
        
        # 检查是否低于最小值
        if requested_max_tokens < settings.MIN_OUTPUT_TOKENS:
            return False, f"请求的token数({requested_max_tokens})低于系统最小限制({settings.MIN_OUTPUT_TOKENS})", recommended_tokens
        
        # 检查是否明显超过推荐值
        if requested_max_tokens > recommended_tokens * 2:
            return False, f"请求的token数({requested_max_tokens})明显超过推荐值({recommended_tokens})", recommended_tokens
        
        # 检查总token使用量是否合理
        total_tokens = input_tokens + requested_max_tokens
        if total_tokens > 200000:  # 超大请求警告
            return False, f"总token使用量({total_tokens})过大，可能导致性能问题", recommended_tokens
        
        return True, "", requested_max_tokens


# 创建全局实例
token_manager = TokenManager()

# 便捷函数
def get_token_limit(task_type: str = "default", **kwargs) -> int:
    """便捷函数：获取token限制"""
    return token_manager.get_token_limit(task_type=task_type, **kwargs)

def get_recommended_settings(task_type: str, content_text: str, **kwargs) -> dict:
    """便捷函数：获取推荐设置"""
    return token_manager.get_recommended_settings(task_type=task_type, content_text=content_text, **kwargs)

def validate_token_request(input_content: str, requested_max_tokens: int, **kwargs) -> tuple[bool, str, int]:
    """便捷函数：验证token请求"""
    return token_manager.validate_token_request(input_content=input_content, requested_max_tokens=requested_max_tokens, **kwargs) 