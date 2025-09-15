"""
智能缓存服务 - 多层缓存架构
实现内存+Redis双重缓存，支持智能失效和预热
"""

import asyncio
import hashlib
import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel
from sqlmodel import Session

from app.core.config import settings
from app.core.redis_client import redis_client
from app.models import AIResult, ContentItem

logger = logging.getLogger(__name__)


class CacheConfig(BaseModel):
    """缓存配置"""
    name: str
    ttl_seconds: int
    max_memory_items: int = 1000
    auto_refresh: bool = False
    compression: bool = True


class CacheStats(BaseModel):
    """缓存统计"""
    name: str
    hits: int = 0
    misses: int = 0
    hit_rate: float = 0.0
    total_requests: int = 0
    memory_items: int = 0
    redis_items: int = 0
    last_updated: datetime


class SmartCacheService:
    """智能多层缓存服务"""
    
    # 缓存配置
    CACHE_CONFIGS = {
        "content_list": CacheConfig(
            name="content_list",
            ttl_seconds=1800,  # 30分钟
            max_memory_items=500,
            auto_refresh=True
        ),
        "ai_results": CacheConfig(
            name="ai_results", 
            ttl_seconds=3600,  # 1小时
            max_memory_items=1000,
            compression=True
        ),
        "user_content": CacheConfig(
            name="user_content",
            ttl_seconds=900,   # 15分钟  
            max_memory_items=200,
            auto_refresh=True
        ),
        "content_segments": CacheConfig(
            name="content_segments",
            ttl_seconds=7200,  # 2小时
            max_memory_items=2000
        ),
        "search_results": CacheConfig(
            name="search_results",
            ttl_seconds=600,   # 10分钟
            max_memory_items=100
        )
    }
    
    def __init__(self):
        # 内存缓存 - LRU
        self._memory_cache: Dict[str, Dict[str, Any]] = {}
        self._cache_stats: Dict[str, CacheStats] = {}
        self._access_times: Dict[str, Dict[str, datetime]] = {}
        
        # 初始化统计
        for name in self.CACHE_CONFIGS:
            self._cache_stats[name] = CacheStats(
                name=name,
                last_updated=datetime.now(timezone.utc)
            )
            self._memory_cache[name] = {}
            self._access_times[name] = {}

    def _generate_key(self, cache_name: str, **kwargs) -> str:
        """生成缓存键"""
        key_data = json.dumps(kwargs, sort_keys=True, default=str)
        key_hash = hashlib.md5(key_data.encode()).hexdigest()
        return f"{cache_name}:{key_hash}"

    async def _compress_data(self, data: Any, compress: bool = True) -> bytes:
        """数据压缩"""
        if not compress:
            return json.dumps(data, default=str).encode()
        
        # 这里可以使用 gzip 或 zstd 压缩
        import gzip
        json_data = json.dumps(data, default=str)
        return gzip.compress(json_data.encode())

    async def _decompress_data(self, data: bytes, compressed: bool = True) -> Any:
        """数据解压"""
        if not compressed:
            return json.loads(data.decode())
        
        import gzip
        decompressed = gzip.decompress(data)
        return json.loads(decompressed.decode())

    def _evict_memory_cache(self, cache_name: str):
        """内存缓存LRU淘汰"""
        config = self.CACHE_CONFIGS[cache_name]
        cache = self._memory_cache[cache_name]
        access_times = self._access_times[cache_name]
        
        if len(cache) <= config.max_memory_items:
            return
        
        # 按访问时间排序，删除最旧的项
        sorted_items = sorted(
            access_times.items(),
            key=lambda x: x[1]
        )
        
        to_remove = len(cache) - config.max_memory_items + 10  # 多删除一些
        for key, _ in sorted_items[:to_remove]:
            cache.pop(key, None)
            access_times.pop(key, None)

    async def get(self, cache_name: str, **kwargs) -> Optional[Any]:
        """获取缓存数据 - 先内存后Redis"""
        cache_key = self._generate_key(cache_name, **kwargs)
        config = self.CACHE_CONFIGS[cache_name]
        stats = self._cache_stats[cache_name]
        
        stats.total_requests += 1
        
        # 1. 检查内存缓存
        memory_cache = self._memory_cache[cache_name]
        if cache_key in memory_cache:
            self._access_times[cache_name][cache_key] = datetime.now(timezone.utc)
            stats.hits += 1
            stats.hit_rate = stats.hits / stats.total_requests
            logger.debug(f"内存缓存命中: {cache_name}")
            return memory_cache[cache_key]["data"]
        
        # 2. 检查Redis缓存
        try:
            redis_key = f"smart_cache:{cache_key}"
            cached_data = await redis_client.get(redis_key)
            
            if cached_data:
                # 解压并加载到内存缓存
                data = await self._decompress_data(
                    cached_data, 
                    config.compression
                )
                
                # 回填内存缓存
                memory_cache[cache_key] = {
                    "data": data,
                    "cached_at": datetime.now(timezone.utc)
                }
                self._access_times[cache_name][cache_key] = datetime.now(timezone.utc)
                
                # 内存缓存淘汰
                self._evict_memory_cache(cache_name)
                
                stats.hits += 1
                stats.hit_rate = stats.hits / stats.total_requests
                logger.debug(f"Redis缓存命中: {cache_name}")
                return data
        
        except Exception as e:
            logger.warning(f"Redis缓存读取失败: {e}")
        
        # 缓存未命中
        stats.misses += 1
        stats.hit_rate = stats.hits / stats.total_requests
        return None

    async def set(self, cache_name: str, data: Any, **kwargs) -> bool:
        """设置缓存数据 - 双写内存和Redis"""
        cache_key = self._generate_key(cache_name, **kwargs)
        config = self.CACHE_CONFIGS[cache_name]
        
        try:
            # 1. 写入内存缓存
            memory_cache = self._memory_cache[cache_name]
            memory_cache[cache_key] = {
                "data": data,
                "cached_at": datetime.now(timezone.utc)
            }
            self._access_times[cache_name][cache_key] = datetime.now(timezone.utc)
            
            # 内存缓存淘汰
            self._evict_memory_cache(cache_name)
            
            # 2. 写入Redis缓存
            redis_key = f"smart_cache:{cache_key}"
            compressed_data = await self._compress_data(data, config.compression)
            
            await redis_client.setex(
                redis_key,
                config.ttl_seconds,
                compressed_data
            )
            
            logger.debug(f"缓存已设置: {cache_name}")
            return True
            
        except Exception as e:
            logger.error(f"设置缓存失败: {e}")
            return False

    async def invalidate(self, cache_name: str, **kwargs) -> bool:
        """失效特定缓存"""
        cache_key = self._generate_key(cache_name, **kwargs)
        
        try:
            # 清除内存缓存
            memory_cache = self._memory_cache[cache_name]
            memory_cache.pop(cache_key, None)
            self._access_times[cache_name].pop(cache_key, None)
            
            # 清除Redis缓存
            redis_key = f"smart_cache:{cache_key}"
            await redis_client.delete(redis_key)
            
            logger.debug(f"缓存已失效: {cache_name}")
            return True
            
        except Exception as e:
            logger.error(f"失效缓存失败: {e}")
            return False

    async def invalidate_pattern(self, cache_name: str, pattern: str = "*") -> int:
        """按模式批量失效缓存"""
        try:
            # 清除内存缓存中匹配的项
            memory_cache = self._memory_cache[cache_name]
            access_times = self._access_times[cache_name]
            
            keys_to_remove = []
            for key in memory_cache.keys():
                if pattern == "*" or pattern in key:
                    keys_to_remove.append(key)
            
            for key in keys_to_remove:
                memory_cache.pop(key, None)
                access_times.pop(key, None)
            
            # 清除Redis缓存
            redis_pattern = f"smart_cache:{cache_name}:*"
            if pattern != "*":
                redis_pattern = f"smart_cache:{cache_name}:*{pattern}*"
            
            redis_keys = await redis_client.keys(redis_pattern)
            if redis_keys:
                await redis_client.delete(*redis_keys)
                
            total_removed = len(keys_to_remove) + len(redis_keys)
            logger.info(f"批量失效缓存 {cache_name}: {total_removed} 个项目")
            return total_removed
            
        except Exception as e:
            logger.error(f"批量失效缓存失败: {e}")
            return 0

    async def warm_cache(self, cache_name: str, session: Session):
        """预热缓存 - 预加载常用数据"""
        logger.info(f"开始预热缓存: {cache_name}")
        
        try:
            if cache_name == "content_list":
                # 预热用户内容列表 (最近活跃用户)
                await self._warm_user_content_lists(session)
            elif cache_name == "ai_results":
                # 预热AI结果 (最近的分析结果)
                await self._warm_ai_results(session)
                
        except Exception as e:
            logger.error(f"缓存预热失败 {cache_name}: {e}")

    async def _warm_user_content_lists(self, session: Session):
        """预热用户内容列表"""
        # 这里可以获取最活跃用户并预热他们的内容列表
        # 为演示，这里模拟预热逻辑
        pass

    async def _warm_ai_results(self, session: Session):
        """预热AI结果缓存"""
        # 预热最近的AI分析结果
        pass

    def get_stats(self) -> Dict[str, CacheStats]:
        """获取缓存统计"""
        # 更新统计信息
        for name, stats in self._cache_stats.items():
            stats.memory_items = len(self._memory_cache[name])
            stats.last_updated = datetime.now(timezone.utc)
        
        return self._cache_stats

    async def cleanup_expired(self):
        """清理过期的内存缓存"""
        current_time = datetime.now(timezone.utc)
        
        for cache_name, config in self.CACHE_CONFIGS.items():
            memory_cache = self._memory_cache[cache_name]
            access_times = self._access_times[cache_name]
            expired_keys = []
            
            for key, cache_item in memory_cache.items():
                cached_at = cache_item["cached_at"]
                if (current_time - cached_at).total_seconds() > config.ttl_seconds:
                    expired_keys.append(key)
            
            for key in expired_keys:
                memory_cache.pop(key, None)
                access_times.pop(key, None)
            
            if expired_keys:
                logger.debug(f"清理过期缓存 {cache_name}: {len(expired_keys)} 个项目")


# 全局缓存服务实例
smart_cache = SmartCacheService()


# 装饰器：自动缓存
def cache_result(cache_name: str, **cache_kwargs):
    """缓存结果装饰器"""
    def decorator(func):
        async def wrapper(*args, **kwargs):
            # 生成缓存键参数
            cache_params = {**cache_kwargs, **kwargs}
            
            # 尝试从缓存获取
            cached_result = await smart_cache.get(cache_name, **cache_params)
            if cached_result is not None:
                return cached_result
            
            # 执行函数
            result = await func(*args, **kwargs)
            
            # 缓存结果
            if result is not None:
                await smart_cache.set(cache_name, result, **cache_params)
            
            return result
        return wrapper
    return decorator


# 使用示例装饰器
@cache_result("user_content", ttl=900)
async def get_user_content_cached(user_id: UUID, limit: int = 20):
    """缓存的用户内容获取"""
    # 实际的数据库查询逻辑
    pass