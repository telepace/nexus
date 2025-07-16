"use client";

import { useState } from "react";
import VirtualScrollRenderer from "@/components/ui/VirtualScrollRenderer";
import EnhancedVirtualScrollRenderer from "@/components/ui/EnhancedVirtualScrollRenderer";

export default function TestScrollPage() {
  const [testContentId, setTestContentId] = useState<string>("");
  const [selectedRenderer, setSelectedRenderer] = useState<
    "original" | "enhanced"
  >("enhanced");
  const [debugMode, setDebugMode] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">优化懒加载体验测试</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Controls */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                输入Content ID进行测试:
              </label>
              <input
                type="text"
                value={testContentId}
                onChange={(e) => setTestContentId(e.target.value)}
                placeholder="输入content ID"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                选择渲染器版本:
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="original"
                    checked={selectedRenderer === "original"}
                    onChange={(e) =>
                      setSelectedRenderer(e.target.value as "original")
                    }
                    className="mr-2"
                  />
                  原版 (200px预加载)
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="enhanced"
                    checked={selectedRenderer === "enhanced"}
                    onChange={(e) =>
                      setSelectedRenderer(e.target.value as "enhanced")
                    }
                    className="mr-2"
                  />
                  增强版 (智能预加载)
                </label>
              </div>
            </div>

            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={debugMode}
                  onChange={(e) => setDebugMode(e.target.checked)}
                  className="mr-2"
                />
                开启调试模式
              </label>
            </div>
          </div>

          {/* Features comparison */}
          <div className="md:col-span-2">
            <h3 className="font-semibold mb-3">优化对比</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <h4 className="font-medium text-red-800 dark:text-red-200 mb-2">
                  原版问题
                </h4>
                <ul className="space-y-1 text-red-600 dark:text-red-300">
                  <li>• 预加载距离固定200px</li>
                  <li>• 显眼的加载指示器</li>
                  <li>• 单一触发机制</li>
                  <li>• 固定内存清理策略</li>
                  <li>• 用户能感知加载过程</li>
                </ul>
              </div>

              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">
                  增强版优化
                </h4>
                <ul className="space-y-1 text-green-600 dark:text-green-300">
                  <li>• 智能预加载距离(300-1200px)</li>
                  <li>• 几乎不可见的加载提示</li>
                  <li>• 滚动速度感知</li>
                  <li>• 网络状况自适应</li>
                  <li>• 丝滑无感体验</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {testContentId && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                {selectedRenderer === "enhanced" ? "🚀 增强版" : "📄 原版"}{" "}
                VirtualScrollRenderer 测试
                {debugMode && (
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    DEBUG
                  </span>
                )}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Content ID: {testContentId}
              </p>
              {selectedRenderer === "enhanced" && (
                <p className="text-xs text-green-600 mt-1">
                  ✨ 启用智能预加载、网络自适应、滚动速度感知
                </p>
              )}
            </div>

            {/* 固定高度的测试容器 */}
            <div className="h-[600px] p-4">
              {selectedRenderer === "enhanced" ? (
                <EnhancedVirtualScrollRenderer
                  contentId={testContentId}
                  className="w-full h-full"
                  chunkSize={15}
                  maxVisibleChunks={100}
                  enableSmartPreloading={true}
                  enableNetworkAdaptation={true}
                  loadingVariant="ghost"
                  debugMode={debugMode}
                />
              ) : (
                <VirtualScrollRenderer
                  contentId={testContentId}
                  className="w-full h-full"
                  chunkSize={15}
                  maxVisibleChunks={50}
                />
              )}
            </div>
          </div>
        )}

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 测试说明 */}
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h3 className="font-semibold mb-2">测试步骤:</h3>
            <ol className="text-sm space-y-1 list-decimal list-inside">
              <li>输入一个有效的content ID</li>
              <li>选择要测试的渲染器版本</li>
              <li>开启调试模式查看实时数据</li>
              <li>尝试不同速度的滚动</li>
              <li>观察加载体验的差异</li>
            </ol>
          </div>

          {/* 性能指标 */}
          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <h3 className="font-semibold mb-2">期望效果:</h3>
            <ul className="text-sm space-y-1">
              <li>
                • <strong>丝滑体验</strong>: 99%情况下不会看到加载状态
              </li>
              <li>
                • <strong>智能预加载</strong>: 根据滚动速度动态调整
              </li>
              <li>
                • <strong>网络自适应</strong>: 根据网络质量优化策略
              </li>
              <li>
                • <strong>流畅滚动</strong>: 保持60fps滚动体验
              </li>
              <li>
                • <strong>内存优化</strong>: 智能DOM管理
              </li>
            </ul>
          </div>
        </div>

        {/* 技术细节 */}
        <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <h3 className="font-semibold mb-3">🛠️ 技术实现亮点</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">滚动速度检测</h4>
              <p className="text-gray-600 dark:text-gray-400">
                实时计算滚动速度，快速滚动时提前3倍距离预加载
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">网络质量感知</h4>
              <p className="text-gray-600 dark:text-gray-400">
                检测网络状况，差网络减少预加载，好网络增强体验
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">静默加载指示器</h4>
              <p className="text-gray-600 dark:text-gray-400">
                几乎不可见的微妙提示，不打断阅读流程
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
