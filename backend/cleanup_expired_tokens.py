"""清理过期token的脚本"""
import asyncio
from sqlmodel import Session, select
from datetime import datetime
from app.core.db import engine
from app.models import TokenBlacklist

def cleanup_expired_tokens():
    """清理过期的黑名单token"""
    with Session(engine) as session:
        # 查找过期token
        expired_tokens = session.exec(
            select(TokenBlacklist).where(
                TokenBlacklist.expires_at <= datetime.utcnow()
            )
        ).all()
        
        if expired_tokens:
            print(f"找到 {len(expired_tokens)} 个过期token，正在清理...")
            for token in expired_tokens:
                session.delete(token)
            session.commit()
            print(f"✅ 已清理 {len(expired_tokens)} 个过期token")
        else:
            print("✅ 没有发现过期token")

if __name__ == "__main__":
    cleanup_expired_tokens()
