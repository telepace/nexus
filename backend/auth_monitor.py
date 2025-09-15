"""认证系统性能监控脚本"""
import asyncio

import psutil
from sqlmodel import Session, text

from app.core.db import engine
from app.core.redis_client import redis_client


def get_db_stats():
    """获取数据库连接和查询统计"""
    with Session(engine) as session:
        result = session.exec(text("""
            SELECT 
                COUNT(*) as total_connections,
                COUNT(*) FILTER (WHERE state = 'active') as active_connections
            FROM pg_stat_activity 
            WHERE datname = 'app'
        """)).first()
        return dict(result._mapping) if result else {}

async def get_redis_stats():
    """获取Redis统计信息"""
    try:
        info = await redis_client.info()
        return {
            'used_memory_human': info.get('used_memory_human', 'N/A'),
            'connected_clients': info.get('connected_clients', 0),
            'total_commands_processed': info.get('total_commands_processed', 0),
            'keyspace_hits': info.get('keyspace_hits', 0),
            'keyspace_misses': info.get('keyspace_misses', 0)
        }
    except Exception as e:
        return {'error': str(e)}

def monitor_auth_performance():
    """监控认证系统性能"""
    print("🔍 认证系统性能监控")
    print("=" * 50)

    # 系统资源
    cpu_percent = psutil.cpu_percent(interval=1)
    memory = psutil.virtual_memory()

    print("💻 系统资源:")
    print(f"   CPU使用率: {cpu_percent:.1f}%")
    print(f"   内存使用率: {memory.percent:.1f}%")

    # 数据库统计
    db_stats = get_db_stats()
    print("\n🗄️  数据库连接:")
    print(f"   总连接数: {db_stats.get('total_connections', 'N/A')}")
    print(f"   活跃连接数: {db_stats.get('active_connections', 'N/A')}")

    # Redis统计
    redis_stats = asyncio.run(get_redis_stats())
    print("\n🔴 Redis缓存:")
    if 'error' not in redis_stats:
        print(f"   内存使用: {redis_stats.get('used_memory_human', 'N/A')}")
        print(f"   客户端连接: {redis_stats.get('connected_clients', 'N/A')}")

        hits = redis_stats.get('keyspace_hits', 0)
        misses = redis_stats.get('keyspace_misses', 0)
        if hits + misses > 0:
            hit_rate = hits / (hits + misses) * 100
            print(f"   缓存命中率: {hit_rate:.1f}%")
    else:
        print(f"   连接错误: {redis_stats['error']}")

if __name__ == "__main__":
    monitor_auth_performance()
