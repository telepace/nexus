"""Content caching utilities with Redis fallback to database."""

import logging

from sqlmodel import Session, select

from app.core.redis_client import redis_client
from app.models import ContentItem
from app.core.config import settings

logger = logging.getLogger(__name__)


def _get_content_cache_key(content_id: str) -> str:
    """生成内容缓存键"""
    return f"content:{content_id}:text"


async def get_article_text(content_id: str, db: Session) -> str | None:
    """
    获取文章正文内容，优先从 Redis 缓存获取，缓存未命中则从数据库获取并更新缓存

    Args:
        content_id: 内容ID
        db: 数据库会话

    Returns:
        文章正文内容，如果不存在则返回 None
    """
    cache_key = _get_content_cache_key(content_id)

    # 1. 尝试从 Redis 缓存获取
    if redis_client.is_connected:
        try:
            cached_text = await redis_client.get(cache_key)
            if cached_text:
                logger.debug(f"缓存命中: {content_id}")
                return cached_text
        except Exception as e:
            logger.warning(f"Redis 获取失败: {e}")

    # 2. 缓存未命中，从数据库获取
    logger.debug(f"缓存未命中，从数据库获取: {content_id}")

    try:
        statement = select(ContentItem).where(ContentItem.id == content_id)
        content = db.exec(statement).first()

        if not content:
            logger.warning(f"内容不存在: {content_id}")
            return None

        # 获取文章正文
        content_text = content.content_text
        if not content_text:
            logger.warning(f"内容正文为空: {content_id}")
            return None

        # 3. 更新缓存（异步，不阻塞响应）
        if redis_client.is_connected and content_text:
            try:
                await redis_client.set(cache_key, content_text)
                logger.debug(f"缓存已更新: {content_id}")
            except Exception as e:
                logger.warning(f"Redis 设置失败: {e}")

        return content_text

    except Exception as e:
        logger.error(f"数据库查询失败: {content_id}, {e}")
        return None


async def invalidate_article_cache(content_id: str) -> bool:
    """
    使文章缓存失效

    Args:
        content_id: 内容ID

    Returns:
        是否成功删除缓存
    """
    if not redis_client.is_connected:
        return False

    cache_key = _get_content_cache_key(content_id)

    try:
        result = await redis_client.delete(cache_key)
        if result:
            logger.debug(f"缓存已失效: {content_id}")
        return result
    except Exception as e:
        logger.warning(f"缓存失效失败: {content_id}, {e}")
        return False


async def warm_article_cache(content_id: str, content_text: str) -> bool:
    """
    预热文章缓存

    Args:
        content_id: 内容ID
        content_text: 文章正文

    Returns:
        是否成功设置缓存
    """
    if not redis_client.is_connected or not content_text:
        return False

    cache_key = _get_content_cache_key(content_id)

    try:
        result = await redis_client.set(cache_key, content_text)
        if result:
            logger.debug(f"缓存已预热: {content_id}")
        return result
    except Exception as e:
        logger.warning(f"缓存预热失败: {content_id}, {e}")
        return False


async def get_cache_stats() -> dict:
    """
    获取缓存统计信息

    Returns:
        缓存连接状态和统计信息
    """
    stats = {
        "redis_enabled": redis_client.is_connected,
        "redis_url": settings.redis_url,
    }

    if redis_client.is_connected:
        try:
            # 这里可以添加更多统计信息，如键数量等
            stats["status"] = "connected"
        except Exception as e:
            stats["status"] = f"error: {e}"
            stats["redis_enabled"] = False
    else:
        stats["status"] = "disconnected"

    return stats
