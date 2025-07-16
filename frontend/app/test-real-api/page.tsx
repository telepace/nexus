"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { JsonlRenderer } from "@/components/ui/JsonlRenderer";
import { StreamingJsonlRenderer } from "@/components/ui/StreamingJsonlRenderer";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";

export default function TestRealApiPage() {
  const [content, setContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  // 真实的API响应数据 (用户提供的)
  const realApiResponse = `0:{"t":"h1","c":"2025年个人日记：跨领域思考与生活洞察"}
0:{"t":"h2","c":"核心主题分析"}
0:{"t":"insight","c":"文档是2025年间的个人思考记录，涵盖AI技术、文化观察、人生哲学、旅行体验等多领域深度反思","priority":"high"}
0:{"t":"concept","c":"元认知","expandable":"持续观察自身思考过程的方法论，如情绪分析、决策反思等"}
0:{"t":"concept","c":"心流状态","expandable":"在徒步、创作等活动中体验的沉浸感，对比AI时代注意力碎片化问题"}
0:{"t":"h2","c":"关键技术洞察"}
8:[{"finishReason":"stop"}]`;

  // 模拟前端解析过程
  const simulateApiParsing = () => {
    setContent("");
    setIsStreaming(true);

    let accumulatedContent = "";
    const lines = realApiResponse.split("\n");

    console.log("🔄 开始模拟API解析...");
    console.log("📦 原始API响应:", realApiResponse);

    let index = 0;

    const processNextLine = () => {
      if (index >= lines.length) {
        setIsStreaming(false);
        console.log("✅ 模拟解析完成");
        console.log("🎯 最终累积内容:", accumulatedContent);
        return;
      }

      const line = lines[index].trim();
      console.log(`🔍 处理第${index + 1}行:`, line);

      if (line.startsWith("0:")) {
        // 业务文本行，移除前缀并保持原始内容
        const rawContent = line.slice(2); // 移除 "0:" 前缀
        console.log("📝 提取的原始内容:", rawContent);

        // 直接累加原始内容
        if (rawContent) {
          accumulatedContent += rawContent + "\n";
          console.log("📋 累积内容:", accumulatedContent);
          setContent(accumulatedContent);
        }
      } else if (line.startsWith("8:")) {
        console.log("🏁 收到完成信号");
        setIsStreaming(false);
        return;
      }

      index++;
      setTimeout(processNextLine, 300); // 模拟延迟
    };

    processNextLine();
  };

  // JSONL检测函数 (与AIAnalysisCard中完全相同)
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

  // 智能内容渲染器 (与AIAnalysisCard中完全相同)
  const renderContent = (content: string, streaming: boolean = false) => {
    if (!content) return null;

    console.log("🎨 渲染内容:", {
      content: content.substring(0, 100),
      streaming,
      isJsonl: isJsonlContent(content),
      contentLength: content.length,
      lineCount: content.split("\n").filter(Boolean).length,
    });

    if (isJsonlContent(content)) {
      if (streaming) {
        return (
          <StreamingJsonlRenderer content={content} isLoading={streaming} />
        );
      } else {
        return <JsonlRenderer content={content} />;
      }
    } else {
      return (
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <MarkdownRenderer content={content} />
        </div>
      );
    }
  };

  const clearContent = () => {
    setContent("");
    setIsStreaming(false);
  };

  const setDirectJsonl = () => {
    const directJsonl = `{"t":"h1","c":"2025年个人日记：跨领域思考与生活洞察"}
{"t":"h2","c":"核心主题分析"}
{"t":"insight","c":"文档是2025年间的个人思考记录，涵盖AI技术、文化观察、人生哲学、旅行体验等多领域深度反思","priority":"high"}
{"t":"concept","c":"元认知","expandable":"持续观察自身思考过程的方法论，如情绪分析、决策反思等"}
{"t":"concept","c":"心流状态","expandable":"在徒步、创作等活动中体验的沉浸感，对比AI时代注意力碎片化问题"}
{"t":"h2","c":"关键技术洞察"}`;

    setContent(directJsonl);
    setIsStreaming(false);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>真实API响应测试</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Button onClick={simulateApiParsing} disabled={isStreaming}>
              {isStreaming ? "解析中..." : "模拟API解析"}
            </Button>
            <Button onClick={setDirectJsonl} variant="outline">
              设置直接JSONL
            </Button>
            <Button onClick={clearContent} variant="outline">
              清空内容
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
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
            <div>
              <strong>渲染器:</strong>{" "}
              {content
                ? isJsonlContent(content)
                  ? "JsonlRenderer"
                  : "MarkdownRenderer"
                : "无"}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 原始API响应预览 */}
      <Card>
        <CardHeader>
          <CardTitle>原始API响应</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded text-sm overflow-auto max-h-40">
            {realApiResponse}
          </pre>
        </CardContent>
      </Card>

      {/* 解析后的内容预览 */}
      <Card>
        <CardHeader>
          <CardTitle>解析后的内容</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded text-sm overflow-auto max-h-40">
            {content || "暂无内容"}
          </pre>
        </CardContent>
      </Card>

      {/* 渲染效果 */}
      <Card>
        <CardHeader>
          <CardTitle>渲染效果 (与AIAnalysisCard相同逻辑)</CardTitle>
        </CardHeader>
        <CardContent>
          {content ? (
            renderContent(content, isStreaming)
          ) : (
            <div className="text-muted-foreground">暂无内容</div>
          )}
        </CardContent>
      </Card>

      {/* 调试信息 */}
      <Card>
        <CardHeader>
          <CardTitle>调试信息</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div>
              <strong>检测结果:</strong>{" "}
              {content
                ? isJsonlContent(content)
                  ? "JSONL格式"
                  : "非JSONL格式"
                : "无内容"}
            </div>
            {content && (
              <>
                <div>
                  <strong>第一行:</strong> {content.split("\n")[0] || "空"}
                </div>
                <div>
                  <strong>总行数:</strong>{" "}
                  {content.split("\n").filter(Boolean).length}
                </div>
                <div>
                  <strong>有效JSON行数:</strong>{" "}
                  {
                    content.split("\n").filter((line) => {
                      const trimmed = line.trim();
                      if (!trimmed) return false;
                      try {
                        const parsed = JSON.parse(trimmed);
                        return (
                          typeof parsed === "object" &&
                          parsed !== null &&
                          (("type" in parsed && "content" in parsed) ||
                            ("t" in parsed && "c" in parsed))
                        );
                      } catch {
                        return false;
                      }
                    }).length
                  }
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
