"use client";

import React from "react";
import { JsonlRenderer } from "@/components/ui/JsonlRenderer";
import { ReferenceManagerProvider } from "@/components/ui/ReferenceManager";

const testContent = `{"t": "h2", "c": "引用显示测试", "ref": "1,2,3"}
{"t": "p", "c": "这段内容包含了多个引用，测试引用圆圈是否正确显示在内容右侧，而不是悬浮时才出现。现在的引用卡片支持拖动和内容滚动功能！", "ref": "4,5"}
{"t": "insight", "c": "📊 重要洞察：引用应该始终可见，现在点击后可以优雅地拖动卡片位置，长内容支持滚动查看。", "ref": "6"}
{"t": "p", "c": "没有引用的段落应该正常显示，不显示引用圆圈。"}
{"t": "concept", "c": "💡 核心概念：用户体验的改进在于明确的视觉层次和交互反馈。新的拖动功能让用户可以自由调整卡片位置，避免遮挡重要内容。", "ref": "7,8,9,10"}
{"t": "p", "c": "这是一段很长的内容，用来测试引用卡片的滚动功能。内容可能会很长，包含多个段落和丰富的文本信息。用户可以在卡片内滚动查看完整内容，同时卡片本身也支持拖动到合适的位置。这样的设计既保证了内容的完整性，又提供了灵活的交互体验。", "ref": "11,12"}`;

export default function TestReferenceFix() {
  return (
    <ReferenceManagerProvider contentId="test-content-123">
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">引用显示修复测试</h1>
          <p className="text-muted-foreground">
            测试引用圆圈是否正确显示在内容右侧，并且只有悬浮在圆圈上时才显示悬浮卡片。
          </p>
        </div>

        <div className="space-y-6">
          <div className="border rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-3">修复后的引用显示</h2>
            <p className="text-sm text-muted-foreground mb-4">
              引用圆圈应该始终显示在内容右侧，悬浮在圆圈上时显示详细信息。
            </p>

            <JsonlRenderer
              content={testContent}
              enableHoverEffects={true}
              showReferenceIndicators={true}
              enableEnhancedTooltip={true}
              contentId="test-content-123"
              styleName="notebook"
            />
          </div>

          <div className="bg-muted/50 rounded-lg p-4">
            <h3 className="font-medium mb-2">🎯 全新引用交互设计</h3>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>
                ✅ <strong>创建ModernReferenceIndicator组件</strong>
              </li>
              <li>
                ✅ <strong>移除所有自动悬浮行为</strong>
              </li>
              <li>
                ✅ <strong>实现点击触发的精美模态框</strong>
              </li>
              <li>
                ✅ <strong>优雅的渐变色引用圆圈设计</strong>
              </li>
              <li>
                ✅ <strong>禁用MarkdownRenderer的内联引用处理</strong>
              </li>
              <li>
                ✅ <strong>统一的引用管理和交互逻辑</strong>
              </li>
              <li>
                ✅{" "}
                <strong>修复Markdown渲染：在模态框中正确显示格式化内容</strong>
              </li>
              <li>
                ✨ <strong>减法美学重构：极简纯净的引用卡片设计</strong>
              </li>
              <li>
                🎨 <strong>优雅动画：微妙自然的过渡效果</strong>
              </li>
              <li>
                🖱️ <strong>拖动交互：支持卡片拖动和位置调整</strong>
              </li>
              <li>
                📜 <strong>内容滚动：长内容支持优雅的滚动查看</strong>
              </li>
            </ul>

            <h3 className="font-medium mb-2 mt-4">🔍 问题根源分析</h3>
            <div className="text-xs bg-red-50 dark:bg-red-900/20 p-3 rounded border border-red-200 dark:border-red-800">
              <p className="font-medium text-red-800 dark:text-red-200 mb-1">
                发现的悬浮触发链条：
              </p>
              <p className="text-red-700 dark:text-red-300">
                JsonlRenderer → MarkdownRenderer → processInlineReferences →
                InlineReference → ElegantReferenceTooltip
              </p>
              <p className="text-red-600 dark:text-red-400 mt-1 text-xs">
                MarkdownRenderer内部自动处理引用模式 [1], [2] 等，创建悬浮卡片
              </p>
            </div>

            <h3 className="font-medium mb-2 mt-4">🧪 测试验证步骤</h3>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded border border-yellow-200 dark:border-yellow-800 mb-4">
              <p className="font-medium text-yellow-800 dark:text-yellow-200 text-sm mb-2">
                🧪 请按以下步骤测试：
              </p>
              <ol className="text-xs text-yellow-700 dark:text-yellow-300 space-y-1 list-decimal list-inside">
                <li>
                  <strong>悬浮测试</strong>
                  ：将鼠标悬浮在内容块上，应该不会显示任何引用弹窗
                </li>
                <li>
                  <strong>圆圈悬浮</strong>
                  ：悬浮在引用圆圈上，应该只有视觉效果，无弹窗
                </li>
                <li>
                  <strong>点击测试</strong>：点击引用圆圈，应该显示模态框
                </li>
                <li>
                  <strong>拖动测试</strong>
                  ：点击并拖动卡片标题栏，卡片应该可以移动位置
                </li>
                <li>
                  <strong>滚动测试</strong>
                  ：在卡片内容区域滚动鼠标，应该可以查看完整内容
                </li>
                <li>
                  <strong>markdown渲染</strong>
                  ：模态框中的内容应该是格式化的markdown，不是原始文本
                </li>
              </ol>
            </div>

            <h3 className="font-medium mb-2 mt-4">✨ 减法美学设计哲学</h3>
            <div className="space-y-3">
              <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded border border-green-200 dark:border-green-800">
                <p className="font-medium text-green-800 dark:text-green-200 text-sm mb-2">
                  🎨 极简设计原则：
                </p>
                <ul className="text-xs text-green-700 dark:text-green-300 space-y-1">
                  <li>
                    • <strong>去除冗余</strong>
                    ：移除"段落引用"、"点击查看原文位置"等说明文字
                  </li>
                  <li>
                    • <strong>尺寸优化</strong>
                    ：引用圆圈从5x5缩小到4x4，更加精致
                  </li>
                  <li>
                    • <strong>色彩纯化</strong>
                    ：去除过度的渐变，使用更加克制的颜色
                  </li>
                  <li>
                    • <strong>动画精简</strong>
                    ：微妙的缩放和透明度变化，避免过度动效
                  </li>
                  <li>
                    • <strong>视觉统一</strong>
                    ：更小的模态框尺寸，更轻的阴影效果
                  </li>
                  <li>
                    • <strong>交互增强</strong>：支持拖动调整位置，内容滚动查看
                  </li>
                  <li>
                    • <strong>布局优化</strong>：弹性布局确保内容完整显示
                  </li>
                </ul>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded border border-blue-200 dark:border-blue-800">
                <p className="font-medium text-blue-800 dark:text-blue-200 text-sm mb-2">
                  🎯 体验改进：
                </p>
                <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                  <li>
                    • <strong>无干扰阅读</strong>：随意悬浮不会意外弹出信息
                  </li>
                  <li>
                    • <strong>主动触发</strong>：只有用户明确点击才显示详情
                  </li>
                  <li>
                    • <strong>视觉优雅</strong>：现代化的设计语言和动画效果
                  </li>
                  <li>
                    • <strong>操作便捷</strong>：一键跳转到原文位置
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ReferenceManagerProvider>
  );
}
