"use client";

import React from "react";
import { JsonlRenderer } from "@/components/ui/JsonlRenderer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, Sparkles, BookOpen, Lightbulb } from "lucide-react";

const testJsonlContent = `{"type": "h1", "content": "AI分析结果示例", "mapping": "h1-1"}
{"type": "h2", "content": "核心观点", "mapping": "h2-1"}
{"type": "p", "content": "这是一段普通的段落文本，用来测试文本选择功能。您可以尝试选中这段文字，应该能够正常选择和复制。", "mapping": "p1"}
{"type": "insight", "content": "这是一个重要的洞察，应该以特殊样式显示，并且支持悬停效果。", "priority": "high", "mapping": "insight1"}
{"type": "list", "content": ["第一个要点，包含重要信息", "第二个要点，支持文本选择", "第三个要点，具有悬停效果"], "mapping": "list1"}
{"type": "concept", "content": "这是一个关键概念的定义，用紫色边框突出显示。", "mapping": "concept1"}
{"type": "qa", "content": {"q": "如何测试悬停效果？", "a": "将鼠标悬停在各个内容块上，观察背景变化和复制按钮的出现。"}, "mapping": "qa1"}
{"type": "action", "content": "建议用户尝试选择文本并使用悬停时出现的复制功能。", "mapping": "action1"}
{"type": "quote", "content": "优秀的用户体验来自于细节的精心打磨。", "mapping": "quote1"}`;

const comparisonJsonl = `{"type": "h2", "content": "传统渲染 vs 增强渲染", "mapping": "comp1"}
{"type": "p", "content": "对比传统的JSONL渲染（无悬停效果）和新的增强渲染（带Notion风格悬停）。", "mapping": "comp2"}
{"type": "insight", "content": "增强版本提供了更好的交互体验和可访问性。", "mapping": "comp3"}`;

export default function TestEnhancedCardsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* 页面标题 */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center justify-center gap-3">
            <Sparkles className="h-8 w-8 text-blue-600" />
            增强的JSONL渲染测试
          </h1>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            测试新的Notion风格悬停效果、文本选择功能和复制功能。将鼠标悬停在内容块上查看效果。
          </p>
        </div>

        {/* 功能对比 */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* 传统渲染 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                传统渲染（基础版）
              </CardTitle>
            </CardHeader>
            <CardContent>
              <JsonlRenderer
                content={comparisonJsonl}
                enableHoverEffects={false}
              />
            </CardContent>
          </Card>

          {/* 增强渲染 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-blue-600" />
                增强渲染（Notion风格）
              </CardTitle>
            </CardHeader>
            <CardContent>
              <JsonlRenderer
                content={comparisonJsonl}
                enableHoverEffects={true}
              />
            </CardContent>
          </Card>
        </div>

        {/* 完整示例 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-600" />
              完整功能演示
              <span className="text-sm font-normal text-gray-500 ml-2">
                (支持文本选择、悬停效果、一键复制)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <JsonlRenderer content={testJsonlContent} />
          </CardContent>
        </Card>

        {/* 使用说明 */}
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
              <Lightbulb className="h-5 w-5" />
              使用说明
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-blue-700 dark:text-blue-300">
            <div className="space-y-2">
              <p>
                <strong>文本选择：</strong>{" "}
                现在可以正常选择和复制任何内容块中的文字
              </p>
              <p>
                <strong>悬停效果：</strong>{" "}
                鼠标悬停在内容块上时会显示淡色背景和边框
              </p>
              <p>
                <strong>复制功能：</strong>{" "}
                悬停时右上角会出现复制按钮，点击即可复制整个块的内容
              </p>
              <p>
                <strong>块类型识别：</strong>{" "}
                复制时会显示对应的块类型（如"已复制段落内容"）
              </p>
              <p>
                <strong>暗色模式：</strong> 完整支持深色主题下的悬停效果
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 测试区域 */}
        <Card>
          <CardHeader>
            <CardTitle>测试区域 - 尝试不同的交互</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                以下是一些测试建议：
              </p>
              <ul className="text-sm space-y-1 text-gray-700 dark:text-gray-300 list-disc ml-5">
                <li>尝试选择不同类型块中的文字（标题、段落、列表等）</li>
                <li>测试悬停时的视觉反馈是否符合预期</li>
                <li>使用复制按钮复制内容到剪贴板</li>
                <li>在深色和浅色模式之间切换测试效果</li>
                <li>测试不同长度内容的悬停区域</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
