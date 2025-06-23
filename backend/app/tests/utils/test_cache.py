"""Tests for cache utilities."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from sqlmodel import Session

from app.utils.cache import (
    get_article_text,
    invalidate_article_cache,
    warm_article_cache,
    get_cache_stats,
    _get_content_cache_key,
)
from app.models import ContentItem


class TestCacheUtils:
    """Cache utilities test cases."""

    def test_get_content_cache_key(self):
        """Test cache key generation."""
        content_id = "test-content-123"
        expected_key = "content:test-content-123:text"
        assert _get_content_cache_key(content_id) == expected_key

    @pytest.mark.asyncio
    async def test_get_article_text_cache_hit(self):
        """Test get_article_text with cache hit."""
        content_id = "test-content-123"
        cached_content = "This is cached content"
        
        # Mock Redis client
        with patch("app.utils.cache.redis_client") as mock_redis:
            mock_redis.is_connected = True
            mock_redis.get = AsyncMock(return_value=cached_content)
            
            # Mock database session (should not be used)
            mock_db = MagicMock(spec=Session)
            
            result = await get_article_text(content_id, mock_db)
            
            assert result == cached_content
            mock_redis.get.assert_called_once_with("content:test-content-123:text")
            # Database should not be accessed
            mock_db.exec.assert_not_called()

    @pytest.mark.asyncio
    async def test_get_article_text_cache_miss_db_hit(self):
        """Test get_article_text with cache miss but database hit."""
        content_id = "test-content-123"
        db_content = "This is database content"
        
        # Mock Redis client (cache miss)
        with patch("app.utils.cache.redis_client") as mock_redis:
            mock_redis.is_connected = True
            mock_redis.get = AsyncMock(return_value=None)
            mock_redis.set = AsyncMock(return_value=True)
            
            # Mock database session
            mock_db = MagicMock(spec=Session)
            mock_content = MagicMock(spec=ContentItem)
            mock_content.content_text = db_content
            mock_result = MagicMock()
            mock_result.first.return_value = mock_content
            mock_db.exec.return_value = mock_result
            
            result = await get_article_text(content_id, mock_db)
            
            assert result == db_content
            mock_redis.get.assert_called_once()
            mock_redis.set.assert_awaited_once_with(
                "content:test-content-123:text", db_content
            )
            mock_db.exec.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_article_text_not_found(self):
        """Test get_article_text when content not found."""
        content_id = "nonexistent-content"
        
        # Mock Redis client (cache miss)
        with patch("app.utils.cache.redis_client") as mock_redis:
            mock_redis.is_connected = True
            mock_redis.get = AsyncMock(return_value=None)
            
            # Mock database session (content not found)
            mock_db = MagicMock(spec=Session)
            mock_result = MagicMock()
            mock_result.first.return_value = None
            mock_db.exec.return_value = mock_result
            
            result = await get_article_text(content_id, mock_db)
            
            assert result is None
            mock_redis.set.assert_not_called()

    @pytest.mark.asyncio
    async def test_get_article_text_redis_disabled(self):
        """Test get_article_text when Redis is disabled."""
        content_id = "test-content-123"
        db_content = "This is database content"
        
        # Mock Redis client (disabled)
        with patch("app.utils.cache.redis_client") as mock_redis:
            mock_redis.is_connected = False
            
            # Mock database session
            mock_db = MagicMock(spec=Session)
            mock_content = MagicMock(spec=ContentItem)
            mock_content.content_text = db_content
            mock_result = MagicMock()
            mock_result.first.return_value = mock_content
            mock_db.exec.return_value = mock_result
            
            result = await get_article_text(content_id, mock_db)
            
            assert result == db_content
            mock_redis.get.assert_not_called()
            mock_redis.set.assert_not_called()

    @pytest.mark.asyncio
    async def test_invalidate_article_cache_success(self):
        """Test successful cache invalidation."""
        content_id = "test-content-123"
        
        with patch("app.utils.cache.redis_client") as mock_redis:
            mock_redis.is_connected = True
            mock_redis.delete = AsyncMock(return_value=True)
            
            result = await invalidate_article_cache(content_id)
            
            assert result is True
            mock_redis.delete.assert_awaited_once_with("content:test-content-123:text")

    @pytest.mark.asyncio
    async def test_invalidate_article_cache_redis_disabled(self):
        """Test cache invalidation when Redis is disabled."""
        content_id = "test-content-123"
        
        with patch("app.utils.cache.redis_client") as mock_redis:
            mock_redis.is_connected = False
            
            result = await invalidate_article_cache(content_id)
            
            assert result is False
            mock_redis.delete.assert_not_called()

    @pytest.mark.asyncio
    async def test_warm_article_cache_success(self):
        """Test successful cache warming."""
        content_id = "test-content-123"
        content_text = "This is the content to cache"
        
        with patch("app.utils.cache.redis_client") as mock_redis:
            mock_redis.is_connected = True
            mock_redis.set = AsyncMock(return_value=True)
            
            result = await warm_article_cache(content_id, content_text)
            
            assert result is True
            mock_redis.set.assert_awaited_once_with(
                "content:test-content-123:text", content_text
            )

    @pytest.mark.asyncio
    async def test_warm_article_cache_empty_content(self):
        """Test cache warming with empty content."""
        content_id = "test-content-123"
        content_text = ""
        
        with patch("app.utils.cache.redis_client") as mock_redis:
            mock_redis.is_connected = True
            
            result = await warm_article_cache(content_id, content_text)
            
            assert result is False
            mock_redis.set.assert_not_called()

    @pytest.mark.asyncio
    async def test_get_cache_stats_connected(self):
        """Test cache stats when Redis is connected."""
        with patch("app.utils.cache.redis_client") as mock_redis:
            mock_redis.is_connected = True
            
            stats = await get_cache_stats()
            
            assert stats["redis_enabled"] is True
            assert stats["status"] == "connected"

    @pytest.mark.asyncio
    async def test_get_cache_stats_disconnected(self):
        """Test cache stats when Redis is disconnected."""
        with patch("app.utils.cache.redis_client") as mock_redis:
            mock_redis.is_connected = False
            
            stats = await get_cache_stats()
            
            assert stats["redis_enabled"] is False
            assert stats["status"] == "disconnected" 