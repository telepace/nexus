#!/usr/bin/env python3
"""
高级数据库测试脚本
提供数据插入、性能测试、数据模拟等功能
"""

import os
import sys
import random
import uuid
import json
from datetime import datetime, timedelta
import psycopg2
from psycopg2.extras import RealDictCursor
import logging
from typing import Dict, List, Any, Optional

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

def execute_query(query: str, params=None, fetch_result: bool = True) -> List[Dict[str, Any]]:
    """执行SQL查询"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(query, params)
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

# 模拟数据生成器
class DataGenerator:
    """数据生成器类"""
    
    @staticmethod
    def generate_user_data(count: int = 10) -> List[Dict]:
        """生成用户测试数据"""
        users = []
        for i in range(count):
            user = {
                'id': str(uuid.uuid4()),
                'email': f'user{i+1}@test.com',
                'full_name': f'测试用户{i+1}',
                'hashed_password': '$2b$12$example_hashed_password',
                'is_active': random.choice([True, False]),
                'is_superuser': False,
                'is_setup_complete': True
            }
            users.append(user)
        return users
    
    @staticmethod
    def generate_content_data(count: int = 20) -> List[Dict]:
        """生成内容项目测试数据"""
        content_types = ['url', 'pdf', 'text', 'image']
        titles = [
            '深度学习入门指南', 'Python编程实战', '数据结构与算法',
            '机器学习基础', 'Web开发技术', '云计算架构设计',
            '人工智能应用', '区块链技术', '物联网开发',
            '网络安全防护', '移动应用开发', '数据库设计'
        ]
        
        contents = []
        for i in range(count):
            created_time = datetime.now() - timedelta(days=random.randint(1, 30))
            content = {
                'id': str(uuid.uuid4()),
                'title': f"{random.choice(titles)} - 第{i+1}部分",
                'content_text': f"这是第{i+1}个测试内容的详细文本...",
                'type': random.choice(content_types),
                'source_uri': f'https://example.com/content/{i+1}',
                'processing_status': random.choice(['pending', 'processing', 'completed', 'failed']),
                'created_at': created_time,
                'updated_at': created_time + timedelta(minutes=random.randint(1, 60)),
                'user_id': None  # 将在插入时设置
            }
            contents.append(content)
        return contents
    
    @staticmethod
    def generate_conversation_data(count: int = 15) -> List[Dict]:
        """生成AI对话测试数据"""
        topics = [
            '关于Python编程的问题', '机器学习算法讨论', '项目架构设计',
            '数据库优化建议', 'API设计最佳实践', '性能优化策略',
            '安全防护措施', '代码重构建议', '技术选型讨论'
        ]
        
        ai_models = ['gpt-4', 'gpt-3.5-turbo', 'claude-3-haiku', 'claude-3-sonnet']
        conversation_types = ['auto_analysis', 'user_chat', 'prompt_analysis']
        
        conversations = []
        for i in range(count):
            created_time = datetime.now() - timedelta(days=random.randint(1, 15))
            conversation = {
                'id': str(uuid.uuid4()),
                'title': f"{random.choice(topics)} - 对话{i+1}",
                'ai_model_name': random.choice(ai_models),
                'conversation_type': random.choice(conversation_types),
                'messages': [],  # 空的消息列表
                'is_active': True,
                'created_at': created_time,
                'updated_at': created_time + timedelta(minutes=random.randint(1, 30)),
                'user_id': None,  # 将在插入时设置
                'content_item_id': None  # 可选，某些对话关联内容
            }
            conversations.append(conversation)
        return conversations

class DatabaseTester:
    """数据库测试器类"""
    
    def __init__(self):
        self.generator = DataGenerator()
    
    def insert_test_users(self, count: int = 10):
        """插入测试用户"""
        logger.info(f"🧑 开始插入 {count} 个测试用户...")
        
        users = self.generator.generate_user_data(count)
        
        insert_query = """
        INSERT INTO "user" (id, email, full_name, hashed_password, is_active, is_superuser, is_setup_complete)
        VALUES (%(id)s, %(email)s, %(full_name)s, %(hashed_password)s, %(is_active)s, %(is_superuser)s, %(is_setup_complete)s)
        ON CONFLICT (email) DO NOTHING
        """
        
        conn = get_db_connection()
        try:
            with conn.cursor() as cursor:
                for user in users:
                    cursor.execute(insert_query, user)
                conn.commit()
            logger.info(f"✅ 成功插入 {count} 个测试用户")
        except Exception as e:
            logger.error(f"❌ 插入用户失败: {e}")
            conn.rollback()
        finally:
            conn.close()
    
    def insert_test_content(self, count: int = 20):
        """插入测试内容"""
        logger.info(f"📄 开始插入 {count} 个测试内容...")
        
        # 获取一个用户ID作为创建者
        users = execute_query('SELECT id FROM "user" LIMIT 1')
        if not users:
            logger.error("❌ 没有找到用户，请先插入用户数据")
            return
        
        user_id = users[0]['id']
        contents = self.generator.generate_content_data(count)
        
        # 设置用户ID
        for content in contents:
            content['user_id'] = user_id
        
        insert_query = """
        INSERT INTO contentitem (id, title, content_text, type, source_uri, processing_status, created_at, updated_at, user_id)
        VALUES (%(id)s, %(title)s, %(content_text)s, %(type)s, %(source_uri)s, %(processing_status)s, %(created_at)s, %(updated_at)s, %(user_id)s)
        """
        
        conn = get_db_connection()
        try:
            with conn.cursor() as cursor:
                for content in contents:
                    cursor.execute(insert_query, content)
                conn.commit()
            logger.info(f"✅ 成功插入 {count} 个测试内容")
        except Exception as e:
            logger.error(f"❌ 插入内容失败: {e}")
            conn.rollback()
        finally:
            conn.close()
    
    def insert_test_conversations(self, count: int = 15):
        """插入测试对话"""
        logger.info(f"💬 开始插入 {count} 个测试对话...")
        
        # 获取用户和内容ID
        users = execute_query('SELECT id FROM "user" LIMIT 3')
        contents = execute_query('SELECT id FROM contentitem LIMIT 10')
        
        if not users:
            logger.error("❌ 没有找到用户，请先插入用户数据")
            return
        
        conversations = self.generator.generate_conversation_data(count)
        
        # 设置用户ID和随机关联内容
        for conversation in conversations:
            conversation['user_id'] = random.choice(users)['id']
            if contents and random.choice([True, False]):
                conversation['content_item_id'] = random.choice(contents)['id']
            # 将messages转换为JSON字符串
            conversation['messages'] = json.dumps(conversation['messages'])
        
        insert_query = """
        INSERT INTO aiconversation (id, title, ai_model_name, conversation_type, messages, is_active, created_at, updated_at, user_id, content_item_id)
        VALUES (%(id)s, %(title)s, %(ai_model_name)s, %(conversation_type)s, %(messages)s, %(is_active)s, %(created_at)s, %(updated_at)s, %(user_id)s, %(content_item_id)s)
        """
        
        conn = get_db_connection()
        try:
            with conn.cursor() as cursor:
                for conversation in conversations:
                    cursor.execute(insert_query, conversation)
                conn.commit()
            logger.info(f"✅ 成功插入 {count} 个测试对话")
        except Exception as e:
            logger.error(f"❌ 插入对话失败: {e}")
            conn.rollback()
        finally:
            conn.close()
    
    def performance_test(self):
        """性能测试"""
        logger.info("🚀 开始数据库性能测试...")
        
        tests = [
            {
                'name': '用户查询性能',
                'query': 'SELECT count(*) FROM "user" WHERE is_active = true',
                'iterations': 100
            },
            {
                'name': '内容搜索性能',
                'query': "SELECT id, title FROM contentitem WHERE title ILIKE '%测试%' LIMIT 10",
                'iterations': 50
            },
            {
                'name': '关联查询性能',
                'query': """
                SELECT u.email, c.title, ai.title as conversation_title
                FROM "user" u
                JOIN contentitem c ON u.id = c.user_id
                LEFT JOIN aiconversation ai ON c.id = ai.content_item_id
                LIMIT 20
                """,
                'iterations': 30
            }
        ]
        
        for test in tests:
            start_time = datetime.now()
            
            for _ in range(test['iterations']):
                execute_query(test['query'])
            
            end_time = datetime.now()
            duration = (end_time - start_time).total_seconds()
            avg_time = duration / test['iterations'] * 1000  # 毫秒
            
            logger.info(f"📊 {test['name']}: {test['iterations']} 次查询, 平均 {avg_time:.2f}ms")
    
    def generate_full_test_dataset(self):
        """生成完整的测试数据集"""
        logger.info("🎯 开始生成完整测试数据集...")
        
        self.insert_test_users(20)
        self.insert_test_content(50)
        self.insert_test_conversations(30)
        
        logger.info("✅ 完整测试数据集生成完成")
    
    def show_statistics(self):
        """显示数据库统计信息"""
        logger.info("📊 数据库统计信息:")
        
        stats_queries = [
            ('用户总数', 'SELECT count(*) as count FROM "user"'),
            ('活跃用户数', 'SELECT count(*) as count FROM "user" WHERE is_active = true'),
            ('内容总数', 'SELECT count(*) as count FROM contentitem'),
            ('已完成处理的内容', "SELECT count(*) as count FROM contentitem WHERE processing_status = 'completed'"),
            ('对话总数', 'SELECT count(*) as count FROM aiconversation'),
            ('提示词总数', 'SELECT count(*) as count FROM prompts'),
            ('标签总数', 'SELECT count(*) as count FROM tags'),
            ('项目总数', 'SELECT count(*) as count FROM projects')
        ]
        
        for name, query in stats_queries:
            try:
                result = execute_query(query)
                count = result[0]['count'] if result else 0
                logger.info(f"   {name}: {count}")
            except Exception as e:
                logger.error(f"   {name}: 查询失败 - {e}")

def main():
    """主函数"""
    if len(sys.argv) < 2:
        print("用法:")
        print("  python db-advanced-test.py users [count]        # 插入测试用户 (默认10个)")
        print("  python db-advanced-test.py content [count]      # 插入测试内容 (默认20个)")
        print("  python db-advanced-test.py conversations [count] # 插入测试对话 (默认15个)")
        print("  python db-advanced-test.py full-dataset         # 生成完整测试数据集")
        print("  python db-advanced-test.py performance          # 运行性能测试")
        print("  python db-advanced-test.py stats                # 显示统计信息")
        sys.exit(1)
    
    command = sys.argv[1]
    tester = DatabaseTester()
    
    if command == "users":
        count = int(sys.argv[2]) if len(sys.argv) > 2 else 10
        tester.insert_test_users(count)
    elif command == "content":
        count = int(sys.argv[2]) if len(sys.argv) > 2 else 20
        tester.insert_test_content(count)
    elif command == "conversations":
        count = int(sys.argv[2]) if len(sys.argv) > 2 else 15
        tester.insert_test_conversations(count)
    elif command == "full-dataset":
        tester.generate_full_test_dataset()
    elif command == "performance":
        tester.performance_test()
    elif command == "stats":
        tester.show_statistics()
    else:
        logger.error(f"❌ 未知命令: {command}")
        sys.exit(1)

if __name__ == "__main__":
    main() 