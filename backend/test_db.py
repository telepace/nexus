from sqlalchemy import create_engine, text

from app.core.config import settings


def test_database_connection():
    """Test database connection"""
    # 将 MultiHostUrl 转换为字符串
    db_url = str(settings.SQLALCHEMY_DATABASE_URI)
    print(f"尝试连接数据库: {db_url}")

    try:
        # 创建引擎并尝试连接
        engine = create_engine(db_url)
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            print(f"数据库连接成功: {result.fetchone()}")
            assert result.fetchone() is None, "应该已经获取了结果"
    except Exception as e:
        print(f"数据库连接失败: {e}")
        raise AssertionError(f"数据库连接失败: {e}")

if __name__ == "__main__":
    test_database_connection()
