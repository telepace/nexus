"""Health check endpoints."""

from fastapi import APIRouter

from app.utils.cache import get_cache_stats

router = APIRouter()


@router.get("/health")
async def health_check():
    """Basic health check endpoint."""
    return {"status": "ok"}


@router.get("/health/cache")
async def cache_health_check():
    """Cache health check endpoint."""
    stats = await get_cache_stats()
    return {
        "cache": stats,
        "status": "ok" if stats.get("redis_enabled") else "degraded",
    }
