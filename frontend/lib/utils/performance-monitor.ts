"use client";

/**
 * 性能监控工具
 * 用于监控和测试重构后的性能改进
 */

interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics = new Map<string, PerformanceMetric>();
  private isEnabled = false;

  constructor() {
    // 只在开发环境中启用
    this.isEnabled = process.env.NODE_ENV === 'development';
  }

  /**
   * 开始测量性能
   */
  start(name: string, metadata?: Record<string, any>): void {
    if (!this.isEnabled) return;

    this.metrics.set(name, {
      name,
      startTime: performance.now(),
      metadata,
    });
  }

  /**
   * 结束测量性能
   */
  end(name: string): number | null {
    if (!this.isEnabled) return null;

    const metric = this.metrics.get(name);
    if (!metric) {
      console.warn(`Performance metric "${name}" not found`);
      return null;
    }

    const endTime = performance.now();
    const duration = endTime - metric.startTime;

    metric.endTime = endTime;
    metric.duration = duration;

    console.log(`🚀 Performance: ${name} took ${duration.toFixed(2)}ms`, metric.metadata);

    return duration;
  }

  /**
   * 测量函数执行时间
   */
  measure<T>(name: string, fn: () => T, metadata?: Record<string, any>): T {
    if (!this.isEnabled) return fn();

    this.start(name, metadata);
    const result = fn();
    this.end(name);

    return result;
  }

  /**
   * 测量异步函数执行时间
   */
  async measureAsync<T>(
    name: string, 
    fn: () => Promise<T>, 
    metadata?: Record<string, any>
  ): Promise<T> {
    if (!this.isEnabled) return fn();

    this.start(name, metadata);
    const result = await fn();
    this.end(name);

    return result;
  }

  /**
   * 获取所有测量结果
   */
  getMetrics(): PerformanceMetric[] {
    return Array.from(this.metrics.values()).filter(m => m.duration !== undefined);
  }

  /**
   * 清除所有测量结果
   */
  clear(): void {
    this.metrics.clear();
  }

  /**
   * 获取性能报告
   */
  getReport(): {
    total: number;
    average: number;
    slowest: PerformanceMetric | null;
    fastest: PerformanceMetric | null;
    metrics: PerformanceMetric[];
  } {
    const metrics = this.getMetrics();
    
    if (metrics.length === 0) {
      return {
        total: 0,
        average: 0,
        slowest: null,
        fastest: null,
        metrics: [],
      };
    }

    const durations = metrics.map(m => m.duration!);
    const total = durations.reduce((sum, d) => sum + d, 0);
    const average = total / durations.length;

    const slowest = metrics.reduce((prev, current) => 
      (current.duration! > prev.duration!) ? current : prev
    );

    const fastest = metrics.reduce((prev, current) => 
      (current.duration! < prev.duration!) ? current : prev
    );

    return {
      total,
      average,
      slowest,
      fastest,
      metrics,
    };
  }
}

// 导出单例实例
export const performanceMonitor = new PerformanceMonitor();

// React Hook for performance monitoring
export function usePerformanceMonitor() {
  return {
    start: performanceMonitor.start.bind(performanceMonitor),
    end: performanceMonitor.end.bind(performanceMonitor),
    measure: performanceMonitor.measure.bind(performanceMonitor),
    measureAsync: performanceMonitor.measureAsync.bind(performanceMonitor),
    getMetrics: performanceMonitor.getMetrics.bind(performanceMonitor),
    getReport: performanceMonitor.getReport.bind(performanceMonitor),
    clear: performanceMonitor.clear.bind(performanceMonitor),
  };
}

// 便捷的装饰器函数
export function withPerformanceMonitoring<T extends (...args: any[]) => any>(
  name: string,
  fn: T
): T {
  return ((...args: any[]) => {
    return performanceMonitor.measure(name, () => fn(...args));
  }) as T;
}

// 异步函数装饰器
export function withAsyncPerformanceMonitoring<T extends (...args: any[]) => Promise<any>>(
  name: string,
  fn: T
): T {
  return (async (...args: any[]) => {
    return performanceMonitor.measureAsync(name, () => fn(...args));
  }) as T;
}