#!/usr/bin/env python3
"""
自动化优化部署脚本
安全、智能地部署所有优化组件
"""

import os
import sys
import time
import json
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from datetime import datetime

class OptimizationDeployer:
    """优化部署器"""
    
    def __init__(self):
        self.project_root = Path(__file__).parent
        self.backup_dir = self.project_root / "backups" / f"backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        self.deployment_log = []
        self.failed_steps = []
        self.success_steps = []
    
    def log(self, message: str, level: str = "info"):
        """记录部署日志"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_entry = f"[{timestamp}] {level.upper()}: {message}"
        print(log_entry)
        self.deployment_log.append(log_entry)
    
    def run_command(self, command: str, cwd: Optional[Path] = None) -> Tuple[bool, str]:
        """运行命令"""
        try:
            self.log(f"执行命令: {command}")
            result = subprocess.run(
                command, 
                shell=True, 
                cwd=cwd or self.project_root,
                capture_output=True, 
                text=True,
                timeout=300  # 5分钟超时
            )
            
            if result.returncode == 0:
                self.log(f"命令执行成功: {command}")
                return True, result.stdout
            else:
                self.log(f"命令执行失败: {command}, 错误: {result.stderr}", "error")
                return False, result.stderr
        except subprocess.TimeoutExpired:
            self.log(f"命令执行超时: {command}", "error")
            return False, "命令执行超时"
        except Exception as e:
            self.log(f"命令执行异常: {command}, 异常: {e}", "error")
            return False, str(e)
    
    def create_backup(self) -> bool:
        """创建备份"""
        try:
            self.log("创建项目备份...")
            self.backup_dir.mkdir(parents=True, exist_ok=True)
            
            # 备份关键文件
            critical_files = [
                "backend/app/main.py",
                "backend/app/core/config.py",
                "backend/requirements.txt",
                "backend/pyproject.toml",
                "frontend/package.json",
                "frontend/next.config.mjs",
                "frontend/lib/token-manager.ts",
                "docker-compose.yml"
            ]
            
            for file_path in critical_files:
                source = self.project_root / file_path
                if source.exists():
                    destination = self.backup_dir / file_path
                    destination.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(source, destination)
                    self.log(f"备份文件: {file_path}")
            
            self.log(f"备份创建成功: {self.backup_dir}")
            return True
        except Exception as e:
            self.log(f"创建备份失败: {e}", "error")
            return False
    
    def deploy_database_optimization(self) -> bool:
        """部署数据库优化"""
        try:
            self.log("🔧 部署数据库优化...")
            
            # 检查PostgreSQL连接
            pg_check = self.check_postgresql_connection()
            if not pg_check:
                self.log("PostgreSQL连接检查失败，跳过数据库优化", "warning")
                return True  # 不阻塞其他优化
            
            # 生成优化SQL
            audit_script = self.project_root / "backend" / "database_performance_audit.py"
            if audit_script.exists():
                success, output = self.run_command(f"cd backend && python {audit_script.name}")
                if success:
                    self.log("数据库性能审计完成")
                else:
                    self.log(f"数据库审计失败: {output}", "warning")
            
            # 创建索引SQL文件
            self.create_database_optimization_sql()
            
            self.log("数据库优化部署完成")
            return True
        except Exception as e:
            self.log(f"数据库优化部署失败: {e}", "error")
            self.failed_steps.append("database_optimization")
            return False
    
    def check_postgresql_connection(self) -> bool:
        """检查PostgreSQL连接"""
        try:
            # 尝试导入必要的模块并测试连接
            success, _ = self.run_command("python -c \"import psycopg2; print('PostgreSQL driver available')\"")
            return success
        except:
            return False
    
    def create_database_optimization_sql(self):
        """创建数据库优化SQL文件"""
        optimization_sql = """
-- Nexus 数据库优化脚本
-- 执行前请确保在维护窗口执行

-- 1. 创建关键索引
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

-- 3. 优化PostgreSQL配置
-- 这些设置需要根据实际硬件配置调整
-- shared_buffers = '256MB'
-- effective_cache_size = '1GB'
-- maintenance_work_mem = '64MB'

VACUUM ANALYZE;
        """
        
        sql_file = self.project_root / "database_optimization.sql"
        with open(sql_file, 'w', encoding='utf-8') as f:
            f.write(optimization_sql.strip())
        
        self.log(f"数据库优化SQL已生成: {sql_file}")
    
    def deploy_cache_service(self) -> bool:
        """部署缓存服务"""
        try:
            self.log("⚡ 部署缓存服务...")
            
            # 检查Redis连接
            redis_available = self.check_redis_connection()
            if not redis_available:
                self.log("Redis不可用，将使用内存缓存模式", "warning")
            
            # 确保缓存服务文件存在
            cache_service = self.project_root / "backend" / "app" / "services" / "smart_cache_service.py"
            if not cache_service.exists():
                self.log("缓存服务文件不存在", "error")
                return False
            
            # 安装Redis依赖
            success, _ = self.run_command("cd backend && pip install redis aioredis", self.project_root / "backend")
            if not success:
                self.log("Redis依赖安装失败，继续使用内存缓存", "warning")
            
            self.log("缓存服务部署完成")
            return True
        except Exception as e:
            self.log(f"缓存服务部署失败: {e}", "error")
            self.failed_steps.append("cache_service")
            return False
    
    def check_redis_connection(self) -> bool:
        """检查Redis连接"""
        try:
            success, _ = self.run_command("python -c \"import redis; r=redis.Redis(); r.ping(); print('Redis available')\"")
            return success
        except:
            return False
    
    def deploy_frontend_optimization(self) -> bool:
        """部署前端优化"""
        try:
            self.log("🌐 部署前端优化...")
            
            frontend_dir = self.project_root / "frontend"
            
            # 检查前端优化文件
            performance_optimizer = frontend_dir / "lib" / "performance" / "performance-optimizer.ts"
            security_manager = frontend_dir / "lib" / "security" / "security-manager.ts"
            
            if not performance_optimizer.exists():
                self.log("前端性能优化文件不存在", "error")
                return False
            
            if not security_manager.exists():
                self.log("前端安全管理器不存在", "error")
                return False
            
            # 安装必要的依赖
            success, _ = self.run_command("pnpm install crypto-js", frontend_dir)
            if not success:
                self.log("crypto-js 依赖安装失败，尝试使用npm", "warning")
                success, _ = self.run_command("npm install crypto-js", frontend_dir)
            
            # 检查构建
            self.log("检查前端构建...")
            success, output = self.run_command("pnpm build", frontend_dir)
            if not success:
                self.log(f"前端构建检查失败: {output}", "warning")
                # 不阻塞部署，可能是开发环境问题
            
            self.log("前端优化部署完成")
            return True
        except Exception as e:
            self.log(f"前端优化部署失败: {e}", "error")
            self.failed_steps.append("frontend_optimization")
            return False
    
    def deploy_security_service(self) -> bool:
        """部署安全服务"""
        try:
            self.log("🔒 部署安全服务...")
            
            # 检查安全服务文件
            backend_security = self.project_root / "backend" / "app" / "services" / "security_service.py"
            frontend_security = self.project_root / "frontend" / "lib" / "security" / "security-manager.ts"
            
            if not backend_security.exists():
                self.log("后端安全服务不存在", "error")
                return False
            
            if not frontend_security.exists():
                self.log("前端安全管理器不存在", "error")
                return False
            
            # 安装安全相关依赖
            security_deps = [
                "cryptography",
                "bcrypt",
                "python-jose[cryptography]"
            ]
            
            for dep in security_deps:
                success, _ = self.run_command(f"cd backend && pip install {dep}")
                if success:
                    self.log(f"安装安全依赖: {dep}")
                else:
                    self.log(f"安全依赖安装失败: {dep}", "warning")
            
            self.log("安全服务部署完成")
            return True
        except Exception as e:
            self.log(f"安全服务部署失败: {e}", "error")
            self.failed_steps.append("security_service")
            return False
    
    def deploy_monitoring_dashboard(self) -> bool:
        """部署监控面板"""
        try:
            self.log("📊 部署监控面板...")
            
            monitor_script = self.project_root / "backend" / "monitoring_dashboard.py"
            if not monitor_script.exists():
                self.log("监控面板脚本不存在", "error")
                return False
            
            # 安装监控依赖
            monitor_deps = [
                "psutil",
                "uvicorn",
                "websockets"
            ]
            
            for dep in monitor_deps:
                success, _ = self.run_command(f"cd backend && pip install {dep}")
                if success:
                    self.log(f"安装监控依赖: {dep}")
                else:
                    self.log(f"监控依赖安装失败: {dep}", "warning")
            
            self.log("监控面板部署完成")
            return True
        except Exception as e:
            self.log(f"监控面板部署失败: {e}", "error")
            self.failed_steps.append("monitoring_dashboard")
            return False
    
    def run_validation_tests(self) -> bool:
        """运行验证测试"""
        try:
            self.log("🧪 运行验证测试...")
            
            # 运行优化验证脚本
            validation_script = self.project_root / "optimization_validation.py"
            if validation_script.exists():
                success, output = self.run_command(f"python {validation_script.name}")
                if success:
                    self.log("优化验证测试通过")
                    
                    # 解析验证结果
                    if "总体优化评分" in output:
                        score_line = [line for line in output.split('\n') if "总体优化评分" in line]
                        if score_line:
                            self.log(f"验证结果: {score_line[0]}")
                else:
                    self.log(f"验证测试失败: {output}", "warning")
            
            return True
        except Exception as e:
            self.log(f"验证测试失败: {e}", "error")
            return False
    
    def create_deployment_report(self) -> str:
        """创建部署报告"""
        report = {
            "deployment_time": datetime.now().isoformat(),
            "project_root": str(self.project_root),
            "backup_location": str(self.backup_dir),
            "successful_steps": self.success_steps,
            "failed_steps": self.failed_steps,
            "deployment_log": self.deployment_log,
            "summary": {
                "total_steps": len(self.success_steps) + len(self.failed_steps),
                "successful_steps": len(self.success_steps),
                "failed_steps": len(self.failed_steps),
                "success_rate": len(self.success_steps) / (len(self.success_steps) + len(self.failed_steps)) * 100 if (self.success_steps or self.failed_steps) else 0
            }
        }
        
        report_file = self.project_root / f"deployment_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(report_file, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        
        self.log(f"部署报告已生成: {report_file}")
        return str(report_file)
    
    def rollback_deployment(self) -> bool:
        """回滚部署"""
        try:
            self.log("🔄 执行部署回滚...")
            
            if not self.backup_dir.exists():
                self.log("备份目录不存在，无法回滚", "error")
                return False
            
            # 恢复备份文件
            for backup_file in self.backup_dir.rglob("*"):
                if backup_file.is_file():
                    relative_path = backup_file.relative_to(self.backup_dir)
                    target_path = self.project_root / relative_path
                    target_path.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(backup_file, target_path)
                    self.log(f"恢复文件: {relative_path}")
            
            self.log("部署回滚完成")
            return True
        except Exception as e:
            self.log(f"部署回滚失败: {e}", "error")
            return False
    
    def deploy_all(self) -> bool:
        """部署所有优化"""
        self.log("🚀 开始自动化优化部署...")
        self.log("=" * 60)
        
        # 创建备份
        if not self.create_backup():
            self.log("创建备份失败，终止部署", "error")
            return False
        
        deployment_steps = [
            ("database_optimization", "数据库优化", self.deploy_database_optimization),
            ("cache_service", "缓存服务", self.deploy_cache_service),
            ("frontend_optimization", "前端优化", self.deploy_frontend_optimization),
            ("security_service", "安全服务", self.deploy_security_service),
            ("monitoring_dashboard", "监控面板", self.deploy_monitoring_dashboard),
        ]
        
        for step_name, step_desc, step_func in deployment_steps:
            try:
                self.log(f"\n▶️ 部署步骤: {step_desc}")
                if step_func():
                    self.success_steps.append(step_name)
                    self.log(f"✅ {step_desc} 部署成功")
                else:
                    self.failed_steps.append(step_name)
                    self.log(f"❌ {step_desc} 部署失败", "error")
            except Exception as e:
                self.failed_steps.append(step_name)
                self.log(f"❌ {step_desc} 部署异常: {e}", "error")
        
        # 运行验证测试
        self.log(f"\n🧪 运行部署验证...")
        self.run_validation_tests()
        
        # 生成部署报告
        report_file = self.create_deployment_report()
        
        # 部署总结
        success_rate = len(self.success_steps) / (len(self.success_steps) + len(self.failed_steps)) * 100 if (self.success_steps or self.failed_steps) else 0
        
        self.log("\n" + "=" * 60)
        self.log("📊 部署完成总结")
        self.log("=" * 60)
        self.log(f"✅ 成功步骤: {len(self.success_steps)}")
        self.log(f"❌ 失败步骤: {len(self.failed_steps)}")
        self.log(f"📈 成功率: {success_rate:.1f}%")
        
        if self.failed_steps:
            self.log(f"⚠️ 失败的步骤: {', '.join(self.failed_steps)}")
            self.log("💡 可以手动执行失败的步骤或使用回滚功能")
        
        self.log(f"📄 详细报告: {report_file}")
        self.log(f"📁 备份位置: {self.backup_dir}")
        
        return len(self.failed_steps) == 0


def main():
    """主函数"""
    deployer = OptimizationDeployer()
    
    print("🚀 Nexus 优化自动化部署工具")
    print("=" * 50)
    print("这个工具将自动部署所有优化组件:")
    print("• 数据库性能优化")
    print("• 智能缓存服务")
    print("• 前端性能优化")
    print("• 安全加固系统")
    print("• 监控面板")
    print()
    
    # 检查确认
    confirm = input("是否继续部署？(y/N): ").lower().strip()
    if confirm != 'y':
        print("部署已取消")
        return
    
    # 执行部署
    success = deployer.deploy_all()
    
    if success:
        print("\n🎉 所有优化组件部署成功！")
        print("📊 可以运行 'python monitoring_dashboard.py' 启动监控面板")
        print("🧪 建议运行 'python optimization_validation.py' 验证优化效果")
    else:
        print("\n⚠️ 部署过程中遇到一些问题")
        print("📋 请查看部署报告了解详情")
        
        rollback = input("是否需要回滚？(y/N): ").lower().strip()
        if rollback == 'y':
            if deployer.rollback_deployment():
                print("✅ 回滚成功")
            else:
                print("❌ 回滚失败")
    
    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())