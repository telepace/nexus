"use client";

import React, { useState, useEffect, useRef, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { Badge } from "./badge";
import { Button } from "./button";
import { Progress } from "./progress";
import { Activity, Clock, Zap, BarChart3, RefreshCw } from "lucide-react";

interface PerformanceMetrics {
  renderTime: number;
  blockCount: number;
  memoryUsage: number;
  reRenderCount: number;
  lastUpdate: number;
}

interface PerformanceMonitorProps {
  contentLength?: number;
  blockCount?: number;
  className?: string;
  onReset?: () => void;
}

// 获取内存使用情况（如果支持）
const getMemoryUsage = (): number => {
  if ("memory" in performance) {
    const memory = (performance as any).memory;
    return Math.round((memory.usedJSHeapSize / 1024 / 1024) * 100) / 100;
  }
  return 0;
};

// 性能监控 Hook
const usePerformanceMonitor = (blockCount: number = 0) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    blockCount: 0,
    memoryUsage: 0,
    reRenderCount: 0,
    lastUpdate: Date.now(),
  });

  const renderStartTime = useRef<number>(0);
  const reRenderCountRef = useRef<number>(0);

  // 开始测量渲染时间
  const startMeasure = () => {
    renderStartTime.current = performance.now();
  };

  // 结束测量并更新指标
  const endMeasure = () => {
    if (renderStartTime.current > 0) {
      const renderTime = performance.now() - renderStartTime.current;
      reRenderCountRef.current += 1;

      setMetrics({
        renderTime: Math.round(renderTime * 100) / 100,
        blockCount,
        memoryUsage: getMemoryUsage(),
        reRenderCount: reRenderCountRef.current,
        lastUpdate: Date.now(),
      });

      renderStartTime.current = 0;
    }
  };

  // 重置计数器
  const reset = () => {
    reRenderCountRef.current = 0;
    setMetrics((prev) => ({
      ...prev,
      reRenderCount: 0,
      lastUpdate: Date.now(),
    }));
  };

  useEffect(() => {
    startMeasure();
    endMeasure();
  }, [blockCount]);

  return { metrics, startMeasure, endMeasure, reset };
};

// 性能指标卡片组件
const MetricCard = memo<{
  title: string;
  value: string | number;
  unit?: string;
  icon: React.ReactNode;
  color?: "default" | "green" | "yellow" | "red";
  description?: string;
}>(({ title, value, unit, icon, color = "default", description }) => {
  const getColorClasses = () => {
    switch (color) {
      case "green":
        return "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20";
      case "yellow":
        return "border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/20";
      case "red":
        return "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20";
      default:
        return "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20";
    }
  };

  return (
    <div className={`p-4 rounded-lg border ${getColorClasses()}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium">{title}</span>
        </div>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold">{value}</span>
        {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
      </div>
      {description && (
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      )}
    </div>
  );
});

MetricCard.displayName = "MetricCard";

// 主性能监控组件
export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  contentLength = 0,
  blockCount = 0,
  className,
  onReset,
}) => {
  const { metrics, reset } = usePerformanceMonitor(blockCount);
  const [isExpanded, setIsExpanded] = useState(false);

  // 计算性能等级
  const getPerformanceGrade = (renderTime: number) => {
    if (renderTime < 10) return { grade: "A+", color: "green", desc: "极佳" };
    if (renderTime < 20) return { grade: "A", color: "green", desc: "优秀" };
    if (renderTime < 50) return { grade: "B", color: "yellow", desc: "良好" };
    if (renderTime < 100) return { grade: "C", color: "yellow", desc: "一般" };
    return { grade: "D", color: "red", desc: "需优化" };
  };

  const performanceGrade = getPerformanceGrade(metrics.renderTime);

  const handleReset = () => {
    reset();
    onReset?.();
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4" />
            性能监控
            <Badge variant="secondary" className="text-xs">
              实时
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge
              variant={
                performanceGrade.color === "green" ? "default" : "destructive"
              }
              className="text-xs"
            >
              {performanceGrade.grade} - {performanceGrade.desc}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 w-8 p-0"
            >
              <BarChart3 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 核心指标 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard
            title="渲染时间"
            value={metrics.renderTime}
            unit="ms"
            icon={<Clock className="h-4 w-4 text-blue-500" />}
            color={performanceGrade.color as any}
            description="完整渲染耗时"
          />

          <MetricCard
            title="内容块数"
            value={metrics.blockCount}
            icon={<Zap className="h-4 w-4 text-green-500" />}
            description="渲染的内容块总数"
          />

          <MetricCard
            title="重渲染次数"
            value={metrics.reRenderCount}
            icon={<RefreshCw className="h-4 w-4 text-yellow-500" />}
            color={metrics.reRenderCount > 5 ? "yellow" : "default"}
            description="组件重新渲染次数"
          />

          {metrics.memoryUsage > 0 && (
            <MetricCard
              title="内存使用"
              value={metrics.memoryUsage}
              unit="MB"
              icon={<BarChart3 className="h-4 w-4 text-purple-500" />}
              color={metrics.memoryUsage > 50 ? "red" : "default"}
              description="当前JS堆内存使用"
            />
          )}
        </div>

        {/* 详细信息（可展开） */}
        {isExpanded && (
          <div className="space-y-4 pt-4 border-t">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium mb-2">渲染性能分析</h4>
                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>平均每块渲染时间:</span>
                    <span>
                      {metrics.blockCount > 0
                        ? (metrics.renderTime / metrics.blockCount).toFixed(2)
                        : 0}
                      ms
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>渲染效率:</span>
                    <span>
                      {metrics.blockCount > 0
                        ? Math.round(
                            (metrics.blockCount / metrics.renderTime) * 1000,
                          )
                        : 0}{" "}
                      块/秒
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>最后更新:</span>
                    <span>
                      {new Date(metrics.lastUpdate).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2">优化建议</h4>
                <div className="space-y-1 text-xs text-muted-foreground">
                  {metrics.renderTime > 50 && (
                    <div className="text-yellow-600 dark:text-yellow-400">
                      • 考虑启用虚拟滚动优化
                    </div>
                  )}
                  {metrics.reRenderCount > 10 && (
                    <div className="text-orange-600 dark:text-orange-400">
                      • 检查是否有不必要的重渲染
                    </div>
                  )}
                  {metrics.memoryUsage > 100 && (
                    <div className="text-red-600 dark:text-red-400">
                      • 内存使用较高，建议优化
                    </div>
                  )}
                  {metrics.renderTime < 20 && metrics.reRenderCount < 5 && (
                    <div className="text-green-600 dark:text-green-400">
                      • 性能表现优秀！
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 性能趋势图（简化版本） */}
            <div>
              <h4 className="text-sm font-medium mb-2">渲染时间趋势</h4>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    performanceGrade.color === "green"
                      ? "bg-green-500"
                      : performanceGrade.color === "yellow"
                        ? "bg-yellow-500"
                        : "bg-red-500"
                  }`}
                  style={{
                    width: `${Math.min(100, (metrics.renderTime / 100) * 100)}%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>0ms</span>
                <span>100ms+</span>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                重置计数器
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// 导出性能监控 Hook 供其他组件使用
export { usePerformanceMonitor };
