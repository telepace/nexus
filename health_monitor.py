#!/usr/bin/env python3
"""
项目健康监控工具
全面监控 Nexus 项目的健康状态、性能指标和优化效果
"""

import asyncio
import aiohttp
import json
import os
import sys
import time
import psutil
import subprocess
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@dataclass
class HealthStatus:
    """健康状态"""
    component: str
    status: str  # healthy, warning, critical, unknown
    message: str
    details: Optional[Dict[str, Any]] = None
    timestamp: Optional[datetime] = None


class ProjectHealthMonitor:
    """项目健康监控器"""
    
    def __init__(self, project_root: Optional[str] = None):
        self.project_root = Path(project_root) if project_root else Path(__file__).parent
        self.health_status: List[HealthStatus] = []
        self.api_base_url = "http://localhost:8000"
        self.frontend_url = "http://localhost:3004"  # 从前端日志看到的端口
        
    def log_status(self, component: str, status: str, message: str, details: Optional[Dict] = None):
        """记录健康状态"""
        health_status = HealthStatus(
            component=component,
            status=status,
            message=message,
            details=details or {},
            timestamp=datetime.now()
        )
        self.health_status.append(health_status)
        
        # 根据状态使用不同的日志级别
        emoji = {"healthy": "✅", "warning": "⚠️", "critical": "❌", "unknown": "❓"}
        log_message = f"{emoji.get(status, '❓')} {component}: {message}"
        
        if status == "critical":
            logger.error(log_message)
        elif status == "warning":
            logger.warning(log_message)
        else:
            logger.info(log_message)
    
    def check_system_resources(self) -> Dict[str, Any]:
        """检查系统资源"""
        try:
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            # CPU检查
            if cpu_percent > 90:
                self.log_status("system_cpu", "critical", f"CPU使用率过高: {cpu_percent:.1f}%")
            elif cpu_percent > 70:
                self.log_status("system_cpu", "warning", f"CPU使用率较高: {cpu_percent:.1f}%")
            else:
                self.log_status("system_cpu", "healthy", f"CPU使用率正常: {cpu_percent:.1f}%")
            
            # 内存检查
            if memory.percent > 95:
                self.log_status("system_memory", "critical", f"内存使用率危险: {memory.percent:.1f}%")
            elif memory.percent > 80:
                self.log_status("system_memory", "warning", f"内存使用率较高: {memory.percent:.1f}%")
            else:
                self.log_status("system_memory", "healthy", f"内存使用率正常: {memory.percent:.1f}%")
            
            # 磁盘检查
            if disk.percent > 95:
                self.log_status("system_disk", "critical", f"磁盘空间不足: {disk.percent:.1f}%")
            elif disk.percent > 80:
                self.log_status("system_disk", "warning", f"磁盘空间较少: {disk.percent:.1f}%")
            else:
                self.log_status("system_disk", "healthy", f"磁盘空间充足: {disk.percent:.1f}%")
            
            return {
                "cpu_percent": cpu_percent,
                "memory_percent": memory.percent,
                "memory_available_gb": memory.available / 1024 / 1024 / 1024,
                "disk_percent": disk.percent,
                "disk_free_gb": disk.free / 1024 / 1024 / 1024
            }
            
        except Exception as e:
            self.log_status("system_resources", "critical", f"系统资源检查失败: {e}")
            return {}
    
    def check_project_structure(self) -> Dict[str, Any]:
        """检查项目结构"""
        critical_files = [
            "backend/app/main.py",
            "backend/pyproject.toml",
            "frontend/package.json",
            "frontend/next.config.mjs",
            "docker-compose.yml"
        ]
        
        optimization_files = [
            "backend/database_performance_audit.py",
            "backend/app/services/smart_cache_service.py",
            "backend/app/services/security_service.py",
            "frontend/lib/performance/performance-optimizer.ts",
            "frontend/lib/security/security-manager.ts",
            "OPTIMIZATION_EXECUTION_GUIDE.md"
        ]
        
        results = {
            "critical_files": {},
            "optimization_files": {},
            "critical_missing": [],
            "optimization_missing": []
        }
        
        # 检查关键文件
        for file_path in critical_files:
            full_path = self.project_root / file_path
            exists = full_path.exists()
            results["critical_files"][file_path] = exists
            
            if not exists:
                results["critical_missing"].append(file_path)
                self.log_status("project_structure", "critical", f"关键文件缺失: {file_path}")
        
        # 检查优化文件
        for file_path in optimization_files:
            full_path = self.project_root / file_path
            exists = full_path.exists()
            results["optimization_files"][file_path] = exists
            
            if not exists:
                results["optimization_missing"].append(file_path)
                self.log_status("optimization_files", "warning", f"优化文件缺失: {file_path}")
        
        # 总体评估
        if not results["critical_missing"]:
            if not results["optimization_missing"]:
                self.log_status("project_structure", "healthy", "项目结构完整，所有优化组件就位")
            else:
                self.log_status("project_structure", "warning", f"基础结构完整，缺少 {len(results['optimization_missing'])} 个优化组件")
        else:
            self.log_status("project_structure", "critical", f"项目结构不完整，缺少 {len(results['critical_missing'])} 个关键文件")
        
        return results
    
    async def check_api_health(self) -> Dict[str, Any]:
        """检查API健康状态"""
        try:
            timeout = aiohttp.ClientTimeout(total=10)
            async with aiohttp.ClientSession(timeout=timeout) as session:
                # 健康检查端点
                start_time = time.perf_counter()
                async with session.get(f"{self.api_base_url}/api/v1/utils/health-check/") as response:
                    response_time = (time.perf_counter() - start_time) * 1000
                    
                    if response.status == 200:
                        data = await response.json()
                        self.log_status("api_health", "healthy", f"API服务正常 (响应时间: {response_time:.1f}ms)")
                        
                        return {
                            "status": "healthy",
                            "response_time_ms": response_time,
                            "details": data
                        }
                    else:
                        self.log_status("api_health", "critical", f"API健康检查失败: HTTP {response.status}")
                        return {"status": "critical", "error": f"HTTP {response.status}"}
        
        except aiohttp.ClientConnectorError:
            self.log_status("api_health", "critical", "API服务连接失败，可能服务未启动")
            return {"status": "critical", "error": "连接失败"}
        except asyncio.TimeoutError:
            self.log_status("api_health", "critical", "API健康检查超时")
            return {"status": "critical", "error": "请求超时"}
        except Exception as e:
            self.log_status("api_health", "critical", f"API健康检查异常: {e}")
            return {"status": "critical", "error": str(e)}
    
    async def check_frontend_health(self) -> Dict[str, Any]:
        """检查前端健康状态"""
        try:
            timeout = aiohttp.ClientTimeout(total=10)
            async with aiohttp.ClientSession(timeout=timeout) as session:
                start_time = time.perf_counter()
                async with session.get(self.frontend_url) as response:
                    response_time = (time.perf_counter() - start_time) * 1000
                    
                    if response.status == 200:
                        content = await response.text()
                        if "Next.js" in content or "React" in content:
                            self.log_status("frontend_health", "healthy", f"前端服务正常 (响应时间: {response_time:.1f}ms)")
                        else:
                            self.log_status("frontend_health", "warning", f"前端服务响应异常 (响应时间: {response_time:.1f}ms)")
                        
                        return {
                            "status": "healthy" if response.status == 200 else "warning",
                            "response_time_ms": response_time,
                            "content_length": len(content)
                        }
                    else:
                        self.log_status("frontend_health", "critical", f"前端服务错误: HTTP {response.status}")
                        return {"status": "critical", "error": f"HTTP {response.status}"}
        
        except aiohttp.ClientConnectorError:
            self.log_status("frontend_health", "critical", "前端服务连接失败，可能服务未启动")
            return {"status": "critical", "error": "连接失败"}
        except asyncio.TimeoutError:
            self.log_status("frontend_health", "critical", "前端健康检查超时")
            return {"status": "critical", "error": "请求超时"}
        except Exception as e:
            self.log_status("frontend_health", "critical", f"前端健康检查异常: {e}")
            return {"status": "critical", "error": str(e)}
    
    def check_database_connection(self) -> Dict[str, Any]:
        """检查数据库连接"""
        try:
            # 尝试导入和测试数据库连接
            result = subprocess.run([
                sys.executable, "-c",
                "import psycopg2; conn = psycopg2.connect('host=localhost port=5432 dbname=app user=postgres password=telepace'); conn.close(); print('Database OK')"
            ], capture_output=True, text=True, timeout=10)
            
            if result.returncode == 0:
                self.log_status("database_connection", "healthy", "数据库连接正常")
                return {"status": "healthy"}
            else:
                error_msg = result.stderr.strip() or "数据库连接失败"
                self.log_status("database_connection", "critical", f"数据库连接失败: {error_msg}")
                return {"status": "critical", "error": error_msg}
        
        except subprocess.TimeoutExpired:
            self.log_status("database_connection", "critical", "数据库连接超时")
            return {"status": "critical", "error": "连接超时"}
        except Exception as e:
            self.log_status("database_connection", "warning", f"数据库连接检查失败: {e}")
            return {"status": "warning", "error": str(e)}
    
    def check_redis_connection(self) -> Dict[str, Any]:
        """检查Redis连接"""
        try:
            result = subprocess.run([
                sys.executable, "-c",
                "import redis; r = redis.Redis(host='localhost', port=6379, db=0); r.ping(); print('Redis OK')"
            ], capture_output=True, text=True, timeout=10)
            
            if result.returncode == 0:
                self.log_status("redis_connection", "healthy", "Redis连接正常")
                return {"status": "healthy"}
            else:
                error_msg = result.stderr.strip() or "Redis连接失败"
                self.log_status("redis_connection", "warning", f"Redis连接失败: {error_msg}")
                return {"status": "warning", "error": error_msg}
        
        except subprocess.TimeoutExpired:
            self.log_status("redis_connection", "warning", "Redis连接超时")
            return {"status": "warning", "error": "连接超时"}
        except Exception as e:
            self.log_status("redis_connection", "warning", f"Redis连接检查失败: {e}")
            return {"status": "warning", "error": str(e)}
    
    def check_optimization_status(self) -> Dict[str, Any]:
        """检查优化组件状态"""
        optimizations = {
            "database_audit": self.project_root / "backend/database_performance_audit.py",
            "smart_cache": self.project_root / "backend/app/services/smart_cache_service.py",
            "security_service": self.project_root / "backend/app/services/security_service.py",
            "frontend_performance": self.project_root / "frontend/lib/performance/performance-optimizer.ts",
            "frontend_security": self.project_root / "frontend/lib/security/security-manager.ts",
            "monitoring_dashboard": self.project_root / "backend/monitoring_dashboard.py",
            "deployment_script": self.project_root / "deploy_optimization.py",
            "validation_script": self.project_root / "optimization_validation.py"
        }
        
        results = {}
        implemented_count = 0
        
        for name, path in optimizations.items():
            exists = path.exists()
            results[name] = {"implemented": exists, "path": str(path)}
            
            if exists:
                implemented_count += 1
                # 检查文件大小（简单的完整性检查）
                file_size = path.stat().st_size
                if file_size > 1000:  # 文件大于1KB认为是完整的
                    results[name]["status"] = "healthy"
                else:
                    results[name]["status"] = "warning"
                    self.log_status("optimization", "warning", f"优化组件 {name} 文件过小，可能不完整")
            else:
                results[name]["status"] = "missing"
        
        # 计算优化完成度
        completion_rate = (implemented_count / len(optimizations)) * 100
        results["completion_rate"] = completion_rate
        
        if completion_rate >= 90:
            self.log_status("optimization_status", "healthy", f"优化实施完成度: {completion_rate:.1f}%")
        elif completion_rate >= 70:
            self.log_status("optimization_status", "warning", f"优化实施部分完成: {completion_rate:.1f}%")
        else:
            self.log_status("optimization_status", "critical", f"优化实施不完整: {completion_rate:.1f}%")
        
        return results
    
    async def run_comprehensive_health_check(self) -> Dict[str, Any]:
        """运行综合健康检查"""
        print("🏥 开始 Nexus 项目健康检查...")
        print("=" * 50)
        
        start_time = time.perf_counter()
        
        # 系统资源检查
        print("📊 检查系统资源...")
        system_resources = self.check_system_resources()
        
        # 项目结构检查
        print("📁 检查项目结构...")
        project_structure = self.check_project_structure()
        
        # 数据库连接检查
        print("🗄️ 检查数据库连接...")
        database_status = self.check_database_connection()
        
        # Redis连接检查
        print("🔄 检查Redis连接...")
        redis_status = self.check_redis_connection()
        
        # API健康检查
        print("🔌 检查API服务...")
        api_status = await self.check_api_health()
        
        # 前端健康检查
        print("🌐 检查前端服务...")
        frontend_status = await self.check_frontend_health()
        
        # 优化状态检查
        print("⚡ 检查优化组件...")
        optimization_status = self.check_optimization_status()
        
        total_time = time.perf_counter() - start_time
        
        # 生成综合报告
        health_report = {
            "timestamp": datetime.now().isoformat(),
            "check_duration_seconds": round(total_time, 2),
            "overall_status": self.calculate_overall_status(),
            "system_resources": system_resources,
            "project_structure": project_structure,
            "database_status": database_status,
            "redis_status": redis_status,
            "api_status": api_status,
            "frontend_status": frontend_status,
            "optimization_status": optimization_status,
            "health_issues": [
                {
                    "component": status.component,
                    "status": status.status,
                    "message": status.message,
                    "timestamp": status.timestamp.isoformat() if status.timestamp else None
                }
                for status in self.health_status
                if status.status in ["warning", "critical"]
            ]
        }
        
        return health_report
    
    def calculate_overall_status(self) -> str:
        """计算总体健康状态"""
        critical_count = sum(1 for status in self.health_status if status.status == "critical")
        warning_count = sum(1 for status in self.health_status if status.status == "warning")
        
        if critical_count > 0:
            return "critical"
        elif warning_count > 2:  # 超过2个警告视为整体警告
            return "warning"
        else:
            return "healthy"
    
    def print_health_summary(self, health_report: Dict[str, Any]):
        """打印健康状态摘要"""
        print("\n" + "=" * 50)
        print("🏥 项目健康检查报告")
        print("=" * 50)
        
        overall_status = health_report["overall_status"]
        status_emoji = {"healthy": "✅", "warning": "⚠️", "critical": "❌"}
        print(f"\n总体状态: {status_emoji.get(overall_status, '❓')} {overall_status.upper()}")
        print(f"检查耗时: {health_report['check_duration_seconds']:.2f}秒")
        
        # 系统资源
        if health_report["system_resources"]:
            resources = health_report["system_resources"]
            print(f"\n📊 系统资源:")
            print(f"  CPU: {resources.get('cpu_percent', 'N/A'):.1f}%")
            print(f"  内存: {resources.get('memory_percent', 'N/A'):.1f}% (可用: {resources.get('memory_available_gb', 'N/A'):.1f}GB)")
            print(f"  磁盘: {resources.get('disk_percent', 'N/A'):.1f}% (剩余: {resources.get('disk_free_gb', 'N/A'):.1f}GB)")
        
        # 服务状态
        services = {
            "API服务": health_report["api_status"],
            "前端服务": health_report["frontend_status"],
            "数据库": health_report["database_status"],
            "Redis": health_report["redis_status"]
        }
        
        print(f"\n🔌 服务状态:")
        for service_name, service_status in services.items():
            status = service_status.get("status", "unknown")
            emoji = status_emoji.get(status, "❓")
            response_time = service_status.get("response_time_ms")
            time_info = f" ({response_time:.1f}ms)" if response_time else ""
            print(f"  {emoji} {service_name}: {status.upper()}{time_info}")
        
        # 优化状态
        opt_status = health_report["optimization_status"]
        completion_rate = opt_status.get("completion_rate", 0)
        print(f"\n⚡ 优化组件完成度: {completion_rate:.1f}%")
        
        # 问题总结
        issues = health_report["health_issues"]
        if issues:
            print(f"\n🚨 发现的问题 ({len(issues)} 个):")
            for issue in issues[:5]:  # 只显示前5个问题
                emoji = status_emoji.get(issue["status"], "❓")
                print(f"  {emoji} {issue['component']}: {issue['message']}")
            
            if len(issues) > 5:
                print(f"  ... 还有 {len(issues) - 5} 个问题")
        else:
            print(f"\n✅ 未发现严重问题")
        
        # 建议
        print(f"\n💡 建议:")
        if overall_status == "critical":
            print("  🔴 发现严重问题，建议立即处理")
            print("  📋 检查上述错误信息并修复关键问题")
        elif overall_status == "warning":
            print("  🟡 发现一些警告，建议优化")
            print("  🔧 可以继续使用，但建议解决警告问题")
        else:
            print("  🟢 系统运行良好")
            print("  📈 可以考虑进行性能优化")
        
        print(f"\n📄 详细报告已记录，可以保存为JSON文件进行进一步分析")
    
    def save_health_report(self, health_report: Dict[str, Any], filename: Optional[str] = None):
        """保存健康检查报告"""
        if not filename:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f"health_report_{timestamp}.json"
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(health_report, f, indent=2, ensure_ascii=False, default=str)
        
        print(f"📄 健康检查报告已保存: {filename}")


async def main():
    """主函数"""
    monitor = ProjectHealthMonitor()
    
    # 运行健康检查
    health_report = await monitor.run_comprehensive_health_check()
    
    # 显示摘要
    monitor.print_health_summary(health_report)
    
    # 保存报告
    monitor.save_health_report(health_report)
    
    # 根据状态返回退出码
    overall_status = health_report["overall_status"]
    if overall_status == "critical":
        return 2
    elif overall_status == "warning":
        return 1
    else:
        return 0


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)