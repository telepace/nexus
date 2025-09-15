/**
 * 认证性能监控面板 (仅开发环境)
 */

'use client';

import { useAuthPerformance } from "@/lib/auth-context-optimized";
import { useState, useEffect } from "react";

export default function AuthPerformancePanel() {
  const cacheStats = useAuthPerformance();
  const [requests, setRequests] = useState(0);
  const [cacheHits, setCacheHits] = useState(0);

  useEffect(() => {
    // 模拟请求计数
    const interval = setInterval(() => {
      setRequests(prev => prev + Math.floor(Math.random() * 3));
      if (cacheStats?.userCacheHit) {
        setCacheHits(prev => prev + 1);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [cacheStats]);

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 bg-black bg-opacity-80 text-white p-3 rounded-lg text-xs z-50">
      <h3 className="font-bold mb-2">🚀 认证性能监控</h3>
      {cacheStats && (
        <div className="space-y-1">
          <div>用户缓存: {cacheStats.userCacheHit ? '✅ 命中' : '❌ 未命中'}</div>
          <div>Token验证缓存: {cacheStats.tokenValidationCacheSize} 项</div>
          <div>待处理请求: {cacheStats.pendingRequests}</div>
          <div>总请求数: {requests}</div>
          <div>缓存命中数: {cacheHits}</div>
          <div>命中率: {requests > 0 ? ((cacheHits / requests) * 100).toFixed(1) : 0}%</div>
        </div>
      )}
    </div>
  );
}
