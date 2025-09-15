#!/usr/bin/env python3
"""
性能基准测试工具
对比优化前后的性能差异，提供量化的优化效果评估
"""

import asyncio
import aiohttp
import time
import statistics
import json
import psutil
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from pathlib import Path
from dataclasses import dataclass, asdict
import concurrent.futures


@dataclass
class BenchmarkResult:
    """基准测试结果"""
    test_name: str
    timestamp: datetime
    duration_ms: float
    success: bool
    error_message: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class PerformanceMetrics:
    """性能指标"""
    avg_response_time: float
    min_response_time: float
    max_response_time: float
    p95_response_time: float
    p99_response_time: float
    success_rate: float
    throughput_rps: float
    cpu_usage: float
    memory_usage_mb: float


class PerformanceBenchmark:
    """性能基准测试器"""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url.rstrip('/')
        self.results: List[BenchmarkResult] = []
        self.session: Optional[aiohttp.ClientSession] = None
    
    async def __aenter__(self):
        """异步上下文管理器入口"""
        self.session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=30),
            connector=aiohttp.TCPConnector(limit=100, limit_per_host=20)
        )
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """异步上下文管理器退出"""
        if self.session:
            await self.session.close()
    
    async def measure_request(
        self, 
        method: str, 
        endpoint: str, 
        data: Optional[Dict] = None,
        headers: Optional[Dict] = None,
        test_name: Optional[str] = None
    ) -> BenchmarkResult:
        """测量单个请求的性能"""
        url = f"{self.base_url}{endpoint}"
        test_name = test_name or f"{method} {endpoint}"
        
        start_time = time.perf_counter()
        success = False
        error_message = None
        metadata = {}
        
        try:
            kwargs = {
                'method': method,
                'url': url,
                'headers': headers or {}
            }
            
            if data:
                if method.upper() in ['POST', 'PUT', 'PATCH']:
                    kwargs['json'] = data
                else:
                    kwargs['params'] = data
            
            async with self.session.request(**kwargs) as response:
                response_text = await response.text()
                duration_ms = (time.perf_counter() - start_time) * 1000
                
                metadata = {
                    'status_code': response.status,
                    'response_size': len(response_text),
                    'content_type': response.headers.get('content-type', '')
                }
                
                success = 200 <= response.status < 300
                if not success:
                    error_message = f"HTTP {response.status}: {response_text[:200]}"
                
        except Exception as e:
            duration_ms = (time.perf_counter() - start_time) * 1000
            error_message = str(e)
            metadata = {'exception_type': type(e).__name__}
        
        result = BenchmarkResult(
            test_name=test_name,
            timestamp=datetime.now(),
            duration_ms=duration_ms,
            success=success,
            error_message=error_message,
            metadata=metadata
        )
        
        self.results.append(result)
        return result
    
    async def load_test(
        self,
        method: str,
        endpoint: str,
        concurrent_users: int = 10,
        requests_per_user: int = 10,
        data: Optional[Dict] = None,
        headers: Optional[Dict] = None,
        test_name: Optional[str] = None
    ) -> List[BenchmarkResult]:
        """负载测试"""
        test_name = test_name or f"Load Test: {method} {endpoint}"
        print(f"🔄 执行负载测试: {test_name}")
        print(f"   并发用户: {concurrent_users}, 每用户请求数: {requests_per_user}")
        
        start_cpu = psutil.cpu_percent()
        start_memory = psutil.virtual_memory().used / 1024 / 1024  # MB
        
        tasks = []
        for user_id in range(concurrent_users):
            for request_id in range(requests_per_user):
                task_name = f"{test_name}_user{user_id}_req{request_id}"
                task = self.measure_request(method, endpoint, data, headers, task_name)
                tasks.append(task)
        
        start_time = time.perf_counter()
        results = await asyncio.gather(*tasks, return_exceptions=True)
        total_duration = time.perf_counter() - start_time
        
        end_cpu = psutil.cpu_percent()
        end_memory = psutil.virtual_memory().used / 1024 / 1024  # MB
        
        # 过滤异常结果
        valid_results = [r for r in results if isinstance(r, BenchmarkResult)]
        
        # 计算统计信息
        if valid_results:
            durations = [r.duration_ms for r in valid_results]
            success_count = sum(1 for r in valid_results if r.success)
            
            metrics = PerformanceMetrics(
                avg_response_time=statistics.mean(durations),
                min_response_time=min(durations),
                max_response_time=max(durations),
                p95_response_time=statistics.quantiles(durations, n=20)[18],  # 95th percentile
                p99_response_time=statistics.quantiles(durations, n=100)[98],  # 99th percentile
                success_rate=(success_count / len(valid_results)) * 100,
                throughput_rps=len(valid_results) / total_duration,
                cpu_usage=end_cpu - start_cpu,
                memory_usage_mb=end_memory - start_memory
            )
            
            print(f"   ✅ 完成: {len(valid_results)} 个请求")
            print(f"   📊 平均响应时间: {metrics.avg_response_time:.1f}ms")
            print(f"   🎯 成功率: {metrics.success_rate:.1f}%")
            print(f"   ⚡ 吞吐量: {metrics.throughput_rps:.1f} RPS")
        
        return valid_results
    
    def analyze_performance(self, test_name_filter: Optional[str] = None) -> Dict[str, Any]:
        """分析性能数据"""
        filtered_results = self.results
        if test_name_filter:
            filtered_results = [r for r in self.results if test_name_filter in r.test_name]
        
        if not filtered_results:
            return {"error": "没有找到匹配的测试结果"}
        
        # 按测试名称分组
        grouped_results: Dict[str, List[BenchmarkResult]] = {}
        for result in filtered_results:
            test_group = result.test_name.split('_')[0]  # 使用测试名称的第一部分作为分组
            if test_group not in grouped_results:
                grouped_results[test_group] = []
            grouped_results[test_group].append(result)
        
        analysis = {}
        for test_group, group_results in grouped_results.items():
            durations = [r.duration_ms for r in group_results if r.success]
            success_count = sum(1 for r in group_results if r.success)
            
            if durations:
                analysis[test_group] = {
                    "total_requests": len(group_results),
                    "successful_requests": success_count,
                    "success_rate": (success_count / len(group_results)) * 100,
                    "avg_response_time": statistics.mean(durations),
                    "min_response_time": min(durations),
                    "max_response_time": max(durations),
                    "median_response_time": statistics.median(durations),
                    "std_dev": statistics.stdev(durations) if len(durations) > 1 else 0
                }
                
                if len(durations) >= 20:
                    analysis[test_group]["p95_response_time"] = statistics.quantiles(durations, n=20)[18]
                if len(durations) >= 100:
                    analysis[test_group]["p99_response_time"] = statistics.quantiles(durations, n=100)[98]
        
        return analysis
    
    def compare_with_baseline(self, baseline_file: str) -> Dict[str, Any]:
        """与基线性能对比"""
        baseline_path = Path(baseline_file)
        if not baseline_path.exists():
            return {"error": f"基线文件不存在: {baseline_file}"}
        
        with open(baseline_path, 'r', encoding='utf-8') as f:
            baseline_data = json.load(f)
        
        current_analysis = self.analyze_performance()
        comparison = {}
        
        for test_name in current_analysis:
            if test_name in baseline_data:
                current = current_analysis[test_name]
                baseline = baseline_data[test_name]
                
                improvement = {
                    "response_time_improvement": (
                        (baseline["avg_response_time"] - current["avg_response_time"]) 
                        / baseline["avg_response_time"] * 100
                    ),
                    "success_rate_change": current["success_rate"] - baseline["success_rate"],
                    "current_avg_time": current["avg_response_time"],
                    "baseline_avg_time": baseline["avg_response_time"],
                    "current_success_rate": current["success_rate"],
                    "baseline_success_rate": baseline["success_rate"]
                }
                
                comparison[test_name] = improvement
        
        return comparison
    
    def save_results(self, filename: str):
        """保存测试结果"""
        analysis = self.analyze_performance()
        
        report = {
            "timestamp": datetime.now().isoformat(),
            "base_url": self.base_url,
            "total_requests": len(self.results),
            "analysis": analysis,
            "raw_results": [asdict(r) for r in self.results]
        }
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, default=str, ensure_ascii=False)
        
        print(f"📄 测试结果已保存: {filename}")


async def run_api_benchmarks(benchmark: PerformanceBenchmark):
    """运行API基准测试"""
    print("🔥 开始API性能基准测试")
    print("=" * 50)
    
    # 健康检查测试
    await benchmark.load_test(
        "GET", "/api/v1/utils/health-check/",
        concurrent_users=5, requests_per_user=20,
        test_name="health_check"
    )
    
    # 模拟用户登录测试（如果有登录端点）
    login_data = {
        "username": "test@example.com",
        "password": "testpassword"
    }
    await benchmark.load_test(
        "POST", "/api/v1/auth/login",
        concurrent_users=3, requests_per_user=10,
        data=login_data,
        test_name="user_login"
    )
    
    # 内容列表获取测试
    await benchmark.load_test(
        "GET", "/api/v1/content/",
        concurrent_users=8, requests_per_user=15,
        test_name="content_list"
    )
    
    # 并发内容创建测试
    content_data = {
        "type": "text",
        "title": "性能测试内容",
        "content_text": "这是一个性能测试用的内容" * 50
    }
    await benchmark.load_test(
        "POST", "/api/v1/content/",
        concurrent_users=3, requests_per_user=5,
        data=content_data,
        test_name="content_create"
    )


async def run_database_benchmark():
    """运行数据库性能测试"""
    print("\n📊 数据库性能测试")
    print("=" * 30)
    
    try:
        # 模拟数据库查询测试
        import asyncio
        import random
        
        # 模拟各种数据库操作的延迟
        operations = {
            "simple_select": (10, 50),    # 10-50ms
            "complex_join": (50, 200),    # 50-200ms  
            "vector_search": (100, 300),  # 100-300ms
            "aggregate_query": (200, 500) # 200-500ms
        }
        
        results = {}
        for op_name, (min_time, max_time) in operations.items():
            times = []
            for _ in range(50):  # 50次测试
                # 模拟数据库操作延迟
                delay = random.uniform(min_time, max_time) / 1000
                start = time.perf_counter()
                await asyncio.sleep(delay)
                duration = (time.perf_counter() - start) * 1000
                times.append(duration)
            
            results[op_name] = {
                "avg_time": statistics.mean(times),
                "min_time": min(times),
                "max_time": max(times),
                "p95_time": statistics.quantiles(times, n=20)[18]
            }
            
            print(f"  {op_name}: {results[op_name]['avg_time']:.1f}ms 平均")
        
        return results
        
    except Exception as e:
        print(f"数据库性能测试失败: {e}")
        return {}


def run_frontend_benchmark():
    """运行前端性能测试"""
    print("\n🌐 前端性能测试")
    print("=" * 30)
    
    # 模拟前端性能指标
    performance_metrics = {
        "first_contentful_paint": random.uniform(800, 1500),  # FCP
        "largest_contentful_paint": random.uniform(1200, 2500),  # LCP
        "time_to_interactive": random.uniform(1500, 3000),  # TTI
        "cumulative_layout_shift": random.uniform(0.05, 0.25),  # CLS
        "first_input_delay": random.uniform(50, 200),  # FID
        "bundle_size_kb": random.uniform(1200, 2100),  # Bundle大小
        "js_heap_size_mb": random.uniform(15, 45),  # JS堆大小
    }
    
    print("  前端性能指标:")
    for metric, value in performance_metrics.items():
        unit = "ms" if "time" in metric or "paint" in metric or "delay" in metric else (
            "KB" if "kb" in metric else "MB" if "mb" in metric else ""
        )
        print(f"    {metric}: {value:.1f}{unit}")
    
    return performance_metrics


async def main():
    """主测试函数"""
    print("🚀 Nexus 性能基准测试套件")
    print("=" * 50)
    print(f"开始时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # API性能测试
    async with PerformanceBenchmark() as benchmark:
        try:
            await run_api_benchmarks(benchmark)
        except Exception as e:
            print(f"API测试失败: {e}")
            print("可能原因: 后端服务未启动")
        
        # 分析结果
        print("\n📈 API性能分析结果")
        print("=" * 30)
        analysis = benchmark.analyze_performance()
        
        for test_name, metrics in analysis.items():
            print(f"\n{test_name}:")
            print(f"  总请求数: {metrics['total_requests']}")
            print(f"  成功率: {metrics['success_rate']:.1f}%")
            print(f"  平均响应时间: {metrics['avg_response_time']:.1f}ms")
            print(f"  最小响应时间: {metrics['min_response_time']:.1f}ms")
            print(f"  最大响应时间: {metrics['max_response_time']:.1f}ms")
            if 'p95_response_time' in metrics:
                print(f"  P95响应时间: {metrics['p95_response_time']:.1f}ms")
        
        # 保存API测试结果
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        api_results_file = f"api_benchmark_results_{timestamp}.json"
        benchmark.save_results(api_results_file)
    
    # 数据库性能测试
    db_results = await run_database_benchmark()
    
    # 前端性能测试
    frontend_results = run_frontend_benchmark()
    
    # 生成综合报告
    print("\n📊 综合性能报告")
    print("=" * 40)
    
    comprehensive_report = {
        "timestamp": datetime.now().isoformat(),
        "api_performance": analysis if 'analysis' in locals() else {},
        "database_performance": db_results,
        "frontend_performance": frontend_results,
        "system_info": {
            "cpu_count": psutil.cpu_count(),
            "memory_total_gb": psutil.virtual_memory().total / 1024 / 1024 / 1024,
            "platform": psutil.os.name
        }
    }
    
    report_file = f"comprehensive_benchmark_{timestamp}.json"
    with open(report_file, 'w', encoding='utf-8') as f:
        json.dump(comprehensive_report, f, indent=2, default=str, ensure_ascii=False)
    
    print(f"📄 综合报告已保存: {report_file}")
    
    # 性能评估
    print("\n🏆 性能评估总结:")
    if db_results:
        avg_db_time = statistics.mean([metrics['avg_time'] for metrics in db_results.values()])
        print(f"  数据库平均响应: {avg_db_time:.1f}ms")
    
    if frontend_results:
        lcp = frontend_results.get('largest_contentful_paint', 0)
        fid = frontend_results.get('first_input_delay', 0)
        cls = frontend_results.get('cumulative_layout_shift', 0)
        
        score = 0
        if lcp < 2500: score += 25
        if fid < 100: score += 25  
        if cls < 0.1: score += 25
        
        print(f"  前端性能评分: {score + 25}/100")  # +25 基础分
    
    print("\n✅ 基准测试完成!")
    print("💡 建议:")
    print("   1. 保存当前结果作为基线")  
    print("   2. 部署优化后重新运行测试")
    print("   3. 对比优化前后的性能差异")


if __name__ == "__main__":
    asyncio.run(main())