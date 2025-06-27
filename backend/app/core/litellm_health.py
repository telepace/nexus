import asyncio
import logging
import os
from typing import Optional

# 先尝试使用 requests，如果不可用再使用 httpx
try:
    import requests
    USE_REQUESTS = True
except ImportError:
    import httpx
    USE_REQUESTS = False

from app.core.config import settings

logger = logging.getLogger(__name__)


class LiteLLMHealthChecker:
    """LiteLLM 服务健康检查器"""

    def __init__(self):
        self.proxy_url = settings.LITELLM_PROXY_URL
        self.master_key = settings.LITELLM_MASTER_KEY
        self.timeout = settings.LITELLM_HEALTH_CHECK_TIMEOUT
        self.test_model = settings.LITELLM_HEALTH_CHECK_TEST_MODEL
        
        # 修复 localhost DNS 解析问题
        if 'localhost' in self.proxy_url:
            self.proxy_url = self.proxy_url.replace('localhost', '127.0.0.1')
            logger.debug(f"已将 localhost 转换为 127.0.0.1: {self.proxy_url}")

    def _disable_proxy_env_vars(self):
        """临时禁用代理环境变量"""
        self._original_proxy_vars = {}
        proxy_vars = ['http_proxy', 'https_proxy', 'HTTP_PROXY', 'HTTPS_PROXY', 'all_proxy', 'ALL_PROXY']
        
        for var in proxy_vars:
            if var in os.environ:
                self._original_proxy_vars[var] = os.environ[var]
                del os.environ[var]
    
    def _restore_proxy_env_vars(self):
        """恢复代理环境变量"""
        if hasattr(self, '_original_proxy_vars'):
            for var, value in self._original_proxy_vars.items():
                os.environ[var] = value

    async def check_health(self) -> bool:
        """检查 LiteLLM 服务健康状态
        
        Returns:
            bool: True 如果服务正常，False 如果服务不可用
        """
        # 临时禁用代理
        self._disable_proxy_env_vars()
        
        # 尝试多种 URL 形式
        urls_to_try = [
            self.proxy_url,
            self.proxy_url.replace('localhost', '127.0.0.1'),
            self.proxy_url.replace('localhost', 'host.docker.internal'),
        ]
        
        # 去重
        urls_to_try = list(dict.fromkeys(urls_to_try))
        
        for url in urls_to_try:
            health_url = f"{url}/health"
            logger.info(f"尝试连接 LiteLLM 健康端点: {health_url}")
            
            try:
                # 添加认证头（如果配置了密钥）
                headers = {}
                if self.master_key:
                    headers["Authorization"] = f"Bearer {self.master_key}"
                    logger.debug("已添加认证头")
                else:
                    logger.warning("未配置 LITELLM_MASTER_KEY，可能会导致认证失败")
                
                logger.debug(f"发送请求到: {health_url}")
                logger.debug(f"请求头: {headers}")
                
                if USE_REQUESTS:
                    # 使用 requests 库，缩短超时时间进行快速测试
                    response = requests.get(
                        health_url, 
                        headers=headers, 
                        timeout=min(5.0, self.timeout),  # 最多5秒
                        proxies={}  # 禁用代理
                    )
                    status_code = response.status_code
                    response_text = response.text
                else:
                    # 使用 httpx 库
                    async with httpx.AsyncClient(
                        timeout=min(5.0, self.timeout),
                        verify=False,
                        limits=httpx.Limits(max_connections=10, max_keepalive_connections=5)
                    ) as client:
                        response = await client.get(health_url, headers=headers)
                        status_code = response.status_code
                        response_text = response.text
                
                logger.debug(f"响应状态码: {status_code}")
                logger.debug(f"响应内容: {response_text[:200]}...")
                
                if status_code == 200:
                    logger.info(f"✅ LiteLLM 健康端点检查通过 (使用 {url})")
                    return True
                elif status_code == 401:
                    logger.error(f"LiteLLM 认证失败 - 请检查 LITELLM_MASTER_KEY 配置: {response_text}")
                    return False  # 认证失败是配置问题，不用尝试其他URL
                elif status_code == 404:
                    logger.warning(f"LiteLLM 健康端点不存在 - 可能服务版本不兼容: {response_text}")
                    return False  # 404也是服务问题，不用尝试其他URL
                else:
                    logger.warning(f"LiteLLM 健康检查失败 - HTTP {status_code}: {response_text}")
                    continue  # 尝试下一个URL
                    
            except Exception as e:
                # 处理超时异常
                if USE_REQUESTS and isinstance(e, requests.Timeout):
                    logger.warning(f"连接 {health_url} 超时，尝试下一个地址...")
                elif not USE_REQUESTS and hasattr(httpx, 'TimeoutException') and isinstance(e, httpx.TimeoutException):
                    logger.warning(f"连接 {health_url} 超时，尝试下一个地址...")
                # 处理连接异常
                elif USE_REQUESTS and isinstance(e, requests.ConnectionError):
                    logger.warning(f"无法连接到 {health_url}，尝试下一个地址...")
                elif not USE_REQUESTS and hasattr(httpx, 'ConnectError') and isinstance(e, httpx.ConnectError):
                    logger.warning(f"无法连接到 {health_url}，尝试下一个地址...")
                else:
                    logger.warning(f"连接 {health_url} 时出现异常: {e}")
                
                continue  # 尝试下一个URL
        
        # 所有URL都失败了
        logger.error(f"无法连接到 LiteLLM 服务，已尝试所有可能的地址: {urls_to_try}")
        logger.error("可能的原因:")
        logger.error("1. LiteLLM 服务未启动")
        logger.error("2. 网络连接问题")
        logger.error("3. Docker 网络配置问题")
        logger.error("4. 防火墙或代理设置问题")
        logger.error("5. Python 网络环境问题")
        
        # 提供诊断建议
        logger.info("诊断建议:")
        logger.info("1. 运行 'curl -H 'Authorization: Bearer sk-telepace' http://localhost:4000/health' 验证服务可用性")
        logger.info("2. 运行 'docker compose logs litellm' 查看 LiteLLM 日志")
        logger.info("3. 运行 'python scripts/diagnose_litellm.py' 进行详细诊断")
        
        self._restore_proxy_env_vars()
        return False

    async def check_api_functionality(self) -> bool:
        """检查 LiteLLM API 功能是否正常
        
        Returns:
            bool: True 如果 API 功能正常，False 如果功能异常
        """
        # 临时禁用代理
        self._disable_proxy_env_vars()
        
        try:
            # 创建客户端，使用合适的配置
            async with httpx.AsyncClient(
                timeout=self.timeout,
                verify=False,  # 对于本地连接，禁用 SSL 验证
                limits=httpx.Limits(max_connections=10, max_keepalive_connections=5)
            ) as client:
                # 构建测试请求
                completion_url = f"{self.proxy_url}/v1/chat/completions"
                headers = {"Content-Type": "application/json"}
                
                if self.master_key:
                    headers["Authorization"] = f"Bearer {self.master_key}"
                
                # 使用配置的测试模型
                payload = {
                    "model": self.test_model,
                    "messages": [{"role": "user", "content": "Hello"}],
                    "max_tokens": 10,
                    "stream": False
                }
                
                logger.info(f"正在测试 LiteLLM API 功能: {completion_url}")
                logger.info(f"使用测试模型: {self.test_model}")
                logger.debug(f"请求负载: {payload}")
                
                response = await client.post(completion_url, json=payload, headers=headers)
                
                logger.debug(f"API 响应状态码: {response.status_code}")
                logger.debug(f"API 响应内容: {response.text[:200]}...")
                
                if response.status_code == 200:
                    logger.info("LiteLLM API 功能测试通过")
                    return True
                else:
                    logger.warning(f"LiteLLM API 功能测试失败 - HTTP {response.status_code}: {response.text}")
                    return False
                    
        except Exception as e:
            logger.error(f"LiteLLM API 功能测试出现异常: {e}")
            logger.error(f"异常类型: {type(e).__name__}")
            return False
        finally:
            # 恢复代理设置
            self._restore_proxy_env_vars()

    async def perform_startup_check(self, fail_on_error: bool = None) -> bool:
        """执行启动时的全面健康检查
        
        Args:
            fail_on_error: 如果为 True，在检查失败时抛出异常；如果为 False，仅记录警告；
                          如果为 None，使用配置中的默认值
            
        Returns:
            bool: True 如果所有检查通过，False 如果有检查失败
        """
        # 检查是否启用健康检查
        if not settings.LITELLM_HEALTH_CHECK_ENABLED:
            logger.info("LiteLLM 健康检查已禁用，跳过检查")
            return True
        
        # 使用配置中的默认值（如果未明确指定）
        if fail_on_error is None:
            fail_on_error = settings.LITELLM_HEALTH_CHECK_FAIL_ON_ERROR
        
        logger.info("开始 LiteLLM 启动健康检查...")
        logger.info(f"LiteLLM 代理地址: {self.proxy_url}")
        logger.info(f"使用的认证密钥: {'已配置' if self.master_key else '未配置'}")
        logger.info(f"检查超时时间: {self.timeout}s")
        logger.info(f"测试模型: {self.test_model}")
        
        # 基础健康检查
        health_ok = await self.check_health()
        if not health_ok:
            message = "LiteLLM 基础健康检查失败"
            if fail_on_error:
                raise RuntimeError(message)
            else:
                logger.warning(f"{message}，应用将继续启动，但 AI 功能可能不可用")
                return False
        
        # API 功能检查
        api_ok = await self.check_api_functionality()
        if not api_ok:
            message = "LiteLLM API 功能检查失败"
            if fail_on_error:
                raise RuntimeError(message)
            else:
                logger.warning(f"{message}，应用将继续启动，但 AI 功能可能不稳定")
                return False
        
        logger.info("✅ LiteLLM 启动健康检查全部通过")
        return True


# 创建全局健康检查器实例
litellm_health_checker = LiteLLMHealthChecker()


async def check_litellm_on_startup(fail_on_error: bool = None) -> bool:
    """应用启动时检查 LiteLLM 服务
    
    Args:
        fail_on_error: 是否在检查失败时抛出异常，默认使用配置中的值
        
    Returns:
        bool: 检查是否通过
    """
    return await litellm_health_checker.perform_startup_check(fail_on_error=fail_on_error) 