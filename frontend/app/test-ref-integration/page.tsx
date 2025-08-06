"use client";

import React from "react";
import { ReferenceManagerProvider } from "@/components/ui/ReferenceManager";
import { UnifiedJsonlRenderer } from "@/components/ui/UnifiedJsonlRenderer";

const sampleJsonlWithRefs = `
{"type": "h1", "content": "测试ref悬浮功能"}
{"type": "p", "content": "这是第一段内容，包含了重要的信息。"}
{"type": "p", "content": "这是第二段内容，继续深入讨论相关主题，引用了多个研究来源。", "ref": "1,2"}
{"type": "p", "content": "第三段提供了实际案例分析。", "ref": "3"}
{"type": "action", "content": "根据前面的分析，我们可以得出以下结论和建议。", "ref": "1,2,3"}
{"type": "insight", "content": "关键洞察：这些发现对未来研究具有重要意义。", "ref": "2,3"}
`;

export default function TestRefIntegration() {
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Ref集成测试页面</h1>

      <div className="space-y-8">
        {/* 测试说明 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-2">测试指引</h2>
          <ul className="space-y-1 text-sm">
            <li>• 将鼠标悬停在引用编号上，应该显示增强的tooltip</li>
            <li>• 点击引用编号，应该跳转到对应的段落并高亮显示</li>
            <li>• 高亮效果会在4秒后自动清除</li>
            <li>• tooltip会显示缓存数据或模拟数据</li>
          </ul>
        </div>

        {/* JSONL内容渲染测试 */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">JSONL渲染测试</h2>
          <div className="border rounded-lg p-4 bg-white">
            <ReferenceManagerProvider contentId="test-jsonl-content">
              <UnifiedJsonlRenderer
                content={sampleJsonlWithRefs}
                contentId="test-jsonl-content"
                enableHoverEffects={true}
                showReferenceIndicators={true}
                styleName="notebook"
              />
            </ReferenceManagerProvider>
          </div>
        </div>

        {/* 功能状态 */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-semibold text-green-800 mb-2">✅ 已修复的功能</h3>
          <ul className="text-sm text-green-700 space-y-1">
            <li>• ✅ Preview页面卡片闪烁问题已修复</li>
            <li>• ✅ ref悬浮tooltip功能已修复</li>
            <li>• ✅ contentId参数已正确传递</li>
            <li>• ✅ ReferenceManagerProvider已正确包装</li>
            <li>• ✅ 所有渲染器组件已更新支持增强tooltip</li>
          </ul>
        </div>

        {/* 架构说明 */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold mb-2">🏗️ 修复架构说明</h3>
          <div className="text-sm space-y-2">
            <p>
              <strong>数据流：</strong> ReferenceManagerProvider →
              UnifiedJsonlRenderer → 样式渲染器 → MarkdownRenderer
            </p>
            <p>
              <strong>参数传递：</strong> contentId → enableEnhancedTooltip →
              OptimizedReferenceTooltip
            </p>
            <p>
              <strong>包装层级：</strong> ContentPreview →
              ReferenceManagerProvider → EnhancedModernAnalysisInterface
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
