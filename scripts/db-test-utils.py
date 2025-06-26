#!/usr/bin/env python3
"""
数据库测试工具脚本
提供清空数据、初始化数据和验证数据的功能
"""

import os
import sys
import subprocess
import psycopg2
from psycopg2.extras import RealDictCursor
import logging
from typing import Dict, List, Any

# 设置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# 数据库连接配置
DB_CONFIG = {
    'host': os.getenv('POSTGRES_SERVER', '127.0.0.1'),
    'port': os.getenv('POSTGRES_PORT', '5432'),
    'database': os.getenv('POSTGRES_DB', 'app'),
    'user': os.getenv('POSTGRES_USER', 'postgres'),
    'password': os.getenv('POSTGRES_PASSWORD', 'telepace')
}

def get_db_connection():
    """获取数据库连接"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        return conn
    except Exception as e:
        logger.error(f"❌ 数据库连接失败: {e}")
        sys.exit(1)

def execute_query(query: str, fetch_result: bool = True) -> List[Dict[str, Any]]:
    """执行SQL查询"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(query)
            if fetch_result:
                return [dict(row) for row in cursor.fetchall()]
            else:
                conn.commit()
                return []
    except Exception as e:
        logger.error(f"❌ SQL执行失败: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

def clear_all_data():
    """清空所有数据表"""
    logger.info("🗑️  开始清空所有数据...")
    
    # 获取所有表名（排除系统表）
    tables_query = """
    SELECT tablename FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename != 'alembic_version'
    ORDER BY tablename;
    """
    
    tables = execute_query(tables_query)
    table_names = [table['tablename'] for table in tables]
    
    if not table_names:
        logger.warning("⚠️  没有找到需要清空的表")
        return
    
    # 禁用外键约束检查
    execute_query("SET session_replication_role = replica;", fetch_result=False)
    
    # 清空所有表
    for table_name in table_names:
        try:
            logger.info(f"🗑️  清空表: {table_name}")
            # 对于PostgreSQL关键字表名，需要添加双引号
            if table_name == 'user':
                execute_query(f'TRUNCATE TABLE "{table_name}" RESTART IDENTITY CASCADE;', fetch_result=False)
            else:
                execute_query(f"TRUNCATE TABLE {table_name} RESTART IDENTITY CASCADE;", fetch_result=False)
        except Exception as e:
            logger.warning(f"⚠️  清空表 {table_name} 失败: {e}")
    
    # 恢复外键约束检查
    execute_query("SET session_replication_role = DEFAULT;", fetch_result=False)
    
    logger.info("✅ 数据清空完成")

def run_backend_init_data():
    """运行 make backend-init-data 命令"""
    logger.info("🌱 运行数据初始化命令...")
    try:
        # 获取当前脚本的目录
        script_dir = os.path.dirname(os.path.abspath(__file__))
        # 计算项目根目录（假设脚本在scripts子目录中）
        project_root = os.path.dirname(script_dir)
        
        result = subprocess.run(
            ["make", "backend-init-data"],
            cwd=project_root,
            capture_output=True,
            text=True
        )
        
        if result.returncode == 0:
            logger.info("✅ 数据初始化成功")
            logger.info("📋 命令输出:")
            for line in result.stdout.split('\n'):
                if line.strip():
                    logger.info(f"   {line}")
        else:
            logger.error("❌ 数据初始化失败")
            logger.error(f"错误输出: {result.stderr}")
            sys.exit(1)
            
    except Exception as e:
        logger.error(f"❌ 执行初始化命令失败: {e}")
        sys.exit(1)

def verify_data():
    """验证数据初始化结果"""
    logger.info("🔍 开始验证数据...")
    
    verification_checks = [
        {
            'name': '用户数据',
            'query': 'SELECT count(*) as count FROM "user"',
            'expected_min': 1
        },
        {
            'name': '管理员用户',
            'query': "SELECT count(*) as count FROM \"user\" WHERE email = 'admin@telepace.cc' AND is_superuser = true",
            'expected_min': 1
        },
        {
            'name': '标签数据',
            'query': 'SELECT count(*) as count FROM tags',
            'expected_min': 4
        },
        {
            'name': '提示词数据',
            'query': 'SELECT count(*) as count FROM prompts',
            'expected_min': 4
        },
        {
            'name': '内容项目',
            'query': 'SELECT count(*) as count FROM contentitem',
            'expected_min': 0  # 可能为0，取决于测试数据
        },
        {
            'name': '项目数据',
            'query': 'SELECT count(*) as count FROM projects',
            'expected_min': 0  # 可能为0，取决于测试数据
        }
    ]
    
    all_passed = True
    
    for check in verification_checks:
        try:
            result = execute_query(check['query'])
            count = result[0]['count'] if result else 0
            
            if count >= check['expected_min']:
                logger.info(f"✅ {check['name']}: {count} 条记录")
            else:
                logger.error(f"❌ {check['name']}: 期望至少 {check['expected_min']} 条，实际 {count} 条")
                all_passed = False
                
        except Exception as e:
            logger.error(f"❌ 验证 {check['name']} 失败: {e}")
            all_passed = False
    
    return all_passed

def show_data_summary():
    """显示数据汇总信息"""
    logger.info("📊 数据汇总信息:")
    
    summary_queries = [
        {
            'name': '用户',
            'query': 'SELECT email, is_superuser, is_active FROM "user" ORDER BY email'
        },
        {
            'name': '标签',
            'query': 'SELECT name, description FROM tags ORDER BY name'
        },
        {
            'name': '提示词标题',
            'query': 'SELECT name, description FROM prompts ORDER BY name'
        },
        {
            'name': '内容项目',
            'query': 'SELECT title, type FROM contentitem ORDER BY created_at DESC LIMIT 5'
        }
    ]
    
    for query_info in summary_queries:
        try:
            results = execute_query(query_info['query'])
            logger.info(f"\n📋 {query_info['name']} ({len(results)} 条):")
            
            for i, row in enumerate(results[:10]):  # 最多显示10条
                if query_info['name'] == '用户':
                    logger.info(f"   {i+1}. {row['email']} (超级用户: {row['is_superuser']}, 激活: {row['is_active']})")
                elif query_info['name'] == '标签':
                    logger.info(f"   {i+1}. {row['name']} - {row['description']}")
                elif query_info['name'] == '提示词标题':
                    logger.info(f"   {i+1}. {row['name']} - {row.get('description', 'N/A')}")
                elif query_info['name'] == '内容项目':
                    logger.info(f"   {i+1}. {row['title']} ({row['type']})")
                    
        except Exception as e:
            logger.error(f"❌ 获取 {query_info['name']} 信息失败: {e}")

def main():
    """主函数"""
    if len(sys.argv) < 2:
        print("用法:")
        print("  python db-test-utils.py clear          # 清空所有数据")
        print("  python db-test-utils.py init           # 运行数据初始化")
        print("  python db-test-utils.py verify         # 验证数据")
        print("  python db-test-utils.py summary        # 显示数据汇总")
        print("  python db-test-utils.py reset          # 清空 + 初始化 + 验证")
        print("  python db-test-utils.py full-test      # 完整测试: 清空 + 初始化 + 验证 + 汇总")
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == "clear":
        clear_all_data()
    elif command == "init":
        run_backend_init_data()
    elif command == "verify":
        if verify_data():
            logger.info("✅ 所有验证检查通过")
        else:
            logger.error("❌ 部分验证检查失败")
            sys.exit(1)
    elif command == "summary":
        show_data_summary()
    elif command == "reset":
        clear_all_data()
        run_backend_init_data()
        if verify_data():
            logger.info("✅ 数据重置完成，所有验证通过")
        else:
            logger.error("❌ 数据重置后验证失败")
            sys.exit(1)
    elif command == "full-test":
        logger.info("🚀 开始完整测试流程...")
        clear_all_data()
        run_backend_init_data()
        if verify_data():
            logger.info("✅ 所有验证检查通过")
            show_data_summary()
            logger.info("🎉 完整测试流程成功完成！")
        else:
            logger.error("❌ 验证失败")
            sys.exit(1)
    else:
        logger.error(f"❌ 未知命令: {command}")
        sys.exit(1)

if __name__ == "__main__":
    main() 