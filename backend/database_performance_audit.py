#!/usr/bin/env python3
"""
数据库性能审计脚本
分析当前查询模式，识别优化机会
"""

import asyncio
import time
from sqlalchemy import text
from sqlmodel import Session

from app.core.db import engine
from app.models import User, ContentItem, AIResult, Segment


class DatabasePerformanceAuditor:
    """数据库性能审计器"""
    
    def __init__(self):
        self.issues = []
        self.recommendations = []
    
    def audit_indexes(self, session: Session):
        """审计索引使用情况"""
        print("🔍 审计数据库索引...")
        
        # 检查缺失的重要索引
        index_checks = [
            {
                "table": "content_items",
                "index": "idx_content_vector_gin",
                "column": "content_vector",
                "type": "GIN",
                "description": "JSONB向量搜索优化"
            },
            {
                "table": "content_items", 
                "index": "idx_content_user_status",
                "column": "(user_id, processing_status)",
                "type": "BTREE",
                "description": "用户内容状态查询优化"
            },
            {
                "table": "content_items",
                "index": "idx_content_created_desc",
                "column": "created_at DESC",
                "type": "BTREE", 
                "description": "时间排序查询优化"
            },
            {
                "table": "ai_results",
                "index": "idx_ai_result_content",
                "column": "content_item_id",
                "type": "BTREE",
                "description": "AI结果关联查询优化"
            }
        ]
        
        for check in index_checks:
            exists = session.exec(text(f"""
                SELECT EXISTS (
                    SELECT 1 FROM pg_indexes 
                    WHERE tablename = '{check['table']}' 
                    AND indexname = '{check['index']}'
                )
            """)).first()
            
            if not exists:
                self.issues.append({
                    "type": "missing_index",
                    "severity": "high",
                    "table": check['table'],
                    "description": f"缺失索引: {check['index']} - {check['description']}"
                })
                
                self.recommendations.append({
                    "type": "create_index",
                    "priority": "high", 
                    "sql": f"CREATE INDEX CONCURRENTLY {check['index']} ON {check['table']} USING {check['type']} ({check['column']});",
                    "description": check['description']
                })

    def audit_query_patterns(self, session: Session):
        """审计查询模式"""
        print("🔍 审计查询模式...")
        
        # 检查N+1查询问题
        n_plus_one_queries = [
            {
                "description": "用户-内容-AI结果关联查询",
                "problem": "分别查询每个内容的AI结果",
                "solution": "使用JOIN或预加载"
            },
            {
                "description": "内容标签关联查询", 
                "problem": "循环查询每个内容的标签",
                "solution": "批量加载标签关系"
            }
        ]
        
        for query in n_plus_one_queries:
            self.issues.append({
                "type": "n_plus_one",
                "severity": "high",
                "description": query["description"],
                "problem": query["problem"],
                "solution": query["solution"]
            })

    def audit_table_stats(self, session: Session):
        """审计表统计信息"""
        print("🔍 审计表统计...")
        
        tables = ['users', 'content_items', 'ai_results', 'segments']
        
        for table in tables:
            try:
                stats = session.exec(text(f"""
                    SELECT 
                        schemaname,
                        tablename,
                        attname, 
                        n_distinct,
                        correlation
                    FROM pg_stats 
                    WHERE tablename = '{table}'
                    ORDER BY n_distinct DESC NULLS LAST
                    LIMIT 5
                """)).all()
                
                count = session.exec(text(f"SELECT COUNT(*) FROM {table}")).first()
                
                print(f"  📊 {table}: {count} 条记录")
                if count > 100000:
                    self.issues.append({
                        "type": "large_table",
                        "severity": "medium",
                        "table": table,
                        "count": count,
                        "description": f"大表 {table} 需要分区或归档策略"
                    })
                    
            except Exception as e:
                print(f"  ❌ 无法获取 {table} 统计信息: {e}")

    def audit_query_performance(self, session: Session):
        """审计查询性能"""
        print("🔍 审计查询性能...")
        
        # 测试关键查询的执行时间
        test_queries = [
            {
                "name": "用户内容列表查询",
                "sql": """
                    SELECT c.*, a.summary, a.key_points 
                    FROM content_items c 
                    LEFT JOIN ai_results a ON c.id = a.content_item_id 
                    WHERE c.user_id = (SELECT id FROM users LIMIT 1)
                    ORDER BY c.created_at DESC 
                    LIMIT 20
                """,
                "threshold_ms": 100
            },
            {
                "name": "向量搜索查询", 
                "sql": """
                    SELECT * FROM content_items 
                    WHERE content_vector IS NOT NULL 
                    LIMIT 10
                """,
                "threshold_ms": 200
            }
        ]
        
        for query in test_queries:
            try:
                start_time = time.time()
                session.exec(text(query["sql"])).all()
                duration_ms = (time.time() - start_time) * 1000
                
                print(f"  ⏱️  {query['name']}: {duration_ms:.2f}ms")
                
                if duration_ms > query["threshold_ms"]:
                    self.issues.append({
                        "type": "slow_query",
                        "severity": "medium",
                        "query": query["name"],
                        "duration_ms": duration_ms,
                        "threshold_ms": query["threshold_ms"],
                        "description": f"查询 '{query['name']}' 执行时间 {duration_ms:.2f}ms 超过阈值 {query['threshold_ms']}ms"
                    })
                    
            except Exception as e:
                print(f"  ❌ 查询执行失败 {query['name']}: {e}")

    def generate_optimization_sql(self):
        """生成优化SQL脚本"""
        sql_script = """
-- 数据库性能优化脚本
-- 执行前请在低峰期或维护窗口执行

-- 1. 创建关键索引 (CONCURRENTLY 避免锁表)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_content_vector_gin 
ON content_items USING GIN (content_vector jsonb_path_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_content_user_status 
ON content_items (user_id, processing_status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_content_created_desc 
ON content_items (created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_result_content 
ON ai_results (content_item_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_segments_content_item 
ON segments (content_item_id);

-- 2. 更新表统计信息
ANALYZE content_items;
ANALYZE ai_results; 
ANALYZE segments;
ANALYZE users;

-- 3. 优化查询配置
-- 增加统计信息采样
ALTER TABLE content_items ALTER COLUMN content_vector SET STATISTICS 1000;
ALTER TABLE content_items ALTER COLUMN processing_status SET STATISTICS 1000;

-- 4. 设置表级优化参数
-- 对于频繁更新的表，调整填充因子
ALTER TABLE content_items SET (fillfactor = 90);
ALTER TABLE ai_results SET (fillfactor = 95);

-- 5. 清理无效数据
-- 删除超过30天的失败处理记录
DELETE FROM content_items 
WHERE processing_status = 'failed' 
AND last_processed_at < NOW() - INTERVAL '30 days';

-- 6. 重建统计信息
VACUUM ANALYZE content_items;
VACUUM ANALYZE ai_results;
        """
        
        return sql_script.strip()

    def generate_report(self):
        """生成优化报告"""
        print("\n" + "="*60)
        print("🚨 数据库性能优化报告")
        print("="*60)
        
        if not self.issues:
            print("✅ 未发现严重性能问题")
            return
            
        # 按严重程度分组
        high_issues = [i for i in self.issues if i.get('severity') == 'high']
        medium_issues = [i for i in self.issues if i.get('severity') == 'medium']
        
        print(f"\n🔴 高优先级问题 ({len(high_issues)} 个):")
        for issue in high_issues:
            print(f"  • {issue['description']}")
            
        print(f"\n🟡 中等优先级问题 ({len(medium_issues)} 个):")
        for issue in medium_issues:
            print(f"  • {issue['description']}")
            
        print(f"\n📋 优化建议 ({len(self.recommendations)} 项):")
        for rec in self.recommendations:
            print(f"  • [{rec['priority'].upper()}] {rec['description']}")
            
        print("\n💡 立即执行的SQL优化:")
        print(self.generate_optimization_sql())

    def run_audit(self):
        """运行完整审计"""
        print("🔍 开始数据库性能审计...")
        
        with Session(engine) as session:
            self.audit_indexes(session)
            self.audit_query_patterns(session)
            self.audit_table_stats(session) 
            self.audit_query_performance(session)
            
        self.generate_report()


if __name__ == "__main__":
    auditor = DatabasePerformanceAuditor()
    auditor.run_audit()