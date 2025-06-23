"""Redis client configuration and connection management."""

import logging
from typing import Any, Optional

import redis.asyncio as redis
from redis.asyncio import ConnectionPool

from app.core.config import settings

logger = logging.getLogger(__name__)


class RedisClient:
    """异步 Redis 客户端管理器"""

    def __init__(self):
        self._pool: Optional[ConnectionPool] = None
        self._client: Optional[redis.Redis] = None

    async def connect(self) -> None:
        """建立 Redis 连接"""
        if not settings.REDIS_ENABLED:
            logger.info("Redis 已禁用，跳过连接")
            return

        try:
            self._pool = ConnectionPool.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True,
                max_connections=20,
                retry_on_timeout=True,
            )
            self._client = redis.Redis(connection_pool=self._pool)
            
            # 测试连接
            await self._client.ping()
            logger.info(f"Redis 连接成功: {settings.REDIS_URL}")
            
        except Exception as e:
            logger.warning(f"Redis 连接失败: {e}，将使用数据库直接查询")
            self._client = None
            self._pool = None

    async def disconnect(self) -> None:
        """关闭 Redis 连接"""
        if self._client:
            await self._client.aclose()
            self._client = None
        if self._pool:
            await self._pool.aclose()
            self._pool = None
        logger.info("Redis 连接已关闭")

    @property
    def is_connected(self) -> bool:
        """检查 Redis 是否连接"""
        return self._client is not None and settings.REDIS_ENABLED

    async def get(self, key: str) -> Optional[str]:
        """获取缓存值"""
        if not self.is_connected:
            return None
        
        try:
            return await self._client.get(key)
        except Exception as e:
            logger.warning(f"Redis GET 失败 {key}: {e}")
            return None

    async def set(
        self, 
        key: str, 
        value: str, 
        ttl: Optional[int] = None
    ) -> bool:
        """设置缓存值"""
        if not self.is_connected:
            return False
        
        try:
            ttl = ttl or settings.REDIS_TTL_SECONDS
            result = await self._client.set(key, value, ex=ttl)
            return bool(result)
        except Exception as e:
            logger.warning(f"Redis SET 失败 {key}: {e}")
            return False

    async def delete(self, key: str) -> bool:
        """删除缓存值"""
        if not self.is_connected:
            return False
        
        try:
            result = await self._client.delete(key)
            return bool(result)
        except Exception as e:
            logger.warning(f"Redis DELETE 失败 {key}: {e}")
            return False

    async def exists(self, key: str) -> bool:
        """检查键是否存在"""
        if not self.is_connected:
            return False
        
        try:
            result = await self._client.exists(key)
            return bool(result)
        except Exception as e:
            logger.warning(f"Redis EXISTS 失败 {key}: {e}")
            return False


# 全局 Redis 客户端实例
redis_client = RedisClient()


async def get_redis_client() -> RedisClient:
    """获取 Redis 客户端实例"""
    return redis_client 