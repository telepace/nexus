#!/usr/bin/env python3
"""
实时监控面板
提供系统性能、缓存效率、安全事件的实时监控
"""

import asyncio
import json
import time
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from pathlib import Path

import psutil
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
import uvicorn

from app.core.redis_client import redis_client
from app.services.smart_cache_service import smart_cache
from app.services.security_service import security_service


@dataclass
class SystemMetrics:
    """系统性能指标"""
    timestamp: datetime
    cpu_percent: float
    memory_percent: float
    disk_usage: float
    network_io: Dict[str, int]
    active_connections: int
    response_time_avg: float
    

@dataclass
class CacheMetrics:
    """缓存性能指标"""
    timestamp: datetime
    hit_rate: float
    miss_rate: float
    memory_usage: int
    redis_usage: int
    active_keys: int
    eviction_count: int


@dataclass
class SecurityMetrics:
    """安全指标"""
    timestamp: datetime
    blocked_requests: int
    failed_logins: int
    rate_limit_violations: int
    suspicious_activities: int
    active_sessions: int


class MonitoringDashboard:
    """监控面板"""
    
    def __init__(self):
        self.app = FastAPI(title="Nexus Monitoring Dashboard")
        self.active_connections: List[WebSocket] = []
        self.metrics_history: Dict[str, List[Dict]] = {
            "system": [],
            "cache": [],
            "security": []
        }
        self.max_history_size = 1440  # 24小时的分钟数
        
        self.setup_routes()
    
    def setup_routes(self):
        """设置路由"""
        
        @self.app.get("/")
        async def dashboard():
            return HTMLResponse(self.get_dashboard_html())
        
        @self.app.websocket("/ws")
        async def websocket_endpoint(websocket: WebSocket):
            await websocket.accept()
            self.active_connections.append(websocket)
            try:
                while True:
                    await websocket.receive_text()
            except WebSocketDisconnect:
                self.active_connections.remove(websocket)
        
        @self.app.get("/api/metrics/current")
        async def get_current_metrics():
            """获取当前指标"""
            return {
                "system": await self.collect_system_metrics(),
                "cache": await self.collect_cache_metrics(),
                "security": await self.collect_security_metrics()
            }
        
        @self.app.get("/api/metrics/history/{metric_type}")
        async def get_metrics_history(metric_type: str, hours: int = 1):
            """获取历史指标"""
            if metric_type not in self.metrics_history:
                return {"error": "Invalid metric type"}
            
            cutoff_time = datetime.now(timezone.utc) - timedelta(hours=hours)
            filtered_metrics = [
                m for m in self.metrics_history[metric_type]
                if datetime.fromisoformat(m['timestamp'].replace('Z', '+00:00')) > cutoff_time
            ]
            return {"metrics": filtered_metrics}
        
        @self.app.get("/api/alerts")
        async def get_active_alerts():
            """获取活跃告警"""
            return await self.generate_alerts()
    
    async def collect_system_metrics(self) -> Dict[str, Any]:
        """收集系统指标"""
        try:
            # CPU和内存使用率
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            # 网络I/O
            network = psutil.net_io_counters()
            
            # 活跃连接数
            active_connections = len(psutil.net_connections())
            
            # 模拟响应时间（实际应从应用监控获取）
            response_time_avg = await self.calculate_avg_response_time()
            
            metrics = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "cpu_percent": cpu_percent,
                "memory_percent": memory.percent,
                "disk_usage": disk.percent,
                "network_io": {
                    "bytes_sent": network.bytes_sent,
                    "bytes_recv": network.bytes_recv
                },
                "active_connections": active_connections,
                "response_time_avg": response_time_avg
            }
            
            return metrics
        except Exception as e:
            print(f"收集系统指标失败: {e}")
            return {}
    
    async def collect_cache_metrics(self) -> Dict[str, Any]:
        """收集缓存指标"""
        try:
            # 从智能缓存服务获取统计
            cache_stats = smart_cache.get_stats()
            
            # Redis信息
            redis_info = {}
            try:
                redis_info = await redis_client.info("memory")
            except Exception as e:
                print(f"获取Redis信息失败: {e}")
            
            # 计算缓存命中率
            total_requests = sum(
                stats.hits + stats.misses 
                for stats in cache_stats.values()
            )
            total_hits = sum(stats.hits for stats in cache_stats.values())
            hit_rate = (total_hits / total_requests * 100) if total_requests > 0 else 0
            
            metrics = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "hit_rate": hit_rate,
                "miss_rate": 100 - hit_rate,
                "memory_usage": sum(stats.memory_items for stats in cache_stats.values()),
                "redis_usage": redis_info.get("used_memory", 0),
                "active_keys": len(cache_stats),
                "eviction_count": 0,  # 需要从缓存服务实现
                "cache_details": {
                    name: {
                        "hits": stats.hits,
                        "misses": stats.misses,
                        "memory_items": stats.memory_items
                    }
                    for name, stats in cache_stats.items()
                }
            }
            
            return metrics
        except Exception as e:
            print(f"收集缓存指标失败: {e}")
            return {}
    
    async def collect_security_metrics(self) -> Dict[str, Any]:
        """收集安全指标"""
        try:
            # 从安全服务获取统计
            security_stats = await security_service.get_security_stats()
            
            metrics = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "blocked_requests": security_stats.get("rate_limit_violations", 0),
                "failed_logins": security_stats.get("failed_logins", 0),
                "rate_limit_violations": security_stats.get("rate_limit_violations", 0),
                "suspicious_activities": sum(
                    count for action, count in security_stats.get("top_actions", {}).items()
                    if "failed" in action or "blocked" in action
                ),
                "active_sessions": security_stats.get("unique_ips", 0),
                "security_events_24h": security_stats.get("total_events", 0)
            }
            
            return metrics
        except Exception as e:
            print(f"收集安全指标失败: {e}")
            return {}
    
    async def calculate_avg_response_time(self) -> float:
        """计算平均响应时间"""
        # 这里应该从实际的APM系统获取数据
        # 暂时返回模拟值
        return 150.0
    
    async def generate_alerts(self) -> List[Dict[str, Any]]:
        """生成告警"""
        alerts = []
        
        # 收集当前指标
        system_metrics = await self.collect_system_metrics()
        cache_metrics = await self.collect_cache_metrics()
        security_metrics = await self.collect_security_metrics()
        
        # 系统告警
        if system_metrics.get("cpu_percent", 0) > 80:
            alerts.append({
                "type": "system",
                "severity": "high",
                "message": f"CPU使用率过高: {system_metrics['cpu_percent']:.1f}%",
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
        
        if system_metrics.get("memory_percent", 0) > 90:
            alerts.append({
                "type": "system", 
                "severity": "critical",
                "message": f"内存使用率危险: {system_metrics['memory_percent']:.1f}%",
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
        
        # 缓存告警
        if cache_metrics.get("hit_rate", 100) < 50:
            alerts.append({
                "type": "cache",
                "severity": "medium",
                "message": f"缓存命中率过低: {cache_metrics['hit_rate']:.1f}%",
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
        
        # 安全告警
        if security_metrics.get("rate_limit_violations", 0) > 100:
            alerts.append({
                "type": "security",
                "severity": "high", 
                "message": f"限流违规过多: {security_metrics['rate_limit_violations']} 次",
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
        
        return alerts
    
    async def start_monitoring(self):
        """开始监控"""
        while True:
            try:
                # 收集指标
                system_metrics = await self.collect_system_metrics()
                cache_metrics = await self.collect_cache_metrics()
                security_metrics = await self.collect_security_metrics()
                
                # 添加到历史记录
                if system_metrics:
                    self.metrics_history["system"].append(system_metrics)
                if cache_metrics:
                    self.metrics_history["cache"].append(cache_metrics)
                if security_metrics:
                    self.metrics_history["security"].append(security_metrics)
                
                # 清理过期数据
                for metric_type in self.metrics_history:
                    if len(self.metrics_history[metric_type]) > self.max_history_size:
                        self.metrics_history[metric_type] = self.metrics_history[metric_type][-self.max_history_size:]
                
                # 发送实时数据给WebSocket连接
                if self.active_connections:
                    message = {
                        "type": "metrics_update",
                        "data": {
                            "system": system_metrics,
                            "cache": cache_metrics,
                            "security": security_metrics
                        }
                    }
                    
                    # 发送给所有连接的客户端
                    disconnected = []
                    for connection in self.active_connections:
                        try:
                            await connection.send_text(json.dumps(message, default=str))
                        except Exception:
                            disconnected.append(connection)
                    
                    # 移除断开的连接
                    for connection in disconnected:
                        self.active_connections.remove(connection)
                
                await asyncio.sleep(60)  # 每分钟收集一次
                
            except Exception as e:
                print(f"监控循环错误: {e}")
                await asyncio.sleep(60)
    
    def get_dashboard_html(self) -> str:
        """获取监控面板HTML"""
        return """
<!DOCTYPE html>
<html>
<head>
    <title>Nexus Monitoring Dashboard</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .header { text-align: center; margin-bottom: 30px; }
        .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .metric-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .metric-title { font-size: 18px; font-weight: bold; margin-bottom: 15px; }
        .metric-value { font-size: 24px; color: #2196F3; }
        .alerts { background: #ffebee; border-left: 4px solid #f44336; padding: 15px; margin: 20px 0; }
        .alert-item { margin: 5px 0; }
        .status-good { color: #4CAF50; }
        .status-warning { color: #FF9800; }
        .status-critical { color: #f44336; }
        .chart-container { height: 200px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚀 Nexus Monitoring Dashboard</h1>
        <p>实时系统性能监控 | 最后更新: <span id="lastUpdate">--</span></p>
    </div>
    
    <div id="alerts"></div>
    
    <div class="metrics-grid">
        <div class="metric-card">
            <div class="metric-title">🖥️ 系统性能</div>
            <div>CPU: <span id="cpuUsage" class="metric-value">--</span>%</div>
            <div>内存: <span id="memoryUsage" class="metric-value">--</span>%</div>
            <div>磁盘: <span id="diskUsage" class="metric-value">--</span>%</div>
            <div>响应时间: <span id="responseTime" class="metric-value">--</span>ms</div>
        </div>
        
        <div class="metric-card">
            <div class="metric-title">⚡ 缓存性能</div>
            <div>命中率: <span id="cacheHitRate" class="metric-value">--</span>%</div>
            <div>内存键数: <span id="memoryKeys" class="metric-value">--</span></div>
            <div>Redis使用: <span id="redisUsage" class="metric-value">--</span>MB</div>
        </div>
        
        <div class="metric-card">
            <div class="metric-title">🔒 安全状况</div>
            <div>拦截请求: <span id="blockedRequests" class="metric-value">--</span></div>
            <div>登录失败: <span id="failedLogins" class="metric-value">--</span></div>
            <div>活跃会话: <span id="activeSessions" class="metric-value">--</span></div>
        </div>
        
        <div class="metric-card">
            <div class="metric-title">📊 实时图表</div>
            <div class="chart-container">
                <canvas id="performanceChart"></canvas>
            </div>
        </div>
    </div>

    <script>
        const ws = new WebSocket('ws://localhost:8001/ws');
        const performanceData = {
            labels: [],
            datasets: [
                { label: 'CPU %', data: [], borderColor: '#f44336', fill: false },
                { label: '内存 %', data: [], borderColor: '#2196F3', fill: false },
                { label: '缓存命中率 %', data: [], borderColor: '#4CAF50', fill: false }
            ]
        };
        
        const chart = new Chart(document.getElementById('performanceChart'), {
            type: 'line',
            data: performanceData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { y: { beginAtZero: true, max: 100 } }
            }
        });
        
        ws.onmessage = function(event) {
            const message = JSON.parse(event.data);
            if (message.type === 'metrics_update') {
                updateMetrics(message.data);
            }
        };
        
        function updateMetrics(data) {
            const now = new Date().toLocaleTimeString();
            document.getElementById('lastUpdate').textContent = now;
            
            // 系统指标
            if (data.system) {
                document.getElementById('cpuUsage').textContent = data.system.cpu_percent?.toFixed(1) || '--';
                document.getElementById('memoryUsage').textContent = data.system.memory_percent?.toFixed(1) || '--';
                document.getElementById('diskUsage').textContent = data.system.disk_usage?.toFixed(1) || '--';
                document.getElementById('responseTime').textContent = data.system.response_time_avg?.toFixed(0) || '--';
            }
            
            // 缓存指标
            if (data.cache) {
                document.getElementById('cacheHitRate').textContent = data.cache.hit_rate?.toFixed(1) || '--';
                document.getElementById('memoryKeys').textContent = data.cache.memory_usage || '--';
                document.getElementById('redisUsage').textContent = Math.round((data.cache.redis_usage || 0) / 1024 / 1024);
            }
            
            // 安全指标
            if (data.security) {
                document.getElementById('blockedRequests').textContent = data.security.blocked_requests || '--';
                document.getElementById('failedLogins').textContent = data.security.failed_logins || '--';
                document.getElementById('activeSessions').textContent = data.security.active_sessions || '--';
            }
            
            // 更新图表
            updateChart(data);
        }
        
        function updateChart(data) {
            if (performanceData.labels.length > 20) {
                performanceData.labels.shift();
                performanceData.datasets.forEach(dataset => dataset.data.shift());
            }
            
            performanceData.labels.push(new Date().toLocaleTimeString());
            performanceData.datasets[0].data.push(data.system?.cpu_percent || 0);
            performanceData.datasets[1].data.push(data.system?.memory_percent || 0);
            performanceData.datasets[2].data.push(data.cache?.hit_rate || 0);
            
            chart.update();
        }
        
        // 定期获取告警
        setInterval(async () => {
            try {
                const response = await fetch('/api/alerts');
                const alerts = await response.json();
                displayAlerts(alerts);
            } catch (error) {
                console.error('获取告警失败:', error);
            }
        }, 30000);
        
        function displayAlerts(alerts) {
            const alertsDiv = document.getElementById('alerts');
            if (alerts.length === 0) {
                alertsDiv.innerHTML = '';
                return;
            }
            
            alertsDiv.innerHTML = '<h3>🚨 活跃告警</h3>' + 
                alerts.map(alert => 
                    `<div class="alert-item status-${alert.severity}">${alert.message}</div>`
                ).join('');
        }
        
        // 初始化加载
        fetch('/api/metrics/current').then(r => r.json()).then(updateMetrics);
    </script>
</body>
</html>
        """


async def main():
    """启动监控面板"""
    dashboard = MonitoringDashboard()
    
    # 启动监控任务
    monitor_task = asyncio.create_task(dashboard.start_monitoring())
    
    # 启动Web服务器
    config = uvicorn.Config(
        dashboard.app, 
        host="0.0.0.0", 
        port=8001,
        log_level="info"
    )
    server = uvicorn.Server(config)
    
    print("🚀 启动 Nexus 监控面板...")
    print("📊 访问地址: http://localhost:8001")
    print("⚡ 实时监控: WebSocket连接已启用")
    
    await server.serve()


if __name__ == "__main__":
    asyncio.run(main())