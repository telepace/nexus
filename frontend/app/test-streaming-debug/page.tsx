"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { JsonlRenderer } from "@/components/ui/JsonlRenderer";
import { StreamingJsonlRenderer } from "@/components/ui/StreamingJsonlRenderer";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";

export default function StreamingDebugPage() {
  const [content, setContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  // 模拟JSONL内容
  const mockJsonlLines = [
    '{"t":"h1","c":"AI初创企业在MVP开发中结合TDD与AI工具的策略指南"}',
    '{"t":"p","c":"本文探讨了AI初创企业在开发最小可行产品（MVP）过程中，如何有效结合测试驱动开发（TDD）与现代AI工具，以提升开发效率、代码质量和产品可靠性。"}',
    '{"t":"h2","c":"核心策略概述"}',
    '{"t":"insight","c":"TDD与AI工具的结合不仅能提升代码质量，还能加速MVP的迭代周期，让初创企业在竞争激烈的市场中快速验证产品假设。"}',
    '{"t":"h3","c":"1. TDD基础框架搭建"}',
    '{"t":"p","c":"在MVP开发初期，建立完善的TDD框架是至关重要的第一步。"}',
    '{"t":"list","c":"选择合适的测试框架（如Jest、Pytest等）\\n配置持续集成（CI）管道\\n建立代码覆盖率标准\\n制定测试编写规范"}',
    '{"t":"concept","c":"测试驱动开发（TDD）是一种软件开发方法，要求在编写功能代码之前先编写测试用例。"}',
    '{"t":"h3","c":"2. AI工具集成策略"}',
    '{"t":"p","c":"现代AI工具可以显著提升TDD实践的效率和质量。"}',
    '{"t":"qa","c":"Q: 如何选择合适的AI编程助手？\\nA: 考虑代码补全准确性、测试生成能力、与现有工具链的兼容性，以及团队的技术栈匹配度。"}',
    '{"t":"action","c":"立即评估当前项目中可以集成的AI工具，制定分阶段实施计划。"}',
  ];

  // 模拟流式传输
  const simulateStreaming = async () => {
    setContent("");
    setIsStreaming(true);

    let accumulated = "";

    for (let i = 0; i < mockJsonlLines.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 500)); // 模拟延迟
      accumulated += mockJsonlLines[i] + "\n";
      setContent(accumulated);
      console.log(`📦 模拟流式块 ${i + 1}:`, mockJsonlLines[i]);
      console.log(`📋 累积内容:`, accumulated);
    }

    setIsStreaming(false);
    console.log("✅ 流式传输完成");
  };

  // JSONL检测函数
  const isJsonlContent = (content: string): boolean => {
    if (!content || !content.trim()) return false;

    const lines = content.trim().split("\n");
    let validJsonlLines = 0;
    let totalNonEmptyLines = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      totalNonEmptyLines++;

      try {
        const parsed = JSON.parse(trimmed);
        if (
          typeof parsed === "object" &&
          parsed !== null &&
          (("type" in parsed && "content" in parsed) ||
            ("t" in parsed && "c" in parsed))
        ) {
          validJsonlLines++;
        }
      } catch {
        // 忽略解析错误
      }
    }

    return (
      totalNonEmptyLines > 0 && validJsonlLines / totalNonEmptyLines >= 0.5
    );
  };

  const clearContent = () => {
    setContent("");
    setIsStreaming(false);
  };

  const setStaticJsonl = () => {
    setContent(mockJsonlLines.join("\n"));
    setIsStreaming(false);
  };

  const setMarkdownContent = () => {
    const markdown = `# AI初创企业在MVP开发中结合TDD与AI工具的策略指南

本文探讨了AI初创企业在开发最小可行产品（MVP）过程中，如何有效结合测试驱动开发（TDD）与现代AI工具。

## 核心策略概述

> TDD与AI工具的结合不仅能提升代码质量，还能加速MVP的迭代周期。

### 1. TDD基础框架搭建

在MVP开发初期，建立完善的TDD框架是至关重要的第一步：

- 选择合适的测试框架（如Jest、Pytest等）
- 配置持续集成（CI）管道
- 建立代码覆盖率标准
- 制定测试编写规范`;

    setContent(markdown);
    setIsStreaming(false);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>流式JSONL渲染调试工具</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Button onClick={simulateStreaming} disabled={isStreaming}>
              {isStreaming ? "流式传输中..." : "模拟流式JSONL"}
            </Button>
            <Button onClick={setStaticJsonl} variant="outline">
              设置静态JSONL
            </Button>
            <Button onClick={setMarkdownContent} variant="outline">
              设置Markdown内容
            </Button>
            <Button onClick={clearContent} variant="outline">
              清空内容
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <strong>内容长度:</strong> {content.length} 字符
            </div>
            <div>
              <strong>行数:</strong>{" "}
              {content.split("\n").filter(Boolean).length}
            </div>
            <div>
              <strong>是否为JSONL:</strong>{" "}
              {isJsonlContent(content) ? "✅ 是" : "❌ 否"}
            </div>
            <div>
              <strong>流式状态:</strong>{" "}
              {isStreaming ? "🔄 进行中" : "⏹️ 已停止"}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 原始内容预览 */}
      <Card>
        <CardHeader>
          <CardTitle>原始内容预览</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded text-sm overflow-auto max-h-40">
            {content || "暂无内容"}
          </pre>
        </CardContent>
      </Card>

      {/* 渲染效果对比 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* StreamingJsonlRenderer */}
        <Card>
          <CardHeader>
            <CardTitle>StreamingJsonlRenderer</CardTitle>
          </CardHeader>
          <CardContent>
            {content ? (
              <StreamingJsonlRenderer
                content={content}
                isLoading={isStreaming}
                showStreamingIndicator={true}
              />
            ) : (
              <div className="text-muted-foreground">暂无内容</div>
            )}
          </CardContent>
        </Card>

        {/* JsonlRenderer */}
        <Card>
          <CardHeader>
            <CardTitle>JsonlRenderer</CardTitle>
          </CardHeader>
          <CardContent>
            {content ? (
              <JsonlRenderer content={content} />
            ) : (
              <div className="text-muted-foreground">暂无内容</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 智能渲染器测试 */}
      <Card>
        <CardHeader>
          <CardTitle>智能渲染器（与AIAnalysisCard相同逻辑）</CardTitle>
        </CardHeader>
        <CardContent>
          {content ? (
            isJsonlContent(content) ? (
              isStreaming ? (
                <StreamingJsonlRenderer content={content} isLoading={true} />
              ) : (
                <JsonlRenderer content={content} />
              )
            ) : (
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <MarkdownRenderer content={content} />
              </div>
            )
          ) : (
            <div className="text-muted-foreground">暂无内容</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
