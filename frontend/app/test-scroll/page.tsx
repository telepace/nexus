"use client";

import { useState } from 'react';
import VirtualScrollRenderer from '@/components/ui/VirtualScrollRenderer';

export default function TestScrollPage() {
  const [testContentId, setTestContentId] = useState<string>('');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">滚动测试页面</h1>
        
        <div className="mb-4">
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

        {testContentId && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">VirtualScrollRenderer 测试</h2>
              <p className="text-sm text-gray-600">Content ID: {testContentId}</p>
            </div>
            
            {/* 固定高度的测试容器 */}
            <div className="h-[600px] p-4">
              <VirtualScrollRenderer 
                contentId={testContentId}
                className="w-full h-full"
                chunkSize={10}
                maxVisibleChunks={30}
              />
            </div>
          </div>
        )}

        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <h3 className="font-semibold mb-2">测试说明:</h3>
          <ul className="text-sm space-y-1">
            <li>• 输入一个有效的content ID</li>
            <li>• 检查滚动容器是否有边框显示</li>
            <li>• 尝试在容器内滚动</li>
            <li>• 打开浏览器控制台查看滚动事件日志</li>
            <li>• 观察调试信息显示的加载状态</li>
          </ul>
        </div>
      </div>
    </div>
  );
} 