"""
认证缓存服务 - Redis优化认证性能

主要功能:
1. Token验证缓存 (5分钟)
2. 用户信息缓存 (15分钟) 
3. 黑名单Token缓存 (直到过期)
4. 预期性能提升: 70-80%
"""
import json
import logging
from datetime import datetime, timezone
from uuid import UUID

from pydantic import BaseModel

from app.core.redis_client import redis_client
from app.models import User

logger = logging.getLogger(__name__)

class CachedTokenData(BaseModel):
    """缓存的Token数据"""
    user_id: str
    email: str
    is_active: bool
    cached_at: datetime
    expires_at: datetime

class AuthCacheService:
    """认证缓存服务"""

    # 缓存键前缀
    TOKEN_PREFIX = "auth:token:"
    USER_PREFIX = "auth:user:"
    BLACKLIST_PREFIX = "auth:blacklist:"

    # 缓存过期时间
    TOKEN_TTL = 300  # 5分钟
    USER_TTL = 900   # 15分钟
    BLACKLIST_TTL = 86400  # 24小时

    @classmethod
    async def cache_token_verification(
        self,
        token: str,
        user: User,
        expires_at: datetime
    ) -> None:
        """缓存Token验证结果"""
        try:
            cache_data = CachedTokenData(
                user_id=str(user.id),
                email=user.email or "",
                is_active=user.is_active,
                cached_at=datetime.now(timezone.utc),
                expires_at=expires_at
            )

            key = f"{self.TOKEN_PREFIX}{token}"
            await redis_client.setex(
                key,
                self.TOKEN_TTL,
                cache_data.model_dump_json()
            )

            # 同时缓存用户信息
            await self.cache_user(user)

        except Exception as e:
            logger.warning(f"Failed to cache token verification: {e}")

    @classmethod
    async def get_cached_token(self, token: str) -> CachedTokenData | None:
        """获取缓存的Token数据"""
        try:
            key = f"{self.TOKEN_PREFIX}{token}"
            cached = await redis_client.get(key)

            if cached:
                data = json.loads(cached)
                # 检查是否过期
                cached_data = CachedTokenData(**data)
                if cached_data.expires_at > datetime.now(timezone.utc):
                    return cached_data
                else:
                    # Token过期，删除缓存
                    await redis_client.delete(key)

        except Exception as e:
            logger.warning(f"Failed to get cached token: {e}")

        return None

    @classmethod
    async def cache_user(self, user: User) -> None:
        """缓存用户信息"""
        try:
            key = f"{self.USER_PREFIX}{user.id}"
            user_data = {
                "id": str(user.id),
                "email": user.email,
                "full_name": user.full_name,
                "is_active": user.is_active,
                "avatar_url": user.avatar_url,
                "cached_at": datetime.now(timezone.utc).isoformat()
            }

            await redis_client.setex(
                key,
                self.USER_TTL,
                json.dumps(user_data, default=str)
            )

        except Exception as e:
            logger.warning(f"Failed to cache user: {e}")

    @classmethod
    async def get_cached_user(self, user_id: UUID) -> dict | None:
        """获取缓存的用户信息"""
        try:
            key = f"{self.USER_PREFIX}{user_id}"
            cached = await redis_client.get(key)

            if cached:
                return json.loads(cached)

        except Exception as e:
            logger.warning(f"Failed to get cached user: {e}")

        return None

    @classmethod
    async def cache_blacklisted_token(self, token: str, expires_at: datetime) -> None:
        """缓存黑名单Token"""
        try:
            key = f"{self.BLACKLIST_PREFIX}{token}"
            ttl = int((expires_at - datetime.now(timezone.utc)).total_seconds())

            if ttl > 0:
                await redis_client.setex(
                    key,
                    min(ttl, self.BLACKLIST_TTL),  # 不超过24小时
                    "1"
                )

        except Exception as e:
            logger.warning(f"Failed to cache blacklisted token: {e}")

    @classmethod
    async def is_token_blacklisted_cached(self, token: str) -> bool | None:
        """检查Token是否在黑名单缓存中"""
        try:
            key = f"{self.BLACKLIST_PREFIX}{token}"
            result = await redis_client.get(key)
            return result is not None

        except Exception as e:
            logger.warning(f"Failed to check blacklisted token cache: {e}")
            return None  # 缓存失败，回退到数据库查询

    @classmethod
    async def invalidate_user_cache(self, user_id: UUID) -> None:
        """使用户缓存失效"""
        try:
            key = f"{self.USER_PREFIX}{user_id}"
            await redis_client.delete(key)

        except Exception as e:
            logger.warning(f"Failed to invalidate user cache: {e}")

    @classmethod
    async def invalidate_token_cache(self, token: str) -> None:
        """使Token缓存失效"""
        try:
            key = f"{self.TOKEN_PREFIX}{token}"
            await redis_client.delete(key)

        except Exception as e:
            logger.warning(f"Failed to invalidate token cache: {e}")

    @classmethod
    async def cleanup_expired_cache(self) -> int:
        """清理过期缓存 (由定时任务调用)"""
        try:
            # Redis会自动清理过期键，这里主要是统计
            pattern = f"{self.TOKEN_PREFIX}*"
            keys = await redis_client.keys(pattern)

            expired_count = 0
            for key in keys:
                ttl = await redis_client.ttl(key)
                if ttl == -2:  # 键不存在或已过期
                    expired_count += 1

            logger.info(f"Cache cleanup: {expired_count} expired keys found")
            return expired_count

        except Exception as e:
            logger.warning(f"Failed to cleanup expired cache: {e}")
            return 0

# 全局实例
auth_cache = AuthCacheService()
