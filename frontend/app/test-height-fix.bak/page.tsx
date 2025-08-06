"use client";

import React, { useState } from "react";

// 防止预渲染
export const dynamic = "force-dynamic";
import { ModernAnalysisInterface } from "@/components/ai/ModernAnalysisInterface";
import { ContentItemPublic } from "@/lib/api/content";
import { AIResult } from "@/lib/api/content";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// 模拟短内容
const shortJsonlContent = `{"type":"p","content":"这是一个简单的段落内容。","ref":"1,2"}
{"type":"h3","content":"简短标题","ref":"3"}
{"type":"p","content":"另一个简短的段落。","ref":"4"}`;

// 模拟中等长度内容
const mediumJsonlContent = `{"type":"h2","content":"中等长度内容测试","ref":"1"}
{"type":"p","content":"这是一段相对较长的文本内容，用于测试动态高度适配功能。我们需要确保不同长度的内容都能正确显示，不会被截断或产生滚动条问题。","ref":"2,3"}
{"type":"h3","content":"子标题示例","ref":"4"}
{"type":"p","content":"这里是子标题下的内容，继续测试高度适配功能。内容应该能够完整显示，不受固定高度限制的影响。","ref":"5,6"}
{"type":"list","content":"要点一：动态高度测试","ref":"7"}
{"type":"list","content":"要点二：内容适配验证","ref":"8"}
{"type":"list","content":"要点三：用户体验优化","ref":"9"}
{"type":"p","content":"总结：通过 ResizeObserver 实现真正的动态高度适配。","ref":"10"}`;

// 模拟长内容
const longJsonlContent = `{"type":"h1","content":"长内容高度适配测试","ref":"1"}
{"type":"p","content":"这是一个超长内容的测试案例，专门用于验证我们的动态高度解决方案。在修复之前，这样的长内容会被 max-h-[1000px] 限制截断，导致用户无法看到完整内容。","ref":"2,3,4"}
{"type":"h2","content":"问题背景","ref":"5"}
{"type":"p","content":"JsonlRenderer 在渲染不同主题时会产生很大的高度差异。notebook 主题相对简洁，而 neumorphism 和 headspace 主题则需要更多的视觉空间。固定的 1000px 高度限制无法适应所有场景。","ref":"6,7,8"}
{"type":"h3","content":"解决方案详细说明","ref":"9"}
{"type":"p","content":"我们采用了 ResizeObserver API 来动态监听内容的实际高度变化。当内容渲染完成或主题切换时，Observer 会自动检测新的高度并更新容器的 max-height 样式。","ref":"10,11,12"}
{"type":"h3","content":"技术实现要点","ref":"13"}
{"type":"list","content":"创建 useCardHeight hook 管理高度状态","ref":"14"}
{"type":"list","content":"使用 ResizeObserver 监听内容变化","ref":"15"}
{"type":"list","content":"支持多卡片独立高度管理","ref":"16"}
{"type":"list","content":"保持原有的折叠/展开动画效果","ref":"17"}
{"type":"list","content":"提供默认高度回退机制","ref":"18"}
{"type":"h2","content":"预期效果","ref":"19"}
{"type":"p","content":"修复后的系统应该能够：1）自动适配所有 JsonlRenderer 主题的高度需求；2）保持 Preview 容器的固定高度不变；3）每个分析卡片根据实际内容动态调整高度；4）保留现有的用户交互体验，包括折叠展开动画。","ref":"20,21,22,23"}
{"type":"h3","content":"测试验证","ref":"24"}
{"type":"p","content":"这个测试页面包含了短、中、长三种不同长度的内容，用于验证动态高度功能的有效性。用户应该能够看到所有内容都完整显示，没有被截断的情况。","ref":"25,26,27"}
{"type":"h2","content":"进一步优化方向","ref":"28"}
{"type":"p","content":"未来还可以考虑添加：渐进式加载长内容、虚拟滚动优化、智能高度预测等功能，进一步提升用户体验。","ref":"29,30"}`;

// 创建不同长度的模拟数据
const createMockContent = (
  jsonlContent: string,
  title: string,
): ContentItemPublic => ({
  id: Math.random().toString(),
  title,
  summary: "动态高度测试内容",
  content_text: jsonlContent,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  user_id: "user-id",
  type: "article",
  source_uri: "https://example.com/test",
  processing_status: "completed",
});

const createMockAnalysisResult = (jsonlContent: string): AIResult => ({
  summary: { content: jsonlContent },
  key_points: { points: [] },
  labels: ["测试", "动态高度"],
  reading_time_minutes: 5,
  difficulty_level: "beginner",
  content_quality_score: 8.0,
});

export default function TestHeightFixPage() {
  const [currentTest, setCurrentTest] = useState<"short" | "medium" | "long">(
    "short",
  );

  const testCases = {
    short: {
      content: createMockContent(shortJsonlContent, "短内容测试"),
      analysis: createMockAnalysisResult(shortJsonlContent),
      description: "简单的短内容，应该能够正常显示在较小的高度内",
    },
    medium: {
      content: createMockContent(mediumJsonlContent, "中等内容测试"),
      analysis: createMockAnalysisResult(mediumJsonlContent),
      description: "中等长度内容，测试动态高度适配的基本功能",
    },
    long: {
      content: createMockContent(longJsonlContent, "长内容测试"),
      analysis: createMockAnalysisResult(longJsonlContent),
      description: "超长内容，这是修复前会被截断的典型场景",
    },
  };

  const currentTestCase = testCases[currentTest];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="container mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            动态高度修复测试
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            测试 JsonlRenderer 动态高度适配功能，解决固定 max-h-[1000px]
            导致的内容截断问题
          </p>

          <div className="flex gap-4 mb-6">
            <Button
              variant={currentTest === "short" ? "default" : "outline"}
              onClick={() => setCurrentTest("short")}
            >
              短内容测试
            </Button>
            <Button
              variant={currentTest === "medium" ? "default" : "outline"}
              onClick={() => setCurrentTest("medium")}
            >
              中等内容测试
            </Button>
            <Button
              variant={currentTest === "long" ? "default" : "outline"}
              onClick={() => setCurrentTest("long")}
            >
              长内容测试
            </Button>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>当前测试: {currentTestCase.content.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-400">
                {currentTestCase.description}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 左侧：Preview 模式测试 */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Preview 模式（固定高度容器）
            </h2>
            <div className="bg-white dark:bg-gray-950 rounded-xl shadow-lg h-96 overflow-hidden">
              <ModernAnalysisInterface
                content={currentTestCase.content}
                analysisResult={currentTestCase.analysis}
                isLoading={false}
                variant="preview"
                height="fixed"
                className="h-full"
              />
            </div>
            <p className="text-sm text-gray-500">
              👆 固定高度容器，内容应该可以完整滚动查看
            </p>
          </div>

          {/* 右侧：Fullscreen 模式测试 */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Fullscreen 模式（自适应高度）
            </h2>
            <div className="bg-white dark:bg-gray-950 rounded-xl shadow-lg">
              <div className="h-96">
                <ModernAnalysisInterface
                  content={currentTestCase.content}
                  analysisResult={currentTestCase.analysis}
                  isLoading={false}
                  variant="fullscreen"
                  height="full"
                  className="h-full"
                />
              </div>
            </div>
            <p className="text-sm text-gray-500">
              👆 自适应高度，卡片内容应该根据实际需要动态调整
            </p>
          </div>
        </div>

        <div className="mt-8 bg-white dark:bg-gray-950 rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            修复说明
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                🔧 修复前问题
              </h3>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• 卡片内容被固定的 max-h-[1000px] 限制</li>
                <li>• 长内容会被截断，无法完整显示</li>
                <li>• 不同 JsonlRenderer 主题高度差异大</li>
                <li>• 用户体验不流畅</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                ✅ 修复后效果
              </h3>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• 使用 ResizeObserver 动态监听高度</li>
                <li>• 卡片高度由实际内容撑开</li>
                <li>• 保持折叠/展开动画效果</li>
                <li>• 支持所有 JsonlRenderer 主题</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
