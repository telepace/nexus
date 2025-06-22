#!/usr/bin/env python3
"""
测试数据库连接和favorites表
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

from app.api.deps import get_db
from sqlalchemy import text

def test_database():
    """测试数据库连接和表状态"""
    print("🔍 测试数据库连接...")
    
    try:
        # 使用get_db获取session
        for session in get_db():
            # 测试基本连接
            result = session.execute(text('SELECT 1'))
            print("✅ 数据库连接正常")
            
            # 检查favorites表是否存在
            result = session.execute(text("""
                SELECT COUNT(*) FROM information_schema.tables 
                WHERE table_name = 'favorites'
            """))
            count = result.scalar()
            
            if count > 0:
                print("✅ favorites表存在")
                
                # 检查favorites表结构
                result = session.execute(text("""
                    SELECT column_name, data_type 
                    FROM information_schema.columns 
                    WHERE table_name = 'favorites'
                    ORDER BY ordinal_position
                """))
                columns = result.fetchall()
                print("📋 favorites表结构:")
                for col in columns:
                    print(f"  - {col[0]}: {col[1]}")
                
                # 检查记录数
                result = session.execute(text('SELECT COUNT(*) FROM favorites'))
                favorites_count = result.scalar()
                print(f"📊 favorites表记录数: {favorites_count}")
                
            else:
                print("❌ favorites表不存在")
            
            # 检查contentitem表
            result = session.execute(text("""
                SELECT COUNT(*) FROM information_schema.tables 
                WHERE table_name = 'contentitem'
            """))
            count = result.scalar()
            
            if count > 0:
                print("✅ contentitem表存在")
                result = session.execute(text('SELECT COUNT(*) FROM contentitem'))
                content_count = result.scalar()
                print(f"📊 contentitem表记录数: {content_count}")
            else:
                print("❌ contentitem表不存在")
            
            break
            
    except Exception as e:
        print(f"❌ 数据库测试失败: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_database() 